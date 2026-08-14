import type { LlmSelection } from '../../lib/togetherClient'
import { DEFAULT_STREAM_WORDS_PER_SECOND } from '../../lib/smoothStreamPlayer'

export const SIMPLE_CHAT_MODEL = 'luna-paia'

export const SIMPLE_CHAT_MODEL_LABEL = 'PAIA'

export const SIMPLE_CHAT_LLM_SELECTION: LlmSelection = {
  provider: 'luna-core',
  model: SIMPLE_CHAT_MODEL,
}

export const SIMPLE_CHAT_PROVIDER_LABEL = 'Luna'

export const SIMPLE_CHAT_STREAM_WORDS_PER_SECOND = DEFAULT_STREAM_WORDS_PER_SECOND

/**
 * O toggle `reasoningEnabled` no composer activa raciocínio no pipeline Luna Core
 * (narrativa PAIA + CoT do modelo maior quando suportado).
 */
export const SIMPLE_CHAT_REASONING_TOGGLE_AFFECTS_CORE = true
