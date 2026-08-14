import { humanizeLlmError } from '../../lib/llmErrorMessages'
import { executarLunaCorePipeline } from '../../lib/lunaCoreClient'
import type { LunaCorePipelineOptions } from '../../types/lunaCorePipeline'
import type { LunaCoreResultado } from '../../types/lunaCoreResult'
import type { LunaPipelineTrace } from '../../types/lunaPipelineTrace'
import type { Conversation, Message } from '../../types/chat'
import { deriveTitle, nextId } from '../chat/state/conversationPersistence'
import type { LunaCoreBillingSnapshot } from '../billing/useLunaCoreBilling'
import { mapPipelineToBreakdownKey } from '../billing/mapPipelineBreakdown'
import { recordCloudTurn } from '../billing/recordCloudTurn'
import { shouldCountCloudTurn } from '../billing/lunaCloudTurnPolicy'
import {
  patchAssistantMessage as patchAssistantMsg,
  upsertReasoningSegment,
} from './lib/messagePatch'

export function buildLunaPipelineTrace(
  resultado: LunaCoreResultado,
): LunaPipelineTrace {
  const analise = resultado.analise?.analise
  const politica = resultado.pipeline?.politica
  const memoria = resultado.memoria?.decisao
  return {
    intencao: analise?.intencao,
    complexidade: analise?.complexidade,
    nivelRisco: analise?.nivel_risco,
    politicaAcao: politica?.acao,
    politicaTom: politica?.tom,
    politicaModo: politica?.modo,
    memoriaAcao: memoria?.acao,
    memoriaTipo: memoria?.tipo,
    memoriaMotivo: memoria?.motivo,
  }
}

export function patchAssistantMessage(
  updateConversation: (
    conversationId: string,
    updater: (c: Conversation) => Conversation | null | undefined,
  ) => void,
  convId: string,
  assistantMsgId: string,
  patch: Partial<Message>,
) {
  updateConversation(convId, (c) => ({
    ...c,
    messages: c.messages.map((m) =>
      m.id === assistantMsgId ? { ...m, ...patch } : m,
    ),
    updatedAt: Date.now(),
  }))
}

export type LunaCoreTurnDeps = {
  activeId: string
  conversations: Conversation[]
  updateConversation: (
    conversationId: string,
    updater: (c: Conversation) => Conversation | null | undefined,
  ) => void
  resolvePipelineOptions?: (
    userText: string,
    conv: Conversation | undefined,
  ) => Promise<LunaCorePipelineOptions | undefined>
  turnStatusHint?: string
  reasoningEnabled?: boolean
  billing?: LunaCoreBillingSnapshot
}

type LunaCoreBridge = {
  onChatStatusHint?: (cb: (hint: string) => void) => () => void
  onChatPipelineTrace?: (
    cb: (trace: LunaPipelineTrace) => void,
  ) => () => void
  onChatReasoningRodada?: (
    cb: (p: { rodada: number; texto: string; emProgresso: boolean }) => void,
  ) => () => void
}

function readLunaCoreBridge(): LunaCoreBridge | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { lunaCore?: LunaCoreBridge }).lunaCore
}

function registerChatPipelineListeners(
  deps: LunaCoreTurnDeps,
  convId: string,
  assistantMsgId: string,
  reasoningOn: boolean,
): () => void {
  const bridge = readLunaCoreBridge()
  if (!bridge) return () => {}

  const cleanups: Array<() => void> = []

  if (typeof bridge.onChatStatusHint === 'function') {
    cleanups.push(
      bridge.onChatStatusHint((hint) => {
        patchAssistantMessage(deps.updateConversation, convId, assistantMsgId, {
          turnStatusHint: hint,
        })
      }),
    )
  }

  if (typeof bridge.onChatPipelineTrace === 'function') {
    cleanups.push(
      bridge.onChatPipelineTrace((trace) => {
        patchAssistantMsg(
          convId,
          assistantMsgId,
          deps.updateConversation,
          (m) => ({
            ...m,
            lunaPipelineTrace: trace,
            orchestratorRound: 1,
            reasoningInProgress: true,
            reasoningSegments: upsertReasoningSegment(m.reasoningSegments, {
              round: 1,
              text: '',
              inProgress: true,
            }),
          }),
        )
      }),
    )
  }

  if (reasoningOn && typeof bridge.onChatReasoningRodada === 'function') {
    cleanups.push(
      bridge.onChatReasoningRodada(({ rodada, texto, emProgresso }) => {
        const raw = texto.trim()
        patchAssistantMsg(
          convId,
          assistantMsgId,
          deps.updateConversation,
          (m) => ({
            ...m,
            orchestratorRound: rodada,
            reasoningInProgress: emProgresso || Boolean(m.reasoningInProgress),
            reasoningStreamingActive: emProgresso,
            turnStatusHint: emProgresso ? 'A pensar…' : m.turnStatusHint,
            reasoningSegments: upsertReasoningSegment(m.reasoningSegments, {
              round: rodada,
              text: raw,
              inProgress: emProgresso,
            }),
            ...(raw && rodada >= 2
              ? {
                  reasoningTrace: {
                    text: raw,
                    provider: 'luna-core',
                  },
                }
              : {}),
          }),
        )
      }),
    )
  }

  return () => {
    for (const fn of cleanups) fn()
  }
}

function buildBillingPipelineOptions(
  billing: LunaCoreBillingSnapshot | undefined,
): Pick<LunaCorePipelineOptions, 'billing' | 'byokUid' | 'byokMeta'> | undefined {
  if (!billing) return undefined
  return {
    billing: {
      planId: billing.planId,
      usedTurns: billing.usedTurns,
      turnQuota: billing.turnQuota,
    },
    byokUid: billing.byokUid,
    byokMeta: billing.byokMeta,
  }
}

async function maybeRecordCloudTurn(
  billing: LunaCoreBillingSnapshot | undefined,
  resultado: LunaCoreResultado,
) {
  if (!billing?.uid) return

  const isCoreLocal = resultado.billingMeta?.isCoreLocal ?? billing.isCoreLocal
  const quotaFallbackLocal = resultado.billingMeta?.quotaFallbackLocal ?? false

  if (
    !shouldCountCloudTurn({
      planId: billing.planId,
      isCoreLocal,
      quotaFallbackLocal,
    })
  ) {
    return
  }

  if (resultado.billingMeta?.usedCloud === false) return

  try {
    await recordCloudTurn(
      billing.uid,
      mapPipelineToBreakdownKey(resultado),
    )
  } catch (err) {
    console.warn('[lunaCore] falha ao registar turno cloud:', err)
  }
}

function billingNotice(resultado: LunaCoreResultado): string | undefined {
  if (resultado.billingMeta?.byokMissing) {
    return (
      '_Plano BYOK sem provedor configurado — este turno usou o modelo local. ' +
      'Conecte uma chave em Conta Lunar → Uso._\n\n'
    )
  }
  if (!resultado.billingMeta?.quotaFallbackLocal) return undefined
  return (
    '_Cota cloud esgotada — este turno usou o modelo local. ' +
    'O produto continua a funcionar._\n\n'
  )
}

export async function runLunaCoreTurn({
  deps,
  userText,
  abortSignal,
  convId,
  assistantMsgId,
}: {
  deps: LunaCoreTurnDeps
  userText: string
  abortSignal: AbortSignal
  convId: string
  assistantMsgId: string
}) {
  const conv = deps.conversations.find((c) => c.id === convId)
  const sessaoId = conv?.lunaSessaoId ?? convId
  const resolved = (await deps.resolvePipelineOptions?.(userText, conv)) ?? {}
  const reasoningOn = deps.reasoningEnabled !== false
  const opcoes: LunaCorePipelineOptions = {
    ...resolved,
    ...buildBillingPipelineOptions(deps.billing),
    reasoningEnabled: reasoningOn,
  }

  patchAssistantMessage(deps.updateConversation, convId, assistantMsgId, {
    turnStatusHint: deps.turnStatusHint ?? 'Analisando e consultando memória...',
    ...(reasoningOn
      ? {
          reasoningInProgress: true,
          orchestratorRound: 1,
          reasoningSegments: [{ round: 1, text: '', inProgress: true }],
        }
      : {}),
  })

  if (abortSignal.aborted) throw new DOMException('Aborted', 'AbortError')

  const removeListeners = registerChatPipelineListeners(
    deps,
    convId,
    assistantMsgId,
    reasoningOn,
  )

  let resultado: LunaCoreResultado
  try {
    resultado = await executarLunaCorePipeline(userText, sessaoId, opcoes)
  } finally {
    removeListeners()
  }

  if (abortSignal.aborted) throw new DOMException('Aborted', 'AbortError')

  if (resultado.error) {
    throw new Error(resultado.error)
  }

  await maybeRecordCloudTurn(deps.billing, resultado)

  return resultado
}

export function applyLunaCoreResult(
  deps: LunaCoreTurnDeps,
  convId: string,
  assistantMsgId: string,
  resultado: LunaCoreResultado,
) {
  const answer =
    resultado.resposta?.texto || 'Resposta gerada internamente sem output.'
  const prefix = billingNotice(resultado)
  const lunaPipelineTrace = buildLunaPipelineTrace(resultado)
  const narrativaPipeline = resultado.narrativa_pipeline?.trim() ?? ''
  const raciocinio = resultado.resposta?.raciocinio?.trim() ?? ''
  const reasoningOn = deps.reasoningEnabled !== false

  const reasoningSegments = reasoningOn
    ? [
        ...(narrativaPipeline || lunaPipelineTrace
          ? [
              {
                round: 1,
                text: narrativaPipeline,
                inProgress: false,
              },
            ]
          : []),
        ...(raciocinio
          ? [{ round: 2, text: raciocinio, inProgress: false as const }]
          : []),
      ]
    : undefined

  patchAssistantMessage(deps.updateConversation, convId, assistantMsgId, {
    text: prefix ? `${prefix}${answer}` : answer,
    streamingActive: undefined,
    turnStatusHint: undefined,
    reasoningInProgress: false,
    reasoningStreamingActive: false,
    reasoningTranslating: false,
    lunaPipelineTrace,
    llmProvider: 'luna-core',
    ...(reasoningOn
      ? {
          reasoningSegments,
          ...(raciocinio
            ? {
                reasoningTrace: {
                  text: raciocinio,
                  provider: 'luna-core',
                },
              }
            : {}),
        }
      : {}),
  })

  return resultado
}

export function applyLunaCoreError(
  deps: LunaCoreTurnDeps,
  convId: string,
  assistantMsgId: string,
  err: unknown,
) {
  if (err instanceof DOMException && err.name === 'AbortError') {
    patchAssistantMessage(deps.updateConversation, convId, assistantMsgId, {
      text: 'Geração interrompida.',
      streamingActive: undefined,
      turnStatusHint: undefined,
      reasoningInProgress: undefined,
      reasoningStreamingActive: undefined,
      reasoningTranslating: undefined,
      llmProvider: 'luna-core',
    })
    return
  }
  const msg =
    err instanceof Error ? err.message : 'Erro ao contactar a Luna Core.'
  patchAssistantMessage(deps.updateConversation, convId, assistantMsgId, {
    text: humanizeLlmError(msg),
    streamingActive: undefined,
    turnStatusHint: undefined,
    reasoningInProgress: undefined,
    reasoningStreamingActive: undefined,
    reasoningTranslating: undefined,
    llmProvider: 'luna-core',
  })
}

export function appendUserAndAssistantPlaceholder(
  updateConversation: LunaCoreTurnDeps['updateConversation'],
  convId: string,
  userText: string,
  assistantMsgId: string,
  _conv: Conversation | undefined,
) {
  const userMsg: Message = {
    id: nextId(),
    role: 'user',
    text: userText,
  }
  const assistantPlaceholder: Message = {
    id: assistantMsgId,
    role: 'assistant',
    text: '',
    llmProvider: 'luna-core',
    streamingActive: true,
  }

  updateConversation(convId, (c) => {
    const msgs = [...c.messages, userMsg, assistantPlaceholder]
    return {
      ...c,
      messages: msgs,
      title: c.titlePinned ? c.title : deriveTitle(msgs),
      updatedAt: Date.now(),
    }
  })
}
