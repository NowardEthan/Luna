import {
  fetchLunaModelCatalog,
  readSelectedModelId,
  resolveSelectedOption,
  selectionFromOption,
  type LunaModelOption,
} from './llmModelSelection'
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
  return { provider: 'ollama', model: 'qwen/qwen2.5-vl-7b' }
}

/** Carrega catálogo sob demanda (só modo IDE / Finanças — não no boot do chat). */
export async function ensureIdeLlmSelection(): Promise<LlmSelection | undefined> {
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
  if (!cachedCatalog?.length) return undefined
  const opt = resolveSelectedOption(cachedCatalog, readSelectedModelId())
  return opt ? `${opt.provider} · ${opt.label}` : undefined
}
