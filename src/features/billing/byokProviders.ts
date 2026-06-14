/** Provedores BYOK — APIs OpenAI-compatíveis usadas pelo Luna Core. */
export type ByokProviderId =
  | 'openai'
  | 'groq'
  | 'together'
  | 'gemini'
  | 'claude'
  | 'lmstudio'
  | 'ollama'

export type ByokProviderDef = {
  id: ByokProviderId
  label: string
  baseUrl: string
  defaultModelMenor: string
  defaultModelMaior: string
  keyPlaceholder: string
  /** Alguns provedores locais não exigem chave real. */
  optionalKey?: boolean
  hint?: string
}

export const BYOK_PROVIDERS: ByokProviderDef[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModelMenor: 'gpt-4o-mini',
    defaultModelMaior: 'gpt-4o',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModelMenor: 'llama-3.1-8b-instant',
    defaultModelMaior: 'openai/gpt-oss-120b',
    keyPlaceholder: 'gsk_...',
  },
  {
    id: 'together',
    label: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModelMenor: 'meta-llama/Llama-3.2-3B-Instruct-Turbo',
    defaultModelMaior: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    keyPlaceholder: 'together_...',
  },
  {
    id: 'gemini',
    label: 'Gemini (Google)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    defaultModelMenor: 'gemini-2.0-flash-lite',
    defaultModelMaior: 'gemini-2.0-flash',
    keyPlaceholder: 'AIza...',
  },
  {
    id: 'claude',
    label: 'Claude (OpenRouter)',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModelMenor: 'anthropic/claude-3-haiku',
    defaultModelMaior: 'anthropic/claude-sonnet-4',
    keyPlaceholder: 'sk-or-...',
    hint: 'Chave OpenRouter com modelos Anthropic.',
  },
  {
    id: 'lmstudio',
    label: 'LM Studio',
    baseUrl: 'http://127.0.0.1:1234/v1',
    defaultModelMenor: 'local',
    defaultModelMaior: 'local',
    keyPlaceholder: 'lm-studio (opcional)',
    optionalKey: true,
  },
  {
    id: 'ollama',
    label: 'Ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    defaultModelMenor: 'llama3.2',
    defaultModelMaior: 'llama3.2',
    keyPlaceholder: 'ollama (opcional)',
    optionalKey: true,
  },
]

export function getByokProvider(id: string): ByokProviderDef | undefined {
  return BYOK_PROVIDERS.find((p) => p.id === id)
}
