/** @typedef {{ id: string; provider: string; model: string; label: string }} LunaModelEntry */

const VALID_PROVIDERS = new Set([
  'openrouter',
  'groq',
  'together',
  'ollama',
])

/**
 * Uma entrada: provider|model_id|rótulo (rótulo opcional).
 * Várias entradas na mesma linha em grupos de 3 (ou 2 sem rótulo):
 * provider|model|rótulo|provider|model|rótulo|…
 * Também aceita newline ou ;; entre blocos.
 * @param {string} chunk
 * @returns {LunaModelEntry[]}
 */
function parseLunaModelsChunk(chunk) {
  const parts = chunk.split('|').map((p) => p.trim())
  /** @type {LunaModelEntry[]} */
  const entries = []
  let i = 0
  while (i < parts.length) {
    const provider = parts[i].toLowerCase()
    if (!VALID_PROVIDERS.has(provider)) {
      i += 1
      continue
    }
    const model = parts[i + 1]
    if (!model) break
    const next = parts[i + 2]
    const hasLabel =
      next !== undefined && !VALID_PROVIDERS.has(next)
    const label = (hasLabel ? next : model).trim() || model
    entries.push({ id: `${provider}|${model}`, provider, model, label })
    i += hasLabel ? 3 : 2
  }
  return entries
}

/**
 * @param {string} raw
 * @returns {LunaModelEntry[]}
 */
function parseLunaModelsEnv(raw) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return []
  const chunks = raw
    .split(/\n|;;/)
    .map((s) => s.trim())
    .filter(Boolean)
  /** @type {LunaModelEntry[]} */
  const out = []
  for (const chunk of chunks) {
    for (const entry of parseLunaModelsChunk(chunk)) {
      if (out.some((e) => e.id === entry.id)) continue
      out.push(entry)
    }
  }
  return out
}

/** @param {LunaModelEntry} entry */
function isProviderAvailable(entry) {
  switch (entry.provider) {
    case 'openrouter':
      return Boolean(process.env.OPENROUTER_API_KEY?.trim())
    case 'groq':
      return Boolean(process.env.GROQ_API_KEY?.trim())
    case 'together':
      return Boolean(process.env.TOGETHER_API_KEY?.trim())
    case 'ollama': {
      const v = (process.env.OLLAMA_ENABLED ?? '1').toLowerCase()
      return v !== '0' && v !== 'false'
    }
    default:
      return false
  }
}

/** @returns {LunaModelEntry[]} */
function buildAutoCatalog() {
  /** @type {LunaModelEntry[]} */
  const out = []

  const orModel = process.env.OPENROUTER_MODEL?.trim()
  if (process.env.OPENROUTER_API_KEY?.trim() && orModel) {
    out.push({
      id: `openrouter|${orModel}`,
      provider: 'openrouter',
      model: orModel,
      label: `OpenRouter · ${orModel}`,
    })
  }

  const groqModel = process.env.GROQ_MODEL?.trim()
  if (process.env.GROQ_API_KEY?.trim() && groqModel) {
    out.push({
      id: `groq|${groqModel}`,
      provider: 'groq',
      model: groqModel,
      label: `Groq · ${groqModel}`,
    })
  }

  const togetherModel = process.env.TOGETHER_MODEL?.trim()
  if (process.env.TOGETHER_API_KEY?.trim() && togetherModel) {
    out.push({
      id: `together|${togetherModel}`,
      provider: 'together',
      model: togetherModel,
      label: `Together · ${togetherModel}`,
    })
  }

  const ollamaModel = process.env.OLLAMA_MODEL?.trim()
  if (isProviderAvailable({ provider: 'ollama', model: ollamaModel || '' }) && ollamaModel) {
    out.push({
      id: `ollama|${ollamaModel}`,
      provider: 'ollama',
      model: ollamaModel,
      label: `Ollama · ${ollamaModel}`,
    })
  }

  return out
}

/** @param {LunaModelEntry[]} entries */
function filterAvailable(entries) {
  return entries.filter(isProviderAvailable)
}

/**
 * @param {{ lunarCloud?: boolean }} [opts]
 * @returns {{ ok: true; models: LunaModelEntry[] } | { ok: false; error: string }}
 */
function listLunaModels(opts = {}) {
  const lunarCloud = Boolean(opts.lunarCloud)
  const configured = parseLunaModelsEnv(process.env.LUNA_MODELS || '')
  let models = filterAvailable(
    configured.length > 0 ? configured : buildAutoCatalog(),
  )
  if (lunarCloud) {
    models = models.filter((m) => m.provider !== 'ollama')
  } else {
    models = models.filter((m) => m.provider === 'ollama')
  }
  if (!models.length) {
    if (lunarCloud) {
      return {
        ok: false,
        error:
          'Nenhum modelo cloud no servidor. Defina OPENROUTER_API_KEY (ou GROQ/TOGETHER) no `.env`.',
      }
    }
    return {
      ok: false,
      error:
        'Ollama indisponível. Active OLLAMA_ENABLED ou inicie sessão Lunar para modelos cloud.',
    }
  }
  return { ok: true, models }
}

/**
 * @param {unknown} raw
 * @returns {{ provider: string; model: string } | null}
 */
function parseLlmSelection(raw) {
  if (!raw || typeof raw !== 'object') return null
  const p = /** @type {{ llm_provider?: unknown; llm_model?: unknown }} */ (raw)
  const provider = String(p.llm_provider ?? '')
    .trim()
    .toLowerCase()
  const model = String(p.llm_model ?? '').trim()
  if (!provider || !model || !VALID_PROVIDERS.has(provider)) return null
  return { provider, model }
}

/**
 * @param {{ provider: string; model: string }} selection
 * @param {Record<string, unknown>} raw
 */
function withLlmSelection(selection, raw) {
  return {
    ...raw,
    llm_provider: selection.provider,
    llm_model: selection.model,
  }
}

module.exports = {
  listLunaModels,
  parseLlmSelection,
  withLlmSelection,
  parseLunaModelsEnv,
}
