import {
  completeLlmChatStream,
  readStreamingEnabled,
} from '../lib/llmStreamClient'
import {
  completeLlmChat,
  type LlmApiMessage,
} from '../lib/togetherClient'
import {
  buildPlanningUserBlock,
  formatPlanningHintForMainSystem,
  parsePlanningJson,
  PLANNING_SYSTEM_PROMPT,
} from '../lib/lunaPlanningPrompt'
import { formatMemorySaveBadgePreview } from '../lib/saveMemoryTool'
import { trimMessagesForAgent, userContentForLlm } from '../lib/lunaMemory'
import type {
  AgentStepRecord,
  LlmProviderId,
  Message,
  ReasoningTrace,
} from '../types/chat'
import type { AgentTurnInput, AgentTurnResult } from './types'
import { AGENT_TOOL_SCHEMAS } from './toolSchemas'
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
import {
  shouldReviewMemoryForTurn,
  userAskedToRemember,
} from '../lib/memoryPreferences'
import { extractUrlsFromUserText } from '../lib/urlInMessage'
import { normalizeReasoningForDisplay } from '../translation'
import { autoCaptureMemoriesIfNeeded } from './autoMemoryCapture'
import {
  agentTemperature,
  buildAgentFinalSystem,
  buildSystemCore,
} from './buildAgentSystemPrompt'
import {
  IDE_FIRST_TURN_SYSTEM_HINT,
  IDE_EXPLORE_HINT,
  IDE_GUI_HINT,
} from './ideSystemSupplement'
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
import { getIdeTurnHost } from '../lib/ideTurnHost'
import {
  compileIdeContextBlock,
  compileIdeContextRefreshNote,
} from '../lib/ideContextCompiler'

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
  const budget = readAgentTurnBudget(ctx.workbenchMode ?? 'chat')
  const stepLimit = budget.maxLlmRounds
  const systemCore = buildSystemCore(ctx.personalityId, ctx.workbenchMode ?? 'chat')
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

  if (ctx.usePlanning ?? isPlanningEnabled()) {
    ctx.onStatusHint?.('A planear…')
    const planningUserBlock = buildPlanningUserBlock(
      ctx.verbatimWorking,
      pendingContent,
    )
    const planRes = await completeLlmChat(
      [
        { role: 'system', content: PLANNING_SYSTEM_PROMPT },
        { role: 'user', content: planningUserBlock },
      ],
      {
        temperature: 0.28,
        maxCompletionTokens: 450,
        tool_choice: 'none',
        reasoningEnabled: false,
      },
    )
    let parsedPlan = planRes.ok ? parsePlanningJson(planRes.text) : null
    if (!parsedPlan && planRes.ok && planRes.text.trim()) {
      const retry = await completeLlmChat(
        [
          { role: 'system', content: PLANNING_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `${planningUserBlock}\n\nReforço: devolve **somente** o objecto JSON pedido, sem markdown.`,
          },
        ],
        {
          temperature: 0.15,
          maxCompletionTokens: 450,
          tool_choice: 'none',
          reasoningEnabled: false,
        },
      )
      if (retry.ok) parsedPlan = parsePlanningJson(retry.text)
    }
    if (parsedPlan) {
      mainSystem = mainSystem + formatPlanningHintForMainSystem(parsedPlan)
    }
  }

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
  const showReasoningUi = shouldShowReasoningInUi(
    userReasoningToggle,
    ctx.llmSelection,
  )
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

  const rememberRequest = userAskedToRemember(ctx.userCaption)
  const memoryWorthyTurn = shouldReviewMemoryForTurn(ctx.userCaption)
  let pendingSynthesis = false
  let loopExited = false

  while (!loopExited && llmRound < stepLimit) {
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

    if (llmRound === 1 && ctx.workbenchMode === 'ide') {
      loopMessages.push({
        role: 'system',
        content: IDE_FIRST_TURN_SYSTEM_HINT,
      })
      if (
        /mapear|explorar|onde está|como funciona|estrutura do projecto|fluxo de/i.test(
          ctx.userCaption,
        )
      ) {
        loopMessages.push({ role: 'system', content: IDE_EXPLORE_HINT })
      }
      if (
        /interface gráfica|\bgui\b|janela|tkinter|matplotlib|electron|dotnet|javafx|mostrar.*visual|ver.*na tela|na ui\b/i.test(
          ctx.userCaption,
        )
      ) {
        loopMessages.push({ role: 'system', content: IDE_GUI_HINT })
      }
    }

    if (llmRound > 1 && ctx.workbenchMode === 'ide' && agentSteps.length) {
      const host = getIdeTurnHost()
      if (host) {
        const refresh = await compileIdeContextBlock({
          snapshot: host.getSnapshot(),
          mentions: ctx.ideMentions,
          userQuery: ctx.userCaption,
          ragEnabled: ctx.ragEnabled,
        })
        loopMessages.push({
          role: 'system',
          content:
            compileIdeContextRefreshNote(host.getSnapshot()) +
            (refresh ? `\n\n${refresh}` : ''),
        })
      }
    }

    if (llmRound === 1 && (rememberRequest || memoryWorthyTurn)) {
      loopMessages.push({
        role: 'system',
        content: rememberRequest
          ? '[Memória] A pessoa pediu para lembrar ou guardar algo. Chama **save_memory** com o facto concreto (título + detalhe) neste turno, antes de responder só em texto.'
          : '[Memória] Este turno pode ter factos estáveis novos (nome, papel, projecto, preferências). Antes de fechar a resposta em texto, chama **save_memory** para cada facto novo que ainda não esteja nas notas listadas acima — não assumes que “já sabes” sem gravar.',
      })
    }

    const messagesForLlm = injectReasoningLanguageIntoMessages(
      loopMessages,
      shouldInjectReasoningLanguage(userReasoningToggle),
    )

    const llmOpts = {
      temperature: synthesisPass ? Math.min(temperature, 0.55) : temperature,
      maxCompletionTokens: synthesisPass
        ? AGENT_SYNTHESIS_MAX_TOKENS
        : AGENT_MAX_COMPLETION_TOKENS,
      ...(synthesisPass
        ? {}
        : {
            tools: AGENT_TOOL_SCHEMAS,
            tool_choice: 'auto' as const,
          }),
      reasoningEnabled: requestReasoningApi && !synthesisPass,
      llmSelection: ctx.llmSelection,
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
              ctx.onAssistantDelta?.(full)
            },
            onToolsPending: () => {
              ctx.onToolsPending?.()
            },
          },
          llmOpts,
        )
      : await completeLlmChat(messagesForLlm, llmOpts)

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
    const roundReasoning =
      res.reasoningContent?.trim() || streamedReasoningFull.trim() || ''
    ingestReasoningChunk(roundReasoning || undefined, reasoningParts)
    if (roundReasoning) {
      ctx.onReasoningSegmentComplete?.(llmRound, roundReasoning)
    }
    streamedReasoningFull = ''

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

      if (exitDecision === 'continue' && ctx.workbenchMode === 'ide') {
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
      const toolName = call.function?.name ?? 'tool'
      ctx.onToolStart?.(toolName)
      const result = await executeToolCall(call, ctx, effects)
      if (!result.ok) {
        recordToolFailure(
          toolFailureMap,
          toolName,
          call.function?.arguments ?? '{}',
        )
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

  return {
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
  if (/nenhum provedor/i.test(error) && /•\s*(openrouter|groq|together|ollama)/i.test(error)) {
    const hasOpenRouterLimit =
      /free-models-per-day|free model requests per day|429|rate limit|quota/i.test(error)
    const ringMention = /ring-2\.6|inclusionai\/ring/i.test(error)
    return (
      (hasOpenRouterLimit
        ? ringMention
          ? 'Nenhum modelo respondeu — o Ring (free) no OpenRouter costuma bater no limite diário ou de velocidade. '
          : 'Nenhum modelo respondeu — o modelo gratuito no OpenRouter pode estar no limite diário ou de velocidade. '
        : 'Nenhum modelo respondeu neste turno. ') +
      'Escolhe outro modelo no seletor (ex. Ollama local ou Groq), espera um minuto, ou abre «Detalhes técnicos» para ver cada tentativa.\n\n' +
      error
    )
  }
  if (/free-models-per-day|free model requests per day/i.test(error)) {
    return (
      'Atingiste o limite diário gratuito do OpenRouter para este modelo. ' +
      'Adiciona créditos em openrouter.ai, escolhe outro modelo no seletor (ex.: Ollama local), ou tenta amanhã.\n\n' +
      error
    )
  }
  const contextTooLarge =
    /context|too many tokens|maximum.*tokens|input.*length|context_length|max_tokens exceeded/i.test(
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
      ' Se persistir, troca de modelo no seletor ou espera o reset da quota.\n\n' +
      error
    )
  }
  if (/cannot specify both.*include_reasoning.*reasoning_format/i.test(error)) {
    return (
      'A configuração de «Pensamento» entrou em conflito com a API Groq. Tenta desligar o toggle «Pensamento» no header ou reinicia o app após actualizar.\n\n' +
      error
    )
  }
  if (/Groq\s*\(4\d\d\)|Together\s*\(4\d\d\)/i.test(error)) {
    return (
      'Não consegui completar o pedido — a API recusou o pedido. Vale tentar de novo em instantes.\n\n' +
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
