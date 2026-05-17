const {
  consumeChatCompletionSse,
  finalizeStreamedChatResult,
} = require('./chatCompletionSse.cjs')

const DEFAULT_MODEL = 'baidu/cobuddy:free'
const DEFAULT_VISION_MODEL = 'google/gemma-4-31b-it:free'
const DEFAULT_EMBED_MODEL = 'thenlper/gte-base'
const DEFAULT_BASE = 'https://openrouter.ai/api/v1'
const CHAT_PATH = '/chat/completions'
const EMBED_PATH = '/embeddings'
const DEFAULT_CHAT_FETCH_TIMEOUT_MS = 180_000

function apiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() || ''
}

function apiBase() {
  return (process.env.OPENROUTER_BASE_URL || DEFAULT_BASE).trim().replace(/\/+$/, '')
}

function chatEndpoint() {
  return `${apiBase()}${CHAT_PATH}`
}

function embedEndpoint() {
  return `${apiBase()}${EMBED_PATH}`
}

function embedModel() {
  return process.env.OPENROUTER_EMBED_MODEL?.trim() || DEFAULT_EMBED_MODEL
}

function chatFetchTimeoutMs() {
  const n = Number(
    process.env.OPENROUTER_CHAT_TIMEOUT_MS ??
      process.env.GROQ_CHAT_TIMEOUT_MS,
  )
  if (!Number.isNaN(n) && n >= 15_000 && n <= 600_000) return n
  return DEFAULT_CHAT_FETCH_TIMEOUT_MS
}

/**
 * @param {string} url
 * @param {RequestInit} init
 * @param {number} timeoutMs
 */
async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

function sanitizeToolArgumentsForEcho(name, args) {
  if (name !== 'save_memory' || typeof args !== 'string') return args
  try {
    const o = JSON.parse(args)
    if (!o || typeof o !== 'object' || Array.isArray(o)) return args
    const v = o.replace_of_note_id
    if (v === null || v === undefined) {
      delete o.replace_of_note_id
    } else if (typeof v === 'string' && !v.trim()) {
      delete o.replace_of_note_id
    }
    return JSON.stringify(o)
  } catch {
    return args
  }
}

/**
 * @param {unknown} msg
 */
function extractReasoningFromMessage(msg) {
  if (!msg || typeof msg !== 'object') return ''
  const m = /** @type {Record<string, unknown>} */ (msg)
  const parts = []

  const direct =
    m.reasoning_content ?? m.reasoning ?? m.thinking ?? ''
  if (direct !== null && direct !== undefined && String(direct).trim()) {
    parts.push(String(direct))
  }

  const details = m.reasoning_details
  if (Array.isArray(details)) {
    for (const rd of details) {
      if (!rd || typeof rd !== 'object') continue
      const row = /** @type {Record<string, unknown>} */ (rd)
      const chunk =
        row.text ??
        row.content ??
        (typeof row.summary === 'string' ? row.summary : '')
      if (chunk) parts.push(String(chunk))
    }
  } else if (typeof details === 'string' && details.trim()) {
    parts.push(details)
  }

  return parts.join('\n').trim()
}

function parseAssistantMessage(msg) {
  const textRaw = msg.content
  const text =
    textRaw === null || textRaw === undefined ? '' : String(textRaw)
  const reasoningContent = extractReasoningFromMessage(msg)
  const rawCalls = msg.tool_calls
  /** @type {{ id: string; type: string; function: { name: string; arguments: string } }[]} */
  const toolCalls = []
  if (Array.isArray(rawCalls)) {
    for (const tc of rawCalls) {
      if (!tc || typeof tc !== 'object') continue
      const id = typeof tc.id === 'string' ? tc.id : ''
      const fn = tc.function
      if (!fn || typeof fn !== 'object') continue
      const name = typeof fn.name === 'string' ? fn.name : ''
      const argsRaw =
        typeof fn.arguments === 'string' ? fn.arguments : '{}'
      const args =
        name === 'save_memory'
          ? sanitizeToolArgumentsForEcho(name, argsRaw)
          : argsRaw
      if (!id || !name) continue
      toolCalls.push({
        id,
        type: 'function',
        function: { name, arguments: args },
      })
    }
  }
  return { text, reasoningContent, toolCalls }
}

/**
 * @param {{ llm_provider?: unknown; llm_model?: unknown }} payload
 */
function resolveModel(payload) {
  const p = String(payload.llm_provider || '').toLowerCase()
  if (p === 'openrouter') {
    const m = String(payload.llm_model || '').trim()
    if (m) return m
  }
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL
}

function requestHeaders(key) {
  /** @type {Record<string, string>} */
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  }
  const referer = process.env.OPENROUTER_HTTP_REFERER?.trim()
  const title = process.env.OPENROUTER_APP_TITLE?.trim() || 'Luna v1'
  if (referer) headers['HTTP-Referer'] = referer
  if (title) headers['X-Title'] = title
  return headers
}

const REASONING_EFFORTS = new Set([
  'xhigh',
  'high',
  'medium',
  'low',
  'minimal',
  'none',
])

/**
 * @param {Record<string, unknown>} chatBody
 * @param {{ reasoning_enabled?: unknown }} payload
 */
/**
 * Modelos com thinking nativo (ex. Ring) ignoram effort:none — não desactivar.
 * @param {string} model
 */
function openRouterModelHasNativeReasoning(model) {
  const m = String(model || '').toLowerCase()
  if (/ring|inclusionai\/ring|mai-ds-r|\/thinking|deepseek.*r1/i.test(m)) {
    return true
  }
  const extra = (process.env.OPENROUTER_NATIVE_REASONING_MODELS || '')
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return extra.some((pat) => m.includes(pat) || pat.includes(m))
}

/**
 * @param {Record<string, unknown>} chatBody
 * @param {{ reasoning_enabled?: unknown }} payload
 */
function nativeReasoningEffortWhenHidden() {
  const effort = String(
    process.env.OPENROUTER_REASONING_EFFORT_OFF ||
      process.env.OPENROUTER_REASONING_EFFORT ||
      'low',
  )
    .trim()
    .toLowerCase()
  return REASONING_EFFORTS.has(effort) && effort !== 'none' ? effort : 'low'
}

/**
 * Ring e similares são modelos de reasoning nativo: `effort: none` ou omitir
 * `reasoning` costuma devolver stream vazio → erro «nenhum provedor».
 * Com Pensamento desligado na UI: reasoning interno + exclude (não mostrar tokens).
 */
function applyOpenRouterReasoning(chatBody, payload) {
  const model = String(chatBody.model || '')
  const native = openRouterModelHasNativeReasoning(model)

  if (payload.reasoning_enabled === true) {
    const effort = String(process.env.OPENROUTER_REASONING_EFFORT || '')
      .trim()
      .toLowerCase()
    /** @type {Record<string, unknown>} */
    const reasoning = { enabled: true, exclude: false }
    if (REASONING_EFFORTS.has(effort)) reasoning.effort = effort
    chatBody.reasoning = reasoning
    return
  }

  if (payload.reasoning_enabled === false) {
    if (native) {
      chatBody.reasoning = {
        enabled: true,
        exclude: true,
        effort: nativeReasoningEffortWhenHidden(),
      }
    } else {
      chatBody.reasoning = { effort: 'none' }
    }
    return
  }

  if (native) {
    chatBody.reasoning = { enabled: true, exclude: false }
  }
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true; chatBody: Record<string, unknown>; model: string } | { ok: false; error: string }}
 */
function buildOpenRouterChatBody(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Pedido inválido.' }
  }

  const payload = /** @type {{ messages?: unknown; temperature?: unknown; max_completion_tokens?: unknown; max_tokens?: unknown; tools?: unknown; tool_choice?: unknown; reasoning_enabled?: unknown; llm_provider?: unknown; llm_model?: unknown }} */ (
    raw
  )
  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    return { ok: false, error: 'Nenhuma mensagem enviada ao modelo.' }
  }

  let temperature = 0.6
  if (
    typeof payload.temperature === 'number' &&
    !Number.isNaN(payload.temperature)
  ) {
    temperature = Math.min(2, Math.max(0, payload.temperature))
  } else {
    const envT = Number(process.env.OPENROUTER_TEMPERATURE)
    if (!Number.isNaN(envT)) {
      temperature = Math.min(2, Math.max(0, envT))
    }
  }

  const model = resolveModel(payload)

  /** @type {Record<string, unknown>} */
  const chatBody = {
    model,
    messages: payload.messages,
    temperature,
  }

  const maxIn =
    typeof payload.max_completion_tokens === 'number'
      ? payload.max_completion_tokens
      : typeof payload.max_tokens === 'number'
        ? payload.max_tokens
        : NaN
  if (!Number.isNaN(maxIn)) {
    chatBody.max_tokens = Math.min(8192, Math.max(16, Math.floor(maxIn)))
  }

  if (Array.isArray(payload.tools) && payload.tools.length > 0) {
    chatBody.tools = payload.tools
  }
  if (payload.tool_choice !== undefined && payload.tool_choice !== null) {
    chatBody.tool_choice = payload.tool_choice
  }

  applyOpenRouterReasoning(chatBody, payload)

  return { ok: true, chatBody, model }
}

/**
 * @param {unknown} raw
 * @param {(evt: { type: string; delta?: string; full?: string }) => void} emit
 */
async function openrouterChatStream(raw, emit) {
  const key = apiKey()
  if (!key) {
    return {
      ok: false,
      error:
        'Falta OPENROUTER_API_KEY no `.env` (https://openrouter.ai/keys).',
    }
  }

  const built = buildOpenRouterChatBody(raw)
  if (!built.ok) return built

  const chatBody = { ...built.chatBody, stream: true }
  const timeoutMs = chatFetchTimeoutMs()

  try {
    const res = await fetchWithTimeout(
      chatEndpoint(),
      {
        method: 'POST',
        headers: requestHeaders(key),
        body: JSON.stringify(chatBody),
      },
      timeoutMs,
    )

    if (!res.ok) {
      const bodyText = await res.text()
      let detail = bodyText.slice(0, 900)
      try {
        const parsed = JSON.parse(bodyText)
        if (parsed?.error?.message) detail = String(parsed.error.message)
        else if (parsed?.error) detail = String(parsed.error)
      } catch {
        /* manter detail */
      }
      return { ok: false, error: `OpenRouter (${res.status}): ${detail}` }
    }

    const streamed = await consumeChatCompletionSse(res, emit, {
      provider: 'openrouter',
      parseMessage: parseAssistantMessage,
    })

    return finalizeStreamedChatResult(
      streamed,
      'openrouter',
      'Resposta vazia do OpenRouter. O modelo pode não suportar tools.',
    )
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'AbortError') {
      return {
        ok: false,
        error: `Tempo limite (${Math.round(timeoutMs / 1000)}s) na chamada ao OpenRouter.`,
      }
    }
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

/**
 * @param {unknown} raw
 */
async function openrouterChat(raw) {
  const key = apiKey()
  if (!key) {
    return {
      ok: false,
      error:
        'Falta OPENROUTER_API_KEY no `.env` (https://openrouter.ai/keys).',
    }
  }

  const built = buildOpenRouterChatBody(raw)
  if (!built.ok) return built

  const chatBody = built.chatBody
  const timeoutMs = chatFetchTimeoutMs()
  try {
    const res = await fetchWithTimeout(
      chatEndpoint(),
      {
        method: 'POST',
        headers: requestHeaders(key),
        body: JSON.stringify(chatBody),
      },
      timeoutMs,
    )

    const bodyText = await res.text()

    if (!res.ok) {
      let detail = bodyText.slice(0, 900)
      try {
        const parsed = JSON.parse(bodyText)
        if (parsed?.error?.message) detail = String(parsed.error.message)
        else if (parsed?.error) detail = String(parsed.error)
      } catch {
        /* manter detail */
      }
      return { ok: false, error: `OpenRouter (${res.status}): ${detail}` }
    }

    const data = JSON.parse(bodyText)
    const msg = data?.choices?.[0]?.message ?? {}
    const { text, reasoningContent, toolCalls } = parseAssistantMessage(msg)

    if (toolCalls.length > 0) {
      return {
        ok: true,
        text: text.trim(),
        toolCalls,
        reasoningContent: reasoningContent.trim() || undefined,
      }
    }
    if (!String(text).trim()) {
      return {
        ok: false,
        error:
          'Resposta vazia do OpenRouter. O modelo pode não suportar tools.',
      }
    }
    return {
      ok: true,
      text: String(text),
      reasoningContent: reasoningContent.trim() || undefined,
    }
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'AbortError') {
      return {
        ok: false,
        error: `Tempo limite (${Math.round(timeoutMs / 1000)}s) na chamada ao OpenRouter.`,
      }
    }
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

function visionModel() {
  return process.env.OPENROUTER_VISION_MODEL?.trim() || DEFAULT_VISION_MODEL
}

/**
 * Extrai texto de content string ou multimodal (OpenAI-style).
 * @param {unknown} content
 */
function messageContentToText(content) {
  if (content === null || content === undefined) return ''
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return String(content)
  const parts = []
  for (const part of content) {
    if (!part || typeof part !== 'object') continue
    const p = /** @type {Record<string, unknown>} */ (part)
    if (p.type === 'text' && typeof p.text === 'string') parts.push(p.text)
  }
  return parts.join('\n').trim()
}

/**
 * Lunar Vision via OpenRouter (multimodal chat/completions).
 * @param {unknown} raw
 */
async function openrouterVisionDescribe(raw) {
  const key = apiKey()
  if (!key) {
    return { ok: false, error: 'OPENROUTER_API_KEY não configurada.' }
  }

  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Pedido inválido.' }
  }

  const payload = /** @type {{ images?: unknown; userCaption?: unknown }} */ (raw)
  const imagesIn = payload.images
  const userCaption =
    typeof payload.userCaption === 'string' ? payload.userCaption.trim() : ''

  if (!Array.isArray(imagesIn) || imagesIn.length === 0) {
    return { ok: false, error: 'Nenhuma imagem enviada.' }
  }
  if (imagesIn.length > 5) {
    return { ok: false, error: 'No máximo 5 imagens por mensagem.' }
  }

  const model = visionModel()
  const instruction = `Você é o modelo de VISÃO da Luna. Descreva TODAS as imagens em português do Brasil, com detalhe objetivo: layout, texto legível (OCR), UI, cores, números e contexto útil para outro assistente responder.
Se houver várias imagens, use seções "Imagem 1:", "Imagem 2:", etc.

Comentário do usuário: ${userCaption || '(nenhum)'}`

  /** @type {({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[]} */
  const content = [{ type: 'text', text: instruction }]

  for (const item of imagesIn) {
    if (!item || typeof item !== 'object') continue
    const o = /** @type {{ mime?: unknown; dataBase64?: unknown }} */ (item)
    const mime =
      typeof o.mime === 'string' && o.mime.startsWith('image/')
        ? o.mime
        : 'image/jpeg'
    const b64 =
      typeof o.dataBase64 === 'string' ? o.dataBase64.replace(/\s/g, '') : ''
    if (!b64.length) continue
    const url = `data:${mime};base64,${b64}`
    if (url.length > 4_500_000) {
      return {
        ok: false,
        error:
          'Imagem grande demais para a API (~4MB em base64). Reduza o tamanho.',
      }
    }
    content.push({ type: 'image_url', image_url: { url } })
  }

  if (content.length < 2) {
    return { ok: false, error: 'Nenhuma imagem válida.' }
  }

  const timeoutMs = chatFetchTimeoutMs()
  try {
    const res = await fetchWithTimeout(
      chatEndpoint(),
      {
        method: 'POST',
        headers: requestHeaders(key),
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content }],
          temperature: 0.25,
          max_tokens: 2048,
        }),
      },
      timeoutMs,
    )

    const bodyText = await res.text()
    if (!res.ok) {
      let detail = bodyText.slice(0, 900)
      try {
        const parsed = JSON.parse(bodyText)
        if (parsed?.error?.message) detail = String(parsed.error.message)
      } catch {
        /* keep */
      }
      return {
        ok: false,
        error: `OpenRouter visão (${res.status}): ${detail}`,
      }
    }

    const data = JSON.parse(bodyText)
    const msg = data?.choices?.[0]?.message
    const text = messageContentToText(msg?.content)
    if (!text.trim()) {
      return { ok: false, error: 'Resposta vazia do modelo de visão.' }
    }
    return { ok: true, text }
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'AbortError') {
      return {
        ok: false,
        error: `Tempo limite (${Math.round(timeoutMs / 1000)}s) na visão OpenRouter.`,
      }
    }
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

/**
 * @param {string | string[]} input
 */
async function openrouterEmbed(input) {
  const key = apiKey()
  if (!key) {
    return {
      ok: false,
      error:
        'Falta OPENROUTER_API_KEY no `.env` (https://openrouter.ai/keys).',
    }
  }

  const parts = Array.isArray(input) ? input : [input]
  if (!parts.length) {
    return { ok: false, error: 'Nenhum texto para gerar embeddings.' }
  }

  const model = embedModel()

  try {
    const res = await fetch(embedEndpoint(), {
      method: 'POST',
      headers: requestHeaders(key),
      body: JSON.stringify({ model, input: parts }),
    })

    const bodyText = await res.text()
    if (!res.ok) {
      let detail = bodyText.slice(0, 900)
      try {
        const parsed = JSON.parse(bodyText)
        if (parsed?.error?.message) detail = String(parsed.error.message)
      } catch {
        /* keep */
      }
      return { ok: false, error: `OpenRouter embeddings (${res.status}): ${detail}` }
    }

    const data = JSON.parse(bodyText)
    const list = data?.data
    if (!Array.isArray(list)) {
      return { ok: false, error: 'Resposta de embeddings inválida.' }
    }

    const ordered = [...list].sort(
      (a, b) => (a.index ?? 0) - (b.index ?? 0),
    )
    const vectors = []
    for (const item of ordered) {
      const emb = item?.embedding
      if (!Array.isArray(emb) || emb.length === 0) {
        return { ok: false, error: 'Vetor de embedding ausente.' }
      }
      vectors.push(emb.map((x) => Number(x)))
    }

    return { ok: true, vectors }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

module.exports = {
  openrouterChat,
  openrouterChatStream,
  openrouterVisionDescribe,
  openrouterEmbed,
  buildOpenRouterChatBody,
}
