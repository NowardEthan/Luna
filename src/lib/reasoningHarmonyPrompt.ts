import type { LunaLocaleId } from '../translation/types'
import {
  buildAnalysisChannelInstruction,
  buildSimpleChatAnswerInstructions,
} from '../translation/localePrompts'
import type { LlmSelection } from './togetherClient'

/** Marcador no system prompt — evita inject duplicado do bloco antigo. */
export const HARMONY_REASONING_MARKER = 'luna-harmony-reasoning-v1'

export function isGptOssHarmonyModel(selection?: LlmSelection | null): boolean {
  if (!selection?.model) return false
  return /gpt-oss/i.test(selection.model)
}

/** GPT-OSS (Harmony): analysis + final — prompt único estruturado. */
export function usesHarmonyReasoningPrompt(
  selection?: LlmSelection | null,
  reasoningEnabled = false,
): boolean {
  if (!reasoningEnabled) return false
  if (!isGptOssHarmonyModel(selection)) return false
  return (
    selection?.provider === 'groq' || selection?.provider === 'openrouter'
  )
}

/**
 * System prompt no formato esperado pelo GPT-OSS (canais analysis / final).
 * @see https://github.com/openai/harmony
 */
export function buildHarmonySystemPrompt(
  locale: LunaLocaleId,
  reasoningEnabled: boolean,
): string {
  let s =
    `[${HARMONY_REASONING_MARKER}]\n` +
    `You are Luna, the assistant in the Luna v1 app.\n` +
    `Reasoning: medium\n\n`

  if (reasoningEnabled) {
    s +=
      `# Canal analysis (raciocínio interno — a pessoa vê no app)\n` +
      `${buildAnalysisChannelInstruction()}\n\n` +
      `# Resposta final (canal final)\n`
  }

  s += buildSimpleChatAnswerInstructions(locale)
  return s
}

export function systemPromptUsesHarmonyMarker(content: string): boolean {
  return content.includes(HARMONY_REASONING_MARKER)
}
