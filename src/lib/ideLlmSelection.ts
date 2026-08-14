import {
  fetchLunaModelCatalog,
  readSelectedModelId,
  resolveSelectedOption,
  selectionFromOption,
  type LunaModelOption,
} from './llmModelSelection'
import {
  readLlmRuntimePreference,
  resolveEffectiveLlmMode,
  fetchLlmRuntimeInfo,
} from './lunaLlmRuntimeMode'
import {
  localModelLabel,
  readLocalLlmProfile,
} from './lunaLocalLlmProfile'
import type { LlmSelection } from './togetherClient'

let cachedCatalog: LunaModelOption[] | null = null
let loadPromise: Promise<LunaModelOption[]> | null = null

async function loadCatalog(): Promise<LunaModelOption[]> {
  if (cachedCatalog) return cachedCatalog
  if (!loadPromise) {
    loadPromise = fetchLunaModelCatalog().then((res) => {
      cachedCatalog = res.ok ? res.models : []
      return cachedCatalog
    })
  }
  return loadPromise
}

/** Fallback local quando o catálogo ainda não carregou (LM Studio / Ollama). */
export function defaultLocalLlmSelection(): LlmSelection {
  const profile = readLocalLlmProfile()
  const model =
    profile.modeloMaior.trim() ||
    profile.modeloMenor.trim() ||
    'qwen/qwen2.5-vl-7b'
  return { provider: 'ollama', model }
}

async function isEffectiveLocalMode(): Promise<boolean> {
  const preference = readLlmRuntimePreference()
  if (preference === 'local') return true
  if (preference === 'cloud') return false
  const runtime = await fetchLlmRuntimeInfo()
  const detected = runtime?.ok ? runtime.detectedMode ?? 'cloud' : 'cloud'
  return resolveEffectiveLlmMode(detected, preference) === 'local'
}

/** Carrega catálogo sob demanda (só modo IDE / Finanças — não no boot do chat). */
export async function ensureIdeLlmSelection(): Promise<LlmSelection | undefined> {
  if (await isEffectiveLocalMode()) {
    const profile = readLocalLlmProfile()
    const model = profile.modeloMaior.trim() || profile.modeloMenor.trim()
    if (model) {
      return { provider: 'ollama', model }
    }
    const runtime = await fetchLlmRuntimeInfo()
    if (runtime?.ok && runtime.modeloMaior) {
      return { provider: 'ollama', model: runtime.modeloMaior }
    }
    return defaultLocalLlmSelection()
  }

  const models = await loadCatalog()
  const opt = resolveSelectedOption(models, readSelectedModelId())
  if (opt) return selectionFromOption(opt)
  if (models.length > 0) return selectionFromOption(models[0]!)
  return defaultLocalLlmSelection()
}

export async function loadIdeModelCatalog(): Promise<LunaModelOption[]> {
  return loadCatalog()
}

export function peekIdeModelLabel(): string | undefined {
  const preference = readLlmRuntimePreference()
  if (preference === 'local') {
    const profile = readLocalLlmProfile()
    const label = localModelLabel(profile)
    return label !== 'local' ? `Local · ${label}` : undefined
  }

  if (!cachedCatalog?.length) {
    const profile = readLocalLlmProfile()
    if (profile.modeloMaior) {
      return `Local · ${localModelLabel(profile)}`
    }
    return undefined
  }
  const opt = resolveSelectedOption(cachedCatalog, readSelectedModelId())
  return opt ? `${opt.provider} · ${opt.label}` : undefined
}

/** Label do composer quando o chat usa Luna Core em modo local. */
export function resolveLocalComposerModelLabel(): string | undefined {
  const preference = readLlmRuntimePreference()
  if (preference !== 'local') return undefined
  const profile = readLocalLlmProfile()
  const model = profile.modeloMaior.trim() || profile.modeloMenor.trim()
  if (!model) return 'Local · PAIA'
  return `Local · ${localModelLabel(profile)}`
}
