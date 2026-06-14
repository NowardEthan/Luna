import { isLunarCloudSession } from './lunarGate'
import { bridgeListModels } from './lunaBridge'

export type { LlmProviderId } from '../types/chat'
import type { LlmProviderId } from '../types/chat'

export type LunaModelOption = {
  id: string
  provider: LlmProviderId
  model: string
  label: string
}

export type LlmSelection = {
  provider: LlmProviderId
  model: string
}

const STORAGE_KEY = 'luna-selected-model-id'

/** Modelo por defeito no selector (Groq chat simples). */
export const PREFERRED_OPENROUTER_MODEL_ID =
  'groq|openai/gpt-oss-120b'

const LEGACY_RING_MODEL_ID = 'openrouter|inclusionai/ring-2.6-1t:free'
const LEGACY_COBUDDY_MODEL_ID = 'openrouter|baidu/cobuddy:free'
const LEGACY_DEEPSEEK_V4_MODEL_ID = 'openrouter|deepseek/deepseek-v4-flash:free'
const LEGACY_QWEN3_MODEL_ID = 'groq|qwen/qwen3-32b'

export function modelOptionId(provider: string, model: string): string {
  return `${provider}|${model}`
}

export function readSelectedModelId(): string | null {
  try {
    const v = globalThis.localStorage?.getItem(STORAGE_KEY)?.trim()
    return v || null
  } catch {
    return null
  }
}

export function writeSelectedModelId(id: string | null): void {
  try {
    if (!id) globalThis.localStorage?.removeItem(STORAGE_KEY)
    else globalThis.localStorage?.setItem(STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

export function selectionFromOption(
  option: LunaModelOption,
): LlmSelection {
  return { provider: option.provider, model: option.model }
}

export function resolveSelectedOption(
  models: LunaModelOption[],
  storedId: string | null,
): LunaModelOption | null {
  if (!models.length) return null

  const preferred = models.find((m) => m.id === PREFERRED_OPENROUTER_MODEL_ID)

  if (
    (storedId === LEGACY_RING_MODEL_ID ||
      storedId === LEGACY_COBUDDY_MODEL_ID ||
      storedId === LEGACY_DEEPSEEK_V4_MODEL_ID ||
      storedId === LEGACY_QWEN3_MODEL_ID) &&
    preferred
  ) {
    return preferred
  }

  if (storedId) {
    const hit = models.find((m) => m.id === storedId)
    if (hit) return hit
  }

  return preferred ?? models[0]
}

export async function fetchLunaModelCatalog(): Promise<
  | { ok: true; models: LunaModelOption[] }
  | { ok: false; error: string }
> {
  const res = await bridgeListModels({ lunarCloud: isLunarCloudSession() })
  if (res?.ok) {
    return { ok: true, models: (res.models ?? []) as LunaModelOption[] }
  }
  return {
    ok: false,
    error: res?.error || 'Não foi possível carregar modelos — inicie `npm run server` ou o Electron.',
  }
}

export function llmPayloadSelection(
  selection: LlmSelection | null | undefined,
): Record<string, string> | undefined {
  if (!selection?.provider || !selection.model) return undefined
  return {
    llm_provider: selection.provider,
    llm_model: selection.model,
  }
}
