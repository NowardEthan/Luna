const {
  togetherChat,
  togetherChatStream,
  togetherVisionDescribe,
  togetherEmbed,
} = require('./togetherHandlers.cjs')
const {
  groqChat,
  groqChatStream,
  groqVisionDescribe,
  groqEmbed,
} = require('./groqHandlers.cjs')
const {
  ollamaChat,
  ollamaChatStream,
  ollamaEmbed,
  ollamaVisionDescribe,
  ollamaEnabled,
} = require('./ollamaHandlers.cjs')
const {
  openrouterChat,
  openrouterChatStream,
  openrouterVisionDescribe,
  openrouterEmbed,
} = require('./openrouterHandlers.cjs')
const {
  listLunaModels,
  parseLlmSelection,
  withLlmSelection,
} = require('./lunaModelCatalog.cjs')

function hasTogetherKey() {
  return Boolean(process.env.TOGETHER_API_KEY?.trim())
}

function hasGroqKey() {
  return Boolean(process.env.GROQ_API_KEY?.trim())
}

function hasOpenRouterKey() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim())
}

function fallbackEnabled() {
  const v = process.env.LLM_FALLBACK_ENABLED ?? '1'
  return v !== '0' && v !== 'false'
}

function cloudProvidersAllowed() {
  const v = process.env.LLM_CLOUD_ENABLED
  if (v === '0' || v === 'false') return false
  const localOnly = process.env.LLM_LOCAL_ONLY
  if (localOnly === '1' || localOnly === 'true') return false
  return true
}

function streamingEnabled() {
  const v = process.env.LLM_STREAMING_ENABLED ?? '1'
  return v !== '0' && v !== 'false'
}

function primaryProvider() {
  const p = (process.env.LLM_PRIMARY || 'groq').toLowerCase()
  if (p === 'ollama' || p === 'local') return 'ollama'
  if (p === 'openrouter') return 'openrouter'
  if (p === 'groq') return 'groq'
  return 'together'
}

function providerOrder() {
  const primary = primaryProvider()
  if (!cloudProvidersAllowed()) return ['ollama']
  if (primary === 'openrouter') {
    return ['openrouter', 'groq', 'together', 'ollama']
  }
  if (primary === 'ollama') return ['ollama', 'openrouter', 'groq', 'together']
  if (primary === 'groq') return ['groq', 'openrouter', 'together', 'ollama']
  return ['together', 'openrouter', 'groq', 'ollama']
}

/**
 * @param {{ ok?: boolean; error?: string }} result
 */
function shouldTryFallback(result) {
  if (!result || result.ok) return false
  const e = String(result.error || '').toLowerCase()
  if (/pedido inválido|nenhuma mensagem enviada|nenhuma imagem válida/i.test(e)) {
    return false
  }
  return true
}

/**
 * @param {Record<string, unknown>} res
 * @param {'together' | 'groq' | 'ollama' | 'openrouter'} provider
 * @param {boolean} usedFallback
 */
function tagSuccess(res, provider, usedFallback) {
  if (!res.ok) return res
  const label =
    provider === 'ollama'
      ? 'Ollama (local)'
      : provider === 'groq'
        ? 'Groq'
        : provider === 'openrouter'
          ? 'OpenRouter'
          : 'Together'
  return {
    ...res,
    provider,
    usedFallback,
    ...(usedFallback
      ? { fallbackNote: `Resposta via ${label} (fallback).` }
      : {}),
  }
}

/**
 * @param {Array<{ id: 'together' | 'groq' | 'ollama' | 'openrouter'; run: () => Promise<{ ok: boolean; error?: string }> }>} order
 */
async function runProviderChain(order) {
  let last = null

  for (let i = 0; i < order.length; i++) {
    const { id, run } = order[i]
    const res = await run()
    if (res.ok) {
      return tagSuccess(res, id, i > 0)
    }
    last = res
    if (!fallbackEnabled() || !cloudProvidersAllowed()) return res
    if (!shouldTryFallback(res)) return res
    if (i === order.length - 1) return res
  }

  return (
    last || {
      ok: false,
      error:
        'Nenhum provedor LLM disponível. Configure Ollama ou chaves cloud no `.env`.',
    }
  )
}

function chatRunners(raw) {
  return {
    ollama: () =>
      ollamaEnabled()
        ? ollamaChat(raw)
        : Promise.resolve({
            ok: false,
            error: 'Ollama desligado (OLLAMA_ENABLED=0).',
          }),
    openrouter: () =>
      hasOpenRouterKey()
        ? openrouterChat(raw)
        : Promise.resolve({
            ok: false,
            error: 'OPENROUTER_API_KEY não configurada.',
          }),
    groq: () =>
      hasGroqKey()
        ? groqChat(raw)
        : Promise.resolve({
            ok: false,
            error: 'GROQ_API_KEY não configurada.',
          }),
    together: () =>
      hasTogetherKey()
        ? togetherChat(raw)
        : Promise.resolve({
            ok: false,
            error: 'TOGETHER_API_KEY não configurada.',
          }),
  }
}

/**
 * @param {unknown} raw
 */
function buildChatOrder(raw) {
  const runners = chatRunners(raw)
  return providerOrder().map((id) => ({
    id,
    run: runners[id],
  }))
}

/**
 * @param {unknown} raw
 * @param {{ provider: string; model: string }} selection
 */
async function llmChatSelected(raw, selection) {
  const payload =
    raw && typeof raw === 'object'
      ? withLlmSelection(selection, /** @type {Record<string, unknown>} */ (raw))
      : raw
  const runners = chatRunners(payload)
  const id = /** @type {'together' | 'groq' | 'ollama' | 'openrouter'} */ (
    selection.provider
  )
  const run = runners[id]
  if (!run) {
    return {
      ok: false,
      error: `Provedor desconhecido: ${selection.provider}`,
    }
  }
  return tagSuccess(await run(), id, false)
}

/**
 * @param {unknown} raw
 */
async function llmChat(raw) {
  const selection = parseLlmSelection(raw)
  if (selection) {
    const res = await llmChatSelected(raw, selection)
    if (
      res.ok ||
      !fallbackEnabled() ||
      !cloudProvidersAllowed() ||
      !shouldTryFallback(res)
    ) {
      return res
    }
  }
  return runProviderChain(buildChatOrder(raw))
}

/**
 * @param {unknown} raw
 * @param {(evt: { type: string; delta?: string; full?: string }) => void} emit
 */
/**
 * @param {unknown} raw
 * @param {(evt: { type: string; delta?: string; full?: string }) => void} emit
 * @param {{ provider: string; model: string }} selection
 */
async function llmChatStreamSelected(raw, emit, selection) {
  const payload =
    raw && typeof raw === 'object'
      ? withLlmSelection(selection, /** @type {Record<string, unknown>} */ (raw))
      : raw
  const id = /** @type {'together' | 'groq' | 'ollama' | 'openrouter'} */ (
    selection.provider
  )
  /** @type {Record<string, (p: unknown, e: typeof emit) => Promise<unknown>>} */
  const streamers = {
    ollama: ollamaChatStream,
    openrouter: openrouterChatStream,
    groq: groqChatStream,
    together: togetherChatStream,
  }
  const run = streamers[id]
  if (!run) {
    return {
      ok: false,
      error: `Provedor desconhecido: ${selection.provider}`,
    }
  }
  return tagSuccess(await run(payload, emit), id, false)
}

/**
 * Emite resposta completa em bloco (fallback sem SSE).
 * @param {Awaited<ReturnType<typeof llmChat>>} res
 * @param {(evt: { type: string; delta?: string; full?: string }) => void} emit
 */
function emitBufferedStreamResult(res, emit) {
  if (res.ok && res.text) {
    emit({ type: 'content', delta: res.text, full: res.text })
  }
  if (res.ok && res.reasoningContent) {
    emit({
      type: 'reasoning',
      delta: res.reasoningContent,
      full: res.reasoningContent,
    })
  }
}

async function llmChatStream(raw, emit) {
  const selection = parseLlmSelection(raw)

  const streamPayload = selection
    ? withLlmSelection(
        selection,
        raw && typeof raw === 'object'
          ? /** @type {Record<string, unknown>} */ (raw)
          : {},
      )
    : raw

  if (!streamingEnabled()) {
    const res = selection
      ? await llmChatSelected(raw, selection)
      : await llmChat(raw)
    emitBufferedStreamResult(res, emit)
    return res
  }

  if (!ollamaEnabled() && !cloudProvidersAllowed()) {
    return {
      ok: false,
      error: 'Nenhum provedor LLM disponível para streaming.',
    }
  }

  if (!cloudProvidersAllowed() || primaryProvider() === 'ollama') {
    return ollamaChatStream(streamPayload, emit)
  }

  return tryStreamAttempts(raw, emit, buildStreamAttempts(selection))
}

/**
 * @param {'openrouter' | 'groq' | 'together' | 'ollama'} id
 */
function resolveDefaultModelForProvider(id) {
  if (id === 'openrouter') return process.env.OPENROUTER_MODEL?.trim() || ''
  if (id === 'groq') return process.env.GROQ_MODEL?.trim() || ''
  if (id === 'together') return process.env.TOGETHER_MODEL?.trim() || ''
  if (id === 'ollama') return process.env.OLLAMA_MODEL?.trim() || ''
  return ''
}

/** @param {{ provider: string; model: string }} sel */
function selectionKey(sel) {
  return `${sel.provider}|${sel.model}`
}

/** Modelos que não devem entrar na cadeia de fallback (descontinuados, etc.). */
const BLOCKED_FALLBACK_MODELS = new Set(
  (process.env.LUNA_BLOCKED_MODELS || 'inclusionai/ring-2.6-1t:free,inclusionai/ring')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
)

function isBlockedFallbackModel(model) {
  return BLOCKED_FALLBACK_MODELS.has(String(model || '').trim().toLowerCase())
}

/**
 * Modelos do catálogo LUNA_MODELS + default do .env, sem repetir.
 * @param {'openrouter' | 'groq' | 'together' | 'ollama'} providerId
 * @param {string} [skipModel]
 * @returns {string[]}
 */
function modelsToTryForProvider(providerId, skipModel = '') {
  const catalog = listLunaModels()
  /** @type {string[]} */
  const fromCatalog = catalog.ok
    ? catalog.models
        .filter((m) => m.provider === providerId)
        .map((m) => m.model)
    : []
  const def = resolveDefaultModelForProvider(providerId)
  const seen = new Set()
  /** @type {string[]} */
  const out = []
  if (skipModel) seen.add(skipModel)
  for (const m of [...fromCatalog, def].filter(Boolean)) {
    if (seen.has(m)) continue
    if (isBlockedFallbackModel(m)) continue
    seen.add(m)
    out.push(m)
  }
  return out
}

/**
 * @param {unknown} raw
 * @param {(evt: { type: string; delta?: string; full?: string }) => void} emit
 * @param {{ provider: string; model: string }[]} attempts
 */
async function tryStreamAttempts(raw, emit, attempts) {
  /** @type {string[]} */
  const errors = []
  const tried = new Set()

  for (const sel of attempts) {
    if (isBlockedFallbackModel(sel.model)) continue
    const k = selectionKey(sel)
    if (tried.has(k)) continue
    tried.add(k)

    const res = await llmChatStreamSelected(raw, emit, sel)
    if (res.ok || !shouldTryFallback(res)) {
      return res
    }
    if (res.error) {
      errors.push(`• ${sel.provider} · ${sel.model}: ${res.error}`)
    }
    if (!fallbackEnabled() || !cloudProvidersAllowed()) {
      return res
    }
  }

  const detail =
    errors.length > 0
      ? `\n\n${errors.slice(0, 12).join('\n\n')}`
      : ''
  return {
    ok: false,
    error:
      'Não foi possível completar o streaming em nenhum provedor.' + detail,
    attemptErrors: errors,
  }
}

/**
 * Ordem de tentativas: modelo escolhido → outros do mesmo provedor → cadeia LUNA_MODELS.
 * @param {{ provider: string; model: string } | null} selection
 * @returns {{ provider: string; model: string }[]}
 */
function buildStreamAttempts(selection) {
  /** @type {{ provider: string; model: string }[]} */
  const attempts = []

  if (selection) {
    attempts.push(selection)
    for (const model of modelsToTryForProvider(
      /** @type {'openrouter' | 'groq' | 'together' | 'ollama'} */ (
        selection.provider
      ),
      selection.model,
    )) {
      attempts.push({ provider: selection.provider, model })
    }
  }

  const order = providerOrder()
  for (const id of order) {
    if (id === 'ollama' && !ollamaEnabled()) continue
    if (id === 'openrouter' && !hasOpenRouterKey()) continue
    if (id === 'groq' && !hasGroqKey()) continue
    if (id === 'together' && !hasTogetherKey()) continue
    for (const model of modelsToTryForProvider(id)) {
      attempts.push({ provider: id, model })
    }
  }

  return attempts
}

/**
 * @param {unknown} raw
 */
function buildVisionOrder(raw) {
  if (!cloudProvidersAllowed()) {
    return [
      {
        id: 'ollama',
        run: () => ollamaVisionDescribe(raw),
      },
    ]
  }

  /** @type {('openrouter' | 'groq' | 'together' | 'ollama')[]} */
  const visionOrder = []
  if (hasOpenRouterKey()) visionOrder.push('openrouter')
  if (hasGroqKey()) visionOrder.push('groq')
  if (hasTogetherKey()) visionOrder.push('together')
  if (ollamaEnabled()) visionOrder.push('ollama')

  if (!visionOrder.length) {
    return [
      {
        id: 'ollama',
        run: () =>
          Promise.resolve({
            ok: false,
            error:
              'Nenhum provedor de visão configurado (OPENROUTER_API_KEY, GROQ ou Together).',
          }),
      },
    ]
  }

  const runners = {
    openrouter: () =>
      hasOpenRouterKey()
        ? openrouterVisionDescribe(raw)
        : Promise.resolve({
            ok: false,
            error: 'OPENROUTER_API_KEY não configurada.',
          }),
    ollama: () => ollamaVisionDescribe(raw),
    groq: () =>
      hasGroqKey()
        ? groqVisionDescribe(raw)
        : Promise.resolve({
            ok: false,
            error: 'GROQ_API_KEY não configurada.',
          }),
    together: () =>
      hasTogetherKey()
        ? togetherVisionDescribe(raw)
        : Promise.resolve({
            ok: false,
            error: 'TOGETHER_API_KEY não configurada.',
          }),
  }
  return visionOrder.map((id) => ({
    id,
    run: runners[id],
  }))
}

/**
 * Ordem dedicada para embeddings (OpenRouter primeiro quando configurado).
 * @returns {('openrouter' | 'groq' | 'together' | 'ollama')[]}
 */
function embedProviderOrder() {
  const fromEnv = process.env.LLM_EMBED_ORDER?.trim()
  if (fromEnv) {
    return fromEnv
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((id) =>
        ['openrouter', 'groq', 'together', 'ollama'].includes(id),
      )
  }
  /** @type {('openrouter' | 'groq' | 'together' | 'ollama')[]} */
  const order = []
  if (hasOpenRouterKey()) order.push('openrouter')
  if (hasGroqKey()) order.push('groq')
  if (hasTogetherKey()) order.push('together')
  if (ollamaEnabled() && process.env.LUNA_EMBED_OLLAMA !== '0') {
    order.push('ollama')
  }
  return order
}

/**
 * @param {string | string[]} input
 */
function buildEmbedOrder(input) {
  const runners = {
    openrouter: () =>
      hasOpenRouterKey()
        ? openrouterEmbed(input)
        : Promise.resolve({
            ok: false,
            error: 'OPENROUTER_API_KEY não configurada.',
          }),
    ollama: () =>
      ollamaEnabled()
        ? ollamaEmbed(input)
        : Promise.resolve({ ok: false, error: 'Ollama desligado.' }),
    groq: () =>
      hasGroqKey()
        ? groqEmbed(input)
        : Promise.resolve({
            ok: false,
            error: 'GROQ_API_KEY não configurada.',
          }),
    together: () =>
      hasTogetherKey()
        ? togetherEmbed(input)
        : Promise.resolve({
            ok: false,
            error: 'TOGETHER_API_KEY não configurada.',
          }),
  }
  return embedProviderOrder().map((id) => ({
    id,
    run: runners[id],
  }))
}

/**
 * @param {unknown} raw
 */
async function llmVisionDescribe(raw) {
  return runProviderChain(buildVisionOrder(raw))
}

/**
 * @param {string | string[]} input
 */
async function llmEmbed(input) {
  return runProviderChain(buildEmbedOrder(input))
}

module.exports = {
  llmChat,
  llmChatStream,
  llmVisionDescribe,
  llmEmbed,
  listLunaModels,
  cloudProvidersAllowed,
  streamingEnabled,
}
