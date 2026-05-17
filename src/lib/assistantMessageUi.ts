import type { Message } from '../types/chat'

const GENERATING_STATUS =
  /^(Pensando…|A (planear|pensar|processar|usar) .+…)$/i

export function isAssistantGenerating(m: Message): boolean {
  if (m.role !== 'assistant') return false
  if (m.streamingActive === true) return true
  if (m.reasoningInProgress === true) return true
  if ((m.agentStepsInProgress?.length ?? 0) > 0) return true
  return GENERATING_STATUS.test(m.text.trim())
}

export function isAssistantStreamingText(m: Message): boolean {
  return m.role === 'assistant' && m.streamingActive === true
}

export function isAssistantPlaceholderText(text: string): boolean {
  return GENERATING_STATUS.test(text.trim())
}

/** Corpo da resposta (fora do badge de pensamento). */
export function shouldRenderAssistantBody(m: Message): boolean {
  if (m.role !== 'assistant') return false
  if (m.streamingActive === true) return true
  if (!isAssistantPlaceholderText(m.text)) return true
  return showAssistantStatusSpinner(m)
}

/** Spinner de texto por baixo do badge — evita «A pensar…» duplicado. */
export function showAssistantStatusSpinner(m: Message): boolean {
  if (m.role !== 'assistant') return false
  if (m.streamingActive === true) return false
  if (m.reasoningInProgress === true) return false
  if (m.reasoningTranslating === true) return false
  if ((m.agentStepsInProgress?.length ?? 0) > 0) return true
  const t = m.text.trim()
  return GENERATING_STATUS.test(t)
}

export function isAssistantErrorText(text: string): boolean {
  return /não consegui|limite de pedidos|Groq\s*\(|Together\s*\(|cannot specify/i.test(
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
