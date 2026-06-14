import type { LlmApiMessage, LlmSelection } from '../../lib/togetherClient'
import {
  buildHarmonySystemPrompt,
  usesHarmonyReasoningPrompt,
} from '../../lib/reasoningHarmonyPrompt'
import type { Message } from '../../types/chat'
import { buildSimpleChatSystemPrompt, readUiLocale } from '../../translation'

export type BuildSimpleChatMessagesOptions = {
  reasoningEnabled?: boolean
  llmSelection?: LlmSelection
}

function isUsableAssistantMessage(m: Message): boolean {
  if (m.role !== 'assistant') return false
  if (m.streamingActive) return false
  return Boolean(m.text.trim())
}

/** Histórico + mensagem actual para o endpoint de chat. */
export function buildSimpleChatApiMessages(
  priorMessages: Message[],
  userText: string,
  options?: BuildSimpleChatMessagesOptions,
): LlmApiMessage[] {
  const history: LlmApiMessage[] = []
  const locale = readUiLocale()
  const reasoningOn = options?.reasoningEnabled === true
  const systemPrompt = usesHarmonyReasoningPrompt(
    options?.llmSelection,
    reasoningOn,
  )
    ? buildHarmonySystemPrompt(locale, reasoningOn)
    : buildSimpleChatSystemPrompt(locale)

  for (const m of priorMessages) {
    if (m.role === 'user') {
      const t = m.text.trim()
      if (t) history.push({ role: 'user', content: t })
    } else if (isUsableAssistantMessage(m)) {
      history.push({ role: 'assistant', content: m.text.trim() })
    }
  }

  const trimmed = userText.trim()
  if (trimmed) history.push({ role: 'user', content: trimmed })

  return [{ role: 'system', content: systemPrompt }, ...history]
}
