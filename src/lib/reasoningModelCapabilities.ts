import type { LlmProviderId } from '../types/chat'
import type { LlmSelection } from './togetherClient'

/** Modelos que expõem thinking/reasoning mesmo sem o toggle «Pensamento». */
const NATIVE_REASONING_PATTERNS: Partial<Record<LlmProviderId, RegExp[]>> = {
  openrouter: [
    /ring/i,
    /inclusionai\/ring/i,
    /deepseek.*r1/i,
    /qwen.*thinking/i,
    /mai-ds-r/i,
    /\/thinking/i,
  ],
  groq: [/gpt-oss/i, /qwen3/i],
  together: [/deepseek.*r1/i, /thinking/i],
  ollama: [/qwen3/i, /deepseek-r1/i],
}

export function modelHasNativeReasoning(
  selection?: LlmSelection | null,
): boolean {
  if (!selection?.provider || !selection.model) return false
  const patterns = NATIVE_REASONING_PATTERNS[selection.provider]
  if (!patterns?.length) return false
  const m = selection.model.toLowerCase()
  return patterns.some((re) => re.test(m))
}

/** Pedido explícito de reasoning à API (toggle ligado). */
export function shouldRequestReasoningFromApi(userToggle: boolean): boolean {
  return userToggle
}

/** Mostrar badge, streaming e tradução do pensamento (só com toggle ligado). */
export function shouldShowReasoningInUi(
  userToggle: boolean,
  _selection?: LlmSelection | null,
): boolean {
  return userToggle
}

/** Inject de prompts PT — só com toggle explícito (evita duplicar com tradução automática). */
export function shouldInjectReasoningLanguage(userToggle: boolean): boolean {
  return userToggle
}
