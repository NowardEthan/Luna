import { useCallback, useMemo, useRef } from 'react'
import { parseIdeMentions } from '../../lib/ideMentions'
import { ensureIdeLlmSelection } from '../../lib/ideLlmSelection'
import { cancelActiveAgentTurn } from '../../lib/agentTurnCancel'
import type { Conversation, Message, AgentStepRecord } from '../../types/chat'
import type { UserMemoryState } from '../../types/memory'
import type { ChatPersonalityId } from '../../lib/chatPersonality'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { nextId } from '../chat/state/conversationPersistence'
import {
  applyLunaCoreError,
  applyLunaCoreResult,
  patchAssistantMessage,
  runLunaCoreTurn,
  type LunaCoreTurnDeps,
} from './lunaCoreTurnShared'
import { upsertReasoningSegment, patchAssistantMessage as patchAssistantMsg } from './lib/messagePatch'
import type { SendMessageOptions } from './useLunaCoreTurn'
import { compileIdePipelineOptions } from '../../lib/compileIdeContextForTurn'
import { shouldForceLocalInPipeline } from '../../lib/lunaLlmRuntimeMode'
import { readLocalLlmProfile } from '../../lib/lunaLocalLlmProfile'
import { runIdeLightReview } from './runIdeLightReview'
import { useLunaCoreBilling } from '../billing/useLunaCoreBilling'
import { readForgeComposerMode } from '../../lib/forgeComposerMode'
import { interpretForgeTurn } from '../ide/forgeAgentInterpreter'
import { getIdeTurnHost } from '../../lib/ideTurnHost'
import { workspaceDisplayName } from '../../lib/workspaceSessions'

type Deps = {
  activeId: string
  conversations: Conversation[]
  messages: Message[]
  personalityId: ChatPersonalityId
  ragEnabled: boolean
  reasoningEnabled: boolean
  updateConversation: LunaCoreTurnDeps['updateConversation']
  userMemoryRef: MutableRefObject<UserMemoryState>
  setUserMemory: Dispatch<SetStateAction<UserMemoryState>>
}

// Mapeia PassoExecucao do Core para AgentStepRecord da UI
function passoParaStep(passo: {
  rodada: number
  ferramenta: string
  argumentos: Record<string, unknown>
  resultado: string
  duracao_ms: number
  sucesso: boolean
}): AgentStepRecord {
  const primArg = Object.values(passo.argumentos)[0]
  const label =
    typeof primArg === 'string' ? primArg.slice(0, 60) : passo.ferramenta

  return {
    tool: passo.ferramenta,
    label,
    summary: passo.sucesso
      ? passo.resultado.slice(0, 120)
      : `ERRO: ${passo.resultado.slice(0, 120)}`,
    ok: passo.sucesso,
    orchestratorRound: passo.rodada,
  }
}

function buildSnapshotWorkspace() {
  const host = getIdeTurnHost()
  if (!host) return { workspaceRoot: '', arquivosAbertos: [] }
  const snap = host.getSnapshot()
  return {
    workspaceRoot: snap.workspaceRoot ?? '',
    arquivosAbertos: snap.openFiles.map((f) => f.path ?? '').filter(Boolean),
    arquivoAtivo: snap.activeFilePath ?? undefined,
    gitStatus:
      snap.gitDirtyPaths.length > 0
        ? snap.gitDirtyPaths.map((p) => `M ${p}`).join('\n')
        : undefined,
  }
}

export function useIdeHybridTurn(deps: Deps) {
  const abortRef = useRef<AbortController | null>(null)
  const billing = useLunaCoreBilling()
  const ragRef = useRef(deps.ragEnabled)
  ragRef.current = deps.ragEnabled
  const mentionsRef = useRef(parseIdeMentions(''))

  const resolvePipelineOptions = useCallback(
    async (userText: string, conv?: Conversation) =>
      compileIdePipelineOptions(
        userText,
        ragRef.current,
        mentionsRef.current,
        conv,
      ),
    [],
  )

  const turnDeps: LunaCoreTurnDeps = useMemo(
    () => ({
      activeId: deps.activeId,
      conversations: deps.conversations,
      updateConversation: deps.updateConversation,
      resolvePipelineOptions,
      turnStatusHint: 'A analisar o workspace e a memória…',
      reasoningEnabled: deps.reasoningEnabled,
      billing,
    }),
    [
      deps.activeId,
      deps.conversations,
      deps.updateConversation,
      deps.reasoningEnabled,
      resolvePipelineOptions,
      billing,
    ],
  )

  const cancelAgentTurn = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    cancelActiveAgentTurn()
  }, [])

  const sendMessage = useCallback(
    async (
      userText: string,
      _images?: { name: string; dataUrl: string }[],
      _options?: SendMessageOptions,
    ) => {
      const convId = deps.activeId
      if (!convId) return

      const trimmed = userText.trim()
      if (!trimmed) return

      const ideMentions = parseIdeMentions(trimmed)
      mentionsRef.current = ideMentions
      const composerMode = readForgeComposerMode()
      const route = interpretForgeTurn({
        userText: trimmed,
        mentions: ideMentions,
        composerMode,
      })

      cancelAgentTurn()
      const ac = new AbortController()
      abortRef.current = ac

      const userMsgId = nextId()
      const assistantMsgId = nextId()

      const userMsg: Message = {
        id: userMsgId,
        role: 'user',
        text: trimmed,
        ideContexts: ideMentions.length ? ideMentions : undefined,
      }

      const assistantPlaceholder: Message = {
        id: assistantMsgId,
        role: 'assistant',
        text: '',
        llmProvider: 'luna-core',
        streamingActive: true,
        turnStatusHint: 'A analisar pedido…',
      }

      deps.updateConversation(convId, (c) => ({
        ...c,
        messages: [...c.messages, userMsg, assistantPlaceholder],
        updatedAt: Date.now(),
      }))

      try {
        const llmSelection = await ensureIdeLlmSelection()

        // Revisão rápida de @ficheiro — sem pipeline Core completo
        if (route === 'light_review') {
          await runIdeLightReview({
            convId,
            assistantMsgId,
            userText: trimmed,
            mentions: ideMentions,
            llmSelection,
            updateConversation: deps.updateConversation,
          })
          return
        }

        // ── MODO AGENTE: pipeline PAIA unificado no Core ──────────────────────
        if (route === 'forge_agent') {
          const lunaCore = (window as unknown as Record<string, unknown>)
            .lunaCore as {
            executarAgenteIde: (
              mensagem: string,
              opcoes: Record<string, unknown>,
            ) => Promise<{
              resposta?: string
              passos?: Array<{
                rodada: number
                ferramenta: string
                argumentos: Record<string, unknown>
                resultado: string
                duracao_ms: number
                sucesso: boolean
              }>
              error?: string
            }>
            onStatusHint: (cb: (h: string) => void) => () => void
            onToolCallComplete: (
              cb: (p: unknown) => void,
            ) => () => void
            onReasoningRodada: (
              cb: (p: {
                rodada: number
                texto: string
                emProgresso: boolean
              }) => void,
            ) => () => void
          }

          const reasoningOn = deps.reasoningEnabled

          if (reasoningOn) {
            patchAssistantMessage(deps.updateConversation, convId, assistantMsgId, {
              reasoningInProgress: true,
              orchestratorRound: 1,
            })
          }

          // Regista listeners de progresso antes de chamar
          const removeStatusHint = lunaCore.onStatusHint((hint) => {
            if (ac.signal.aborted) return
            patchAssistantMessage(deps.updateConversation, convId, assistantMsgId, {
              turnStatusHint: hint,
            })
          })

          const stepsInProgress: AgentStepRecord[] = []
          const removeToolComplete = lunaCore.onToolCallComplete((passo) => {
            if (ac.signal.aborted) return
            const p = passo as {
              rodada: number
              ferramenta: string
              argumentos: Record<string, unknown>
              resultado: string
              duracao_ms: number
              sucesso: boolean
            }
            stepsInProgress.push(passoParaStep(p))
            patchAssistantMessage(deps.updateConversation, convId, assistantMsgId, {
              agentStepsInProgress: [...stepsInProgress],
            })
          })

          const removeReasoning =
            reasoningOn && typeof lunaCore.onReasoningRodada === 'function'
              ? lunaCore.onReasoningRodada(({ rodada, texto, emProgresso }) => {
                if (ac.signal.aborted) return
                const raw = texto.trim()
                patchAssistantMsg(
                  convId,
                  assistantMsgId,
                  deps.updateConversation,
                  (m) => ({
                    ...m,
                    orchestratorRound: rodada,
                    reasoningInProgress: emProgresso,
                    reasoningStreamingActive: emProgresso,
                    turnStatusHint: emProgresso ? 'A pensar…' : undefined,
                    reasoningSegments: upsertReasoningSegment(m.reasoningSegments, {
                      round: rodada,
                      text: raw,
                      inProgress: emProgresso,
                    }),
                    ...(raw
                      ? {
                          reasoningTrace: {
                            text: raw,
                            provider: 'luna-core',
                          },
                        }
                      : {}),
                  }),
                )
              })
            : () => {}

          try {
            const conv = deps.conversations.find((c) => c.id === convId)
            const snapshotWorkspace = buildSnapshotWorkspace()
            const wsRoot = conv?.workspaceRoot ?? snapshotWorkspace.workspaceRoot
            const detalheAmbiente = wsRoot?.trim()
              ? `projeto «${workspaceDisplayName(wsRoot)}»`
              : undefined

            const resultado = await lunaCore.executarAgenteIde(trimmed, {
              sessaoId: conv?.lunaSessaoId ?? undefined,
              detalhe_ambiente: detalheAmbiente,
              snapshotWorkspace,
              ...(shouldForceLocalInPipeline() ? { forceLocal: true } : {}),
              localLlmProfile: readLocalLlmProfile(),
              byokUid: billing?.byokUid ?? undefined,
              byokMeta: billing?.byokMeta ?? undefined,
              reasoningEnabled: reasoningOn,
            })

            if (ac.signal.aborted) return

            if (resultado.error) {
              patchAssistantMessage(deps.updateConversation, convId, assistantMsgId, {
                text: `Erro no agente: ${resultado.error}`,
                streamingActive: false,
                turnStatusHint: undefined,
              })
              return
            }

            const agentSteps = (resultado.passos ?? []).map(passoParaStep)

            patchAssistantMessage(deps.updateConversation, convId, assistantMsgId, {
              text: resultado.resposta ?? '',
              streamingActive: false,
              turnStatusHint: undefined,
              reasoningInProgress: false,
              reasoningStreamingActive: false,
              agentSteps: agentSteps.length > 0 ? agentSteps : undefined,
              agentStepsInProgress: undefined,
            })
          } finally {
            removeStatusHint()
            removeToolComplete()
            removeReasoning()
          }
          return
        }

        // ── MODO CHAT: pipeline Luna Core clássico ────────────────────────────
        const resultado = await runLunaCoreTurn({
          deps: turnDeps,
          userText: trimmed,
          abortSignal: ac.signal,
          convId,
          assistantMsgId,
        })

        if (abortSignalAborted(ac)) return

        applyLunaCoreResult(turnDeps, convId, assistantMsgId, resultado)
      } catch (err) {
        applyLunaCoreError(turnDeps, convId, assistantMsgId, err)
      } finally {
        if (abortRef.current === ac) abortRef.current = null
      }
    },
    [deps, turnDeps, cancelAgentTurn, billing],
  )

  const canRedoMessage = useCallback(() => false, [])

  const redoRegenerateAt = useCallback(async (_messageId: string) => {
    /* desactivado no turno Forge por agora */
  }, [])

  return {
    sendMessage,
    cancelAgentTurn,
    canRedoMessage,
    redoRegenerateAt,
  }
}

function abortSignalAborted(ac: AbortController): boolean {
  return ac.signal.aborted
}
