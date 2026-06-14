import {
  completeLlmChatStream,
  readStreamingEnabled,
} from '../lib/llmStreamClient'
import {
  completeLlmChat,
  type LlmApiMessage,
} from '../lib/togetherClient'
import { isAssistantErrorText } from '../lib/assistantMessageUi'
import { formatMemorySaveBadgePreview } from '../lib/saveMemoryTool'
import { trimMessagesForAgent, userContentForLlm } from '../lib/lunaMemory'
import type {
  AgentStepRecord,
  LlmProviderId,
  Message,
  ReasoningTrace,
} from '../types/chat'
import type { AgentTurnInput, AgentTurnResult } from './types'
import { eventBus } from '../core/events/EventBus'
import { executeToolCall, type ToolSideEffects } from './executeTools'
import {
  buildLunaTemporalResearchReminder,
  injectReasoningLanguageIntoMessages,
} from '../lib/lunaTemporalContext'
import {
  shouldInjectReasoningLanguage,
  shouldRequestReasoningFromApi,
  shouldShowReasoningInUi,
} from '../lib/reasoningModelCapabilities'
import { extractUrlsFromUserText } from '../lib/urlInMessage'
import { normalizeReasoningForDisplay } from '../translation'
import { autoCaptureMemoriesIfNeeded } from './autoMemoryCapture'
import {
  agentTemperature,
  buildAgentFinalSystem,
  buildSystemCore,
} from './buildAgentSystemPrompt'
import {
  buildContinuationNudge,
  buildBudgetExitMessage,
  buildStuckExitMessage,
  inferAgentPhase,
  phaseStatusLabel,
  readAgentTurnBudget,
  recordToolFailure,
  shouldExitLoop,
} from './agentOrchestrator'
import {
  assessIdeContinuity,
  shouldNudgeIdeContinuation,
} from './ideTaskContinuity'
import { getAgentToolSchemas } from './toolSchemas'
import { getIdeTurnHost } from '../lib/ideTurnHost'
import { compileIdeContextRefreshNote } from '../lib/ideContextCompiler'
import { throwIfAgentTurnAborted } from '../lib/agentTurnCancel'
import { extractThoughtFromStream } from '../lib/reasoningStreamUi'

export const MAX_AGENT_STEPS = 8
const AGENT_MAX_COMPLETION_TOKENS = 2048
/** 2.ª passagem só com texto — contexto já grande após tools. */
const AGENT_SYNTHESIS_MAX_TOKENS = 1400
const SYNTHESIS_SKIP_IF_TEXT_CHARS = 120
const REASONING_TRACE_MAX = 24_000

export function isPlanningEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem('luna-use-planning') === '1'
  } catch {
    return false
  }
}

function imageHintForUserContent(ctx: AgentTurnInput, pending: string): string {
  if (!ctx.imageAttachments.length) return pending
  if (ctx.userMsg.visionDescription?.trim()) return pending
  const n = ctx.imageAttachments.length
  return (
    `${pending}\n\n` +
    `[${n} imagem(ns) anexada(s) — a descrição visual ainda não está pronta; use describe_images se precisar.]`
  )
}

function hadResearchTools(steps: AgentStepRecord[]): boolean {
  return steps.some(
    (s) =>
      s.ok &&
      (s.tool === 'web_search' ||
        s.tool === 'search_documents' ||
        s.tool === 'search_codebase'),
  )
}

/** Evita duplicar raciocínio cumulativo entre passos do agente. */
function mergeReasoningChunk(parts: string[], chunk: string | undefined) {
  const t = chunk?.trim()
  if (!t) return
  if (!parts.length) {
    parts.push(t)
    return
  }
  const last = parts[parts.length - 1]
  if (t === last) return
  if (t.startsWith(last) || last.startsWith(t)) {
    parts[parts.length - 1] = t.length >= last.length ? t : last
    return
  }
  parts.push(t)
}

async function finalizeReasoningForDisplay(
  ctx: AgentTurnInput,
  reasoningParts: string[],
  meta: {
    textOriginal?: string
    translated?: boolean
    locale?: string
  },
): Promise<void> {
  const raw = reasoningParts.join('\n\n---\n\n').trim()
  if (!raw) return

  ctx.onReasoningTranslating?.(true)
  const norm = await normalizeReasoningForDisplay(raw)
  ctx.onReasoningTranslating?.(false)

  reasoningParts.length = 0
  reasoningParts.push(norm.text)
  if (norm.textOriginal) {
    meta.textOriginal = norm.textOriginal
    meta.translated = true
  }
  if (norm.locale) meta.locale = norm.locale

  ctx.onReasoningDisplayUpdate?.({
    text: norm.text,
    ...(norm.textOriginal ? { textOriginal: norm.textOriginal } : {}),
    ...(norm.translated ? { translated: true } : {}),
    ...(norm.locale ? { locale: norm.locale } : {}),
  })
}

function buildReasoningTrace(
  parts: string[],
  provider: LlmProviderId | undefined,
  meta?: Pick<ReasoningTrace, 'textOriginal' | 'translated' | 'locale'>,
): ReasoningTrace | undefined {
  const text = parts.join('\n\n---\n\n').trim().slice(0, REASONING_TRACE_MAX)
  if (!text.length) return undefined
  return {
    text,
    ...(provider ? { provider } : {}),
    ...(meta?.textOriginal ? { textOriginal: meta.textOriginal } : {}),
    ...(meta?.translated ? { translated: true } : {}),
    ...(meta?.locale ? { locale: meta.locale } : {}),
  }
}

function ingestReasoningChunk(
  raw: string | undefined,
  reasoningParts: string[],
) {
  mergeReasoningChunk(reasoningParts, raw)
}

export async function runAgentTurn(
  ctx: AgentTurnInput,
  rollingSummary: string,
): Promise<AgentTurnResult> {
  eventBus.emit('agent:turn:start', {
    convId: ctx.convId,
    assistantMsgId: ctx.assistantMsgId,
  })
  const budget = readAgentTurnBudget(ctx.workbenchMode ?? 'chat')
  const stepLimit = budget.maxLlmRounds
  const systemCore = buildSystemCore(
    ctx.personalityId,
    ctx.workbenchMode ?? 'chat',
    ctx.ideContextBlock,
    ctx.financesContextBlock,
    ctx.financesAddonActive,
    ctx.primaryView ?? 'conversation',
  )
  let mainSystem = buildAgentFinalSystem(
    systemCore,
    ctx.userMemory,
    ctx.conversations,
    ctx.convId,
    rollingSummary,
  )

  const pendingContent = imageHintForUserContent(
    ctx,
    userContentForLlm(ctx.userMsg),
  )

  throwIfAgentTurnAborted(ctx.signal)

  // O planeamento preliminar foi desativado a pedido do utilizador para tornar o fluxo mais padrão e instantâneo.

  const verbatimForApi = trimMessagesForAgent(ctx.verbatimWorking)

  const apiMessages: LlmApiMessage[] = [
    ...verbatimForApi.map(
      (m): LlmApiMessage => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: userContentForLlm(m),
      }),
    ),
    { role: 'user', content: pendingContent },
  ]

  const loopMessages: LlmApiMessage[] = [
    { role: 'system', content: mainSystem },
    ...apiMessages,
  ]

  const userUrls = extractUrlsFromUserText(ctx.userCaption)
  if (userUrls.length) {
    loopMessages.push({
      role: 'system',
      content:
        `[Link na mensagem] A pessoa enviou: ${userUrls.join(' ')}. ` +
        'Usa `web_search` (ou outra tool adequada) para perceber o que é; depois **responde em texto** com o que encontraste — não fiques só no pensamento interno.',
    })
  }

  const effects: ToolSideEffects = { memorySaved: false }
  const agentSteps: AgentStepRecord[] = []
  const temperature = agentTemperature(ctx.personalityId)
  const userReasoningToggle = ctx.reasoningEnabled === true
  const showReasoningUi = shouldShowReasoningInUi(userReasoningToggle)
  const requestReasoningApi = shouldRequestReasoningFromApi(userReasoningToggle)
  const streamOn =
    ctx.streamingEnabled !== false && readStreamingEnabled()

  let lastAssistantText = ''
  let llmRound = 0
  let toolCallsTotal = 0
  let continuationNudges = 0
  const toolFailureMap = new Map<string, number>()
  let llmProvider: LlmProviderId | undefined
  let usedLlmFallback = false
  const reasoningParts: string[] = []
  const reasoningMeta: { textOriginal?: string; translated?: boolean } = {}

  const useStream = streamOn

  let pendingSynthesis = false
  let loopExited = false

  while (!loopExited && llmRound < stepLimit) {
    throwIfAgentTurnAborted(ctx.signal)
    llmRound++
    const synthesisPass = pendingSynthesis
    const phase = inferAgentPhase(agentSteps, pendingSynthesis)
    ctx.onOrchestratorRound?.(llmRound, phase)
    ctx.onStatusHint?.(
      synthesisPass
        ? phaseStatusLabel('synthesizing')
        : ctx.workbenchMode === 'ide'
          ? phaseStatusLabel(phase)
          : showReasoningUi || requestReasoningApi
            ? 'A pensar…'
            : 'A processar…',
    )

    // Injeções de prompts extras (IDE, finanças, etc) foram desativadas a pedido do utilizador para simplificar o envio de mensagem.

    // Injeções de memória e prompts de ferramentas financeiras desativadas.

    const financesOnlyTools =
      ctx.financesAddonActive && (ctx.primaryView ?? 'conversation') === 'finances'

    const apiLoopMessages = synthesisPass
      ? loopMessages.map((m) => {
          if (m.role !== 'assistant') return m
          const { reasoning_content: _r1, reasoning: _r2, ...rest } = m as LlmApiMessage & {
            reasoning_content?: string
            reasoning?: string
          }
          return rest as LlmApiMessage
        })
      : loopMessages

    const messagesForLlm = injectReasoningLanguageIntoMessages(
      apiLoopMessages,
      shouldInjectReasoningLanguage(userReasoningToggle) && !synthesisPass,
      ctx.llmSelection,
    )

    const llmOpts = {
      temperature: synthesisPass ? Math.min(temperature, 0.55) : temperature,
      maxCompletionTokens: synthesisPass
        ? AGENT_SYNTHESIS_MAX_TOKENS
        : AGENT_MAX_COMPLETION_TOKENS,
      ...(synthesisPass
        ? {}
        : {
            tools: getAgentToolSchemas({ financesOnly: financesOnlyTools }),
            tool_choice: 'auto' as const,
          }),
      reasoningEnabled: requestReasoningApi && !synthesisPass,
      llmSelection: ctx.llmSelection,
      signal: ctx.signal,
    }

    let streamedReasoningFull = ''
    let reasoningUiStarted = false

    const res = useStream
      ? await completeLlmChatStream(
          messagesForLlm,
          {
            onReasoning: (_delta, full) => {
              streamedReasoningFull = full
              if (!reasoningUiStarted) {
                reasoningUiStarted = true
                ctx.onReasoningStarted?.()
              }
              if (full.trim()) {
                ctx.onReasoningSegmentDelta?.(llmRound, full)
              }
            },
            onContent: (_delta, full) => {
              const parsed = extractThoughtFromStream(full)
              if (parsed.thought.trim()) {
                if (!reasoningUiStarted) {
                  reasoningUiStarted = true
                  ctx.onReasoningStarted?.()
                }
                ctx.onReasoningSegmentDelta?.(llmRound, parsed.thought)
              }
              if (parsed.content.length > 0) {
                ctx.onAssistantDelta?.(parsed.content)
              }
            },
            onToolsPending: () => {
              ctx.onToolsPending?.()
            },
          },
          llmOpts,
        )
      : await completeLlmChat(messagesForLlm, llmOpts)

    throwIfAgentTurnAborted(ctx.signal)

    if (!res.ok) {
      const canRetrySynthesis =
        pendingSynthesis &&
        llmRound < stepLimit &&
        hadResearchTools(agentSteps)
      if (canRetrySynthesis) {
        loopMessages.push({
          role: 'system',
          content:
            'A chamada ao modelo falhou. Usa só o que já tens nas mensagens `tool` acima e responde em português (Markdown), sem novas ferramentas.',
        })
        continue
      }
      if (reasoningParts.length) {
        await finalizeReasoningForDisplay(ctx, reasoningParts, reasoningMeta)
      }
      return {
        assistantText: formatAgentLlmError(res.error),
        agentSteps,
        ragCitations: effects.ragCitations,
        visionDescription: effects.visionDescription,
        reasoningTrace: buildReasoningTrace(
          reasoningParts,
          llmProvider,
          reasoningMeta,
        ),
        llmProvider,
        usedLlmFallback,
        turnDiagnostics: buildTurnDiagnosticsFromLlmError(res),
      }
    }

    if (res.provider) llmProvider = res.provider
    if (res.usedFallback) usedLlmFallback = true

    const finalParsed = extractThoughtFromStream(res.text)
    res.text = finalParsed.content

    const roundReasoning =
      res.reasoningContent?.trim() || streamedReasoningFull.trim() || finalParsed.thought.trim() || ''
    ingestReasoningChunk(roundReasoning || undefined, reasoningParts)

    // Conteúdo pode só existir em res.text (ex. GPT-OSS) — buffer antes de fechar raciocínio.
    if (finalParsed.content.length > 0) {
      ctx.onAssistantDelta?.(finalParsed.content)
    }
    if (reasoningUiStarted) {
      ctx.onReasoningSegmentComplete?.(llmRound, roundReasoning)
    }

    lastAssistantText = res.text.trim()

    if (!res.toolCalls?.length) {
      const exitDecision = shouldExitLoop({
        workbenchMode: ctx.workbenchMode,
        lastText: lastAssistantText,
        hasToolCalls: false,
        pendingSynthesis,
        hadResearch: hadResearchTools(agentSteps),
        userCaption: ctx.userCaption,
        agentSteps,
        budget,
        llmRound,
        toolCallsTotal,
        continuationNudges,
        failureMap: toolFailureMap,
      })

      if (exitDecision === 'exit_ok') {
        pendingSynthesis = false
        loopExited = true
        continue
      }

      if (exitDecision === 'exit_stuck') {
        lastAssistantText = buildStuckExitMessage(agentSteps)
        loopExited = true
        continue
      }

      if (exitDecision === 'exit_budget') {
        const continuity = assessIdeContinuity(
          ctx.userCaption,
          agentSteps,
          lastAssistantText,
        )
        lastAssistantText =
          lastAssistantText.trim() ||
          buildBudgetExitMessage(continuity, agentSteps)
        loopExited = true
        continue
      }

      if (exitDecision === 'synthesize') {
        loopMessages.push({
          role: 'system',
          content:
            'Já tens resultados das ferramentas nas mensagens acima. Escreve **agora** a resposta final ao utilizador em português (Markdown), com links reais das fontes. Não chames mais ferramentas.',
        })
        continue
      }

      if (exitDecision === 'continue') {
        continuationNudges++
        const host = getIdeTurnHost()
        const continuity = assessIdeContinuity(
          ctx.userCaption,
          agentSteps,
          lastAssistantText,
        )
        loopMessages.push({
          role: 'system',
          content: buildContinuationNudge(
            continuity,
            host?.getSnapshot().workspaceRoot ?? undefined,
          ),
        })
        if (lastAssistantText) {
          loopMessages.push({
            role: 'assistant',
            content: lastAssistantText,
          })
        }
        lastAssistantText = ''
        ctx.onStatusHint?.(phaseStatusLabel(inferAgentPhase(agentSteps, false)))
        continue
      }

      if (lastAssistantText) {
        pendingSynthesis = false
        loopExited = true
        continue
      }
      loopExited = true
      continue
    }

    const assistantToolMsg: LlmApiMessage = {
      role: 'assistant',
      content: res.text.trim().length ? res.text.trim() : null,
      tool_calls: res.toolCalls,
      ...(res.reasoningContent?.trim()
        ? {
            reasoning_content: res.reasoningContent.trim(),
            ...(res.provider === 'groq'
              ? { reasoning: res.reasoningContent.trim() }
              : {}),
          }
        : {}),
    }
    loopMessages.push(assistantToolMsg)

    toolCallsTotal += res.toolCalls.length

    for (const call of res.toolCalls) {
      throwIfAgentTurnAborted(ctx.signal)
      const toolName = call.function?.name ?? 'tool'
      ctx.onToolStart?.(toolName)
      eventBus.emit('agent:tool:start', {
        convId: ctx.convId,
        tool: toolName,
      })
      const result = await executeToolCall(call, ctx, effects)
      eventBus.emit('agent:tool:complete', {
        convId: ctx.convId,
        tool: toolName,
        ok: result.ok,
      })
      if (!result.ok) {
        recordToolFailure(
          toolFailureMap,
          toolName,
          call.function?.arguments ?? '{}',
        )
        const errSnippet = result.content.slice(0, 600)
        loopMessages.push({
          role: 'system',
          content:
            `[Falha em ${toolName}] Não encerres o turno. Erro: ${errSnippet}\n` +
            'Corrige caminho/argumentos ou tenta outra tool (grep, read_file, outro comando). Continua até concluir a tarefa ou reportar o bloqueio.',
        })
      }
      const step = {
        ...result.step,
        orchestratorRound: llmRound,
        ...(llmProvider ? { llmProvider } : {}),
      }
      agentSteps.push(step)
      ctx.onToolComplete?.(step)
      loopMessages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: result.content,
      })
    }

    if (toolCallsTotal >= budget.maxToolCalls) {
      const continuity = assessIdeContinuity(
        ctx.userCaption,
        agentSteps,
        lastAssistantText,
      )
      if (shouldNudgeIdeContinuation(continuity)) {
        lastAssistantText = buildBudgetExitMessage(continuity, agentSteps)
      }
      loopExited = true
      continue
    }

    if (
      ctx.workbenchMode === 'ide' &&
      res.toolCalls.some((c) =>
        /write_file|apply_patch|run_terminal_command/.test(
          c.function?.name ?? '',
        ),
      )
    ) {
      const host = getIdeTurnHost()
      if (host) {
        loopMessages.push({
          role: 'system',
          content: compileIdeContextRefreshNote(host.getSnapshot()),
        })
      }
    }

    if (hadResearchTools(agentSteps)) {
      const answerReady =
        lastAssistantText.length >= SYNTHESIS_SKIP_IF_TEXT_CHARS
      if (!answerReady) {
        pendingSynthesis = true
        ctx.onPrepareSynthesis?.()
        loopMessages.push({
          role: 'system',
          content:
            'Neste turno já usaste ferramentas de pesquisa. Na **próxima** resposta escreve só texto ao utilizador (sem novas tools): **Markdown** com 1–2 frases humanas; `##` por tema; links `[título](url)` das fontes reais nas tool messages (não inventes URLs); síntese no fim. ' +
            buildLunaTemporalResearchReminder(),
        })
      }
    }
  }

  if (!lastAssistantText && llmRound >= stepLimit) {
    lastAssistantText =
      'Usei várias ferramentas mas não consegui fechar a resposta em texto — tenta reformular ou pedir um ponto de cada vez.'
  }
  if (!lastAssistantText) {
    lastAssistantText = 'Resposta vazia do modelo. Tente de novo em instantes.'
  }

  let memoryBadge: Message['memoryBadge'] = undefined
  let memoryNoteIds: string[] = []
  let memorySavedPreview: string | undefined

  if (!effects.memorySaved) {
    await autoCaptureMemoriesIfNeeded(
      ctx,
      {
        userText: ctx.userCaption,
        assistantText: lastAssistantText,
        agentSteps,
      },
      effects,
    )
  }

  if (effects.memorySaved) {
    const notes = ctx.getMemoryNotes() ?? []
    const ids = notes
      .filter((n) => n.sourceMessageId === ctx.assistantMsgId)
      .map((n) => n.id)
    if (ids.length) {
      memoryNoteIds = ids
      memorySavedPreview = formatMemorySaveBadgePreview(notes, ids)
      memoryBadge = 'saved'

      const previewLine = memorySavedPreview || 'Gravado'
      let hasSaveStep = false
      for (const s of agentSteps) {
        if (s.tool !== 'save_memory' || !s.ok) continue
        hasSaveStep = true
        s.detail = { kind: 'save_memory', preview: previewLine }
        s.summary = `Memória · ${previewLine}`
      }
      if (!hasSaveStep) {
        agentSteps.push({
          tool: 'save_memory',
          label: 'Memória',
          summary: `Memória · ${previewLine}`,
          ok: true,
          detail: { kind: 'save_memory', preview: previewLine },
          ...(llmProvider ? { llmProvider } : {}),
        })
      }
    }
  }

  const uniqueCitations = effects.ragCitations?.length
    ? dedupeCitations(effects.ragCitations)
    : undefined

  if (reasoningParts.length) {
    void finalizeReasoningForDisplay(ctx, reasoningParts, reasoningMeta)
  }

  const turnResult = {
    assistantText: lastAssistantText,
    memoryBadge,
    memoryNoteIds: memoryNoteIds.length ? memoryNoteIds : undefined,
    memorySavedPreview,
    ragCitations: uniqueCitations,
    agentSteps,
    reasoningTrace: buildReasoningTrace(
      reasoningParts,
      llmProvider,
      reasoningMeta,
    ),
    llmProvider,
    usedLlmFallback,
    visionDescription: effects.visionDescription,
  }
  eventBus.emit('agent:turn:complete', {
    convId: ctx.convId,
    assistantMsgId: ctx.assistantMsgId,
    ok: !isAssistantErrorText(lastAssistantText),
  })
  return turnResult
}

function buildTurnDiagnosticsFromLlmError(res: {
  error: string
  attemptErrors?: string[]
}): import('../types/chat').TurnDiagnostics | undefined {
  const attempts =
    res.attemptErrors?.length
      ? res.attemptErrors
      : parseAttemptErrorsFromText(res.error)
  if (!attempts.length) return undefined
  return {
    llmAttempts: attempts,
    capturedAt: Date.now(),
  }
}

/** Extrai linhas «• provider · model: …» do texto de erro agregado. */
function parseAttemptErrorsFromText(error: string): string[] {
  return error
    .split(/\n\n+/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('•'))
}

function formatAgentLlmError(error: string): string {
  if (/nenhum provedor/i.test(error)) {
    return (
      'Nenhum modelo respondeu neste turno. ' +
      'Verifica se a API Key do Groq está correta no .env ou tenta novamente em instantes.\n\n' +
      error
    )
  }
  const contextTooLarge =
    /context|too many tokens|maximum.*tokens|input.*length|context_length|max_tokens exceeded|request too large|\b413\b/i.test(
      error,
    )
  if (/429|rate limit|tokens per minute|\bTPM\b/i.test(error)) {
    const wait = /try again in ([\d.]+)s/i.exec(error)
    const hint = wait
      ? ` Espera cerca de ${Math.ceil(parseFloat(wait[1]))} segundos.`
      : ' Espera uns 20 segundos e tenta de novo.'
    if (contextTooLarge) {
      return (
        'O turno ficou grande demais para o modelo.' +
        hint +
        ' Tenta uma pergunta mais curta.\n\n' +
        error
      )
    }
    return (
      'A API está no limite de pedidos agora (quota ou velocidade).' +
      hint +
      ' Se persistir, aguarda o reset da quota.\n\n' +
      error
    )
  }
  if (/cannot specify both.*include_reasoning.*reasoning_format/i.test(error)) {
    return (
      'A configuração de «Raciocínio» entrou em conflito com a API Groq. Tenta desligar o toggle «Raciocínio» junto ao campo de mensagem ou reinicia o app após actualizar.\n\n' +
      error
    )
  }
  if (contextTooLarge) {
    return (
      'O pedido ficou grande demais para este modelo (muitas tools, raciocínio longo ou histórico). ' +
      'Tenta desligar «Raciocínio» ou «Refazer» com uma frase mais curta.\n\n' +
      error
    )
  }
  if (/Groq\s*\(4\d\d\)/i.test(error)) {
    return (
      'Não consegui completar o pedido — a API do Groq recusou o pedido. Vale tentar de novo em instantes.\n\n' +
      error
    )
  }
  return (
    'Puxa, não consegui terminar a resposta agora — às vezes é rede ou limite da API. Vale tentar de novo em instantes.\n\n' +
    error
  )
}

function dedupeCitations(
  list: { path: string; preview: string }[],
): { path: string; preview: string }[] {
  const seen = new Set<string>()
  const out: { path: string; preview: string }[] = []
  for (const c of list) {
    const k = c.path
    if (seen.has(k)) continue
    seen.add(k)
    out.push(c)
  }
  return out
}
