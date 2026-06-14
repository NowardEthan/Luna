import type { Message } from '../types/chat'

/** Textos antigos que viviam em `message.text` durante a geração. */
const LEGACY_GENERATING_STATUS =
  /^(Pensando…|A (planear|pensar|processar|usar|analisar) .+…)$/i

export function isLegacyStatusText(text: string): boolean {
  return LEGACY_GENERATING_STATUS.test(text.trim())
}

export function readTurnStatusLabel(m: Message): string | undefined {
  const hint = m.turnStatusHint?.trim()
  if (hint) return hint
  const t = m.text.trim()
  if (t && isLegacyStatusText(t)) return t
  return undefined
}

export function isReasoningStreaming(m: Message): boolean {
  return (
    m.reasoningInProgress === true || m.reasoningStreamingActive === true
  )
}

/** Fase visível do turno (banner + compositor). */
export type AssistantTurnPhase =
  | 'connecting'
  | 'thinking'
  | 'translating'
  | 'writing'
  | 'waiting'
  | 'tool'

export function readAssistantTurnPhase(m: Message): AssistantTurnPhase | undefined {
  if (m.role !== 'assistant') return undefined
  if (isAssistantErrorText(m.text)) return undefined

  if ((m.agentStepsInProgress?.length ?? 0) > 0) return 'tool'

  if (m.reasoningTranslating === true) return 'translating'
  if (isReasoningStreaming(m)) return 'thinking'
  if (isAnswerStreaming(m)) return 'writing'
  if (m.streamingActive === true) return 'writing'

  const hint = readTurnStatusLabel(m)?.toLowerCase() ?? ''
  if (hint.includes('traduzir') || hint.includes('translat')) return 'translating'
  if (hint.includes('pensar') || hint.includes('raciocínio') || hint.includes('think'))
    return 'thinking'
  if (hint.includes('resposta') || hint.includes('escrever') || hint.includes('respond'))
    return 'writing'
  if (
    hint.includes('ferramenta') ||
    hint.includes('tool') ||
    hint.includes('grep') ||
    hint.includes('ficheiro') ||
    hint.includes('workspace')
  ) {
    return 'tool'
  }
  if (hint) return 'waiting'

  const pendingTurn =
    !m.text.trim() &&
    (m.reasoningInProgress === true ||
      m.reasoningStreamingActive === true ||
      Boolean(m.reasoningSegments?.some((s) => s.inProgress)))

  if (pendingTurn) return 'thinking'
  if (!m.text.trim()) return 'connecting'

  return undefined
}

/** Bolha em modo resposta (não durante pensamento no painel Atividade). */
export function isAnswerStreaming(m: Message): boolean {
  return (
    m.role === 'assistant' &&
    m.streamingActive === true &&
    !isReasoningStreaming(m)
  )
}

export function isAssistantGenerating(m: Message): boolean {
  if (m.role !== 'assistant') return false
  if (isAnswerStreaming(m)) return true
  if (isReasoningStreaming(m)) return true
  if (m.reasoningTranslating === true) return true
  if ((m.agentStepsInProgress?.length ?? 0) > 0) return true
  if (readTurnStatusLabel(m)) return true
  if (
    !m.text.trim() &&
    Boolean(
      m.reasoningSegments?.some((s) => s.inProgress) ||
        m.reasoningInProgress ||
        m.reasoningStreamingActive,
    )
  ) {
    return true
  }
  return false
}

export function isAssistantStreamingText(m: Message): boolean {
  return isAnswerStreaming(m)
}

/** Mostrar bolha de resposta (estilo Cursor: só depois do pensamento). */
export function shouldShowResponseBubble(
  m: Message,
  generating: boolean,
): boolean {
  if (m.role !== 'assistant') return false
  if (isAssistantErrorText(m.text)) return true
  if (isAnswerStreaming(m)) return true
  if (generating && isReasoningStreaming(m)) return false
  const body = m.text.trim()
  if (!body) return false
  if (isLegacyStatusText(body)) return false
  return true
}

/** @deprecated use shouldShowResponseBubble */
export function shouldRenderAssistantBody(m: Message): boolean {
  return shouldShowResponseBubble(m, false)
}

/** Linha de estado na timeline (tools, visão, etc.). */
export function showAssistantStatusSpinner(m: Message): boolean {
  if (m.role !== 'assistant') return false
  if (isAnswerStreaming(m)) return false
  if (isReasoningStreaming(m)) return false
  if (m.reasoningTranslating === true) return false
  if ((m.agentStepsInProgress?.length ?? 0) > 0) return true
  return Boolean(readTurnStatusLabel(m))
}

export function isAssistantErrorText(text: string): boolean {
  return /não consegui|limite de pedidos|OpenRouter|402|créditos ou permissões|Groq\s*\(|Together\s*\(|cannot specify/i.test(
    text,
  )
}

export function ragShownInToolsPanel(m: Message): boolean {
  const steps = [...(m.agentSteps ?? []), ...(m.agentStepsInProgress ?? [])]
  return steps.some(
    (s) =>
      s.ok &&
      s.detail?.kind === 'search_documents' &&
      (s.detail.citations?.length ?? 0) > 0,
  )
}
