const DEFAULT_MODEL = 'qwen3.5:9b'
const DEFAULT_EMBED_MODEL = 'nomic-embed-text'
const DEFAULT_BASE = 'http://127.0.0.1:11434/v1'
const DEFAULT_CHAT_FETCH_TIMEOUT_MS = 300_000

function baseUrl() {
  const raw = (process.env.OLLAMA_BASE_URL || DEFAULT_BASE).trim()
  return raw.replace(/\/+$/, '')
}

function chatEndpoint() {
  return `${baseUrl()}/chat/completions`
}

function embedEndpoint() {
  return `${baseUrl()}/embeddings`
}

function isOllamaCloudModel(model) {
  return String(model || '').includes(':cloud')
}

function chatFetchTimeoutMs(model) {
  if (isOllamaCloudModel(model)) {
    const cloud = Number(process.env.OLLAMA_CLOUD_TIMEOUT_MS)
    if (!Number.isNaN(cloud) && cloud >= 30_000 && cloud <= 900_000) {
      return cloud
    }
    return 600_000
  }
  const n = Number(
    process.env.OLLAMA_CHAT_TIMEOUT_MS ?? process.env.GROQ_CHAT_TIMEOUT_MS,
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

function parseAssistantMessage(msg) {
  const textRaw = msg.content
  const text =
    textRaw === null || textRaw === undefined ? '' : String(textRaw)
  const reasoningRaw =
    msg.reasoning ?? msg.reasoning_content ?? msg.thinking ?? ''
  const reasoningContent =
    reasoningRaw === null || reasoningRaw === undefined
      ? ''
      : String(reasoningRaw)
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

function ollamaEnabled() {
  const v = (process.env.OLLAMA_ENABLED ?? '1').toLowerCase()
  return v !== '0' && v !== 'false'
}

/** @param {unknown} value */
function normalizeReasoningEffort(value) {
  const v = String(value ?? '')
    .trim()
    .toLowerCase()
  if (v === 'none' || v === 'low' || v === 'medium' || v === 'high') return v
  return undefined
}

/**
 * Qwen3.5 é modelo "thinking": sem isto gasta tokens e tempo antes da resposta.
 * @param {{ reasoning_enabled?: unknown }} payload
 */
function resolveOllamaReasoningEffort(payload) {
  const envDefault = normalizeReasoningEffort(process.env.OLLAMA_REASONING_EFFORT)
  const envOn = normalizeReasoningEffort(process.env.OLLAMA_REASONING_EFFORT_ON)
  if (payload?.reasoning_enabled === true) {
    return envOn || 'medium'
  }
  if (payload?.reasoning_enabled === false) {
    return 'none'
  }
  return envDefault || 'none'
}

/**
 * @param {unknown} raw
 * @param {{ stream?: boolean }} opts
 */
function buildOllamaChatRequest(raw, opts = {}) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Pedido inválido.' }
  }
  const payload = /** @type {{ messages?: unknown; temperature?: unknown; max_completion_tokens?: unknown; tools?: unknown; tool_choice?: unknown; reasoning_enabled?: unknown; llm_provider?: unknown; llm_model?: unknown }} */ (
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
    const envT = Number(process.env.OLLAMA_TEMPERATURE)
    if (!Number.isNaN(envT)) {
      temperature = Math.min(2, Math.max(0, envT))
    }
  }

  const model =
    String(payload.llm_provider || '').toLowerCase() === 'ollama' &&
    String(payload.llm_model || '').trim()
      ? String(payload.llm_model).trim()
      : process.env.OLLAMA_MODEL || DEFAULT_MODEL
  /** @type {Record<string, unknown>} */
  const chatBody = {
    model,
    messages: payload.messages,
    temperature,
    stream: Boolean(opts.stream),
  }
  if (
    typeof payload.max_completion_tokens === 'number' &&
    !Number.isNaN(payload.max_completion_tokens)
  ) {
    chatBody.max_tokens = Math.min(
      8192,
      Math.max(16, Math.floor(payload.max_completion_tokens)),
    )
  }
  if (Array.isArray(payload.tools) && payload.tools.length > 0) {
    chatBody.tools = payload.tools
  }
  if (payload.tool_choice !== undefined && payload.tool_choice !== null) {
    chatBody.tool_choice = payload.tool_choice
  }
  chatBody.reasoning_effort = resolveOllamaReasoningEffort(payload)

  const headers = { 'Content-Type': 'application/json' }
  const apiKey = process.env.OLLAMA_API_KEY?.trim()
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  return {
    ok: true,
    model,
    cloudModel: isOllamaCloudModel(model),
    chatBody,
    headers,
    timeoutMs: chatFetchTimeoutMs(model),
  }
}

/**
 * @param {Record<number, { id: string; type: string; function: { name: string; arguments: string } }>} acc
 * @param {unknown[]} deltaCalls
 */
function mergeToolCallDeltas(acc, deltaCalls) {
  if (!Array.isArray(deltaCalls)) return
  for (const tc of deltaCalls) {
    if (!tc || typeof tc !== 'object') continue
    const idx =
      typeof /** @type {{ index?: number }} */ (tc).index === 'number'
        ? /** @type {{ index: number }} */ (tc).index
        : 0
    if (!acc[idx]) {
      acc[idx] = {
        id: '',
        type: 'function',
        function: { name: '', arguments: '' },
      }
    }
    const row = acc[idx]
    const id = /** @type {{ id?: string }} */ (tc).id
    if (typeof id === 'string' && id) row.id = id
    const fn = /** @type {{ function?: { name?: string; arguments?: string } }} */ (
      tc
    ).function
    if (fn && typeof fn === 'object') {
      if (typeof fn.name === 'string') row.function.name += fn.name
      if (typeof fn.arguments === 'string') row.function.arguments += fn.arguments
    }
  }
}

/**
 * @param {Record<number, { id: string; type: string; function: { name: string; arguments: string } }>} acc
 */
function finalizeToolCalls(acc) {
  const toolCalls = []
  for (const idx of Object.keys(acc).sort((a, b) => Number(a) - Number(b))) {
    const row = acc[Number(idx)]
    if (!row?.id || !row.function?.name) continue
    const name = row.function.name
    const argsRaw = row.function.arguments || '{}'
    const args =
      name === 'save_memory'
        ? sanitizeToolArgumentsForEcho(name, argsRaw)
        : argsRaw
    toolCalls.push({
      id: row.id,
      type: 'function',
      function: { name, arguments: args },
    })
  }
  return toolCalls
}

/**
 * @param {unknown} raw
 * @param {(evt: { type: string; delta?: string; full?: string }) => void} emit
 */
async function ollamaChatStream(raw, emit) {
  if (!ollamaEnabled()) {
    return { ok: false, error: 'Ollama desligado (OLLAMA_ENABLED=0).' }
  }

  const built = buildOllamaChatRequest(raw, { stream: true })
  if (!built.ok) return built

  const { model, cloudModel, chatBody, headers, timeoutMs } = built
  let content = ''
  let reasoning = ''
  /** @type {Record<number, { id: string; type: string; function: { name: string; arguments: string } }>} */
  const toolAcc = {}
  let sawToolCalls = false

  try {
    const res = await fetchWithTimeout(
      chatEndpoint(),
      {
        method: 'POST',
        headers,
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
        /* ignore */
      }
      return {
        ok: false,
        error: `Ollama (${res.status}): ${detail}`,
      }
    }

    const body = res.body
    if (!body || typeof body.getReader !== 'function') {
      const bodyText = await res.text()
      const data = JSON.parse(bodyText)
      const msg = data?.choices?.[0]?.message ?? {}
      const parsed = parseAssistantMessage(msg)
      return {
        ok: true,
        text: parsed.text.trim() || String(parsed.text),
        toolCalls: parsed.toolCalls.length ? parsed.toolCalls : undefined,
        reasoningContent: parsed.reasoningContent.trim() || undefined,
        provider: 'ollama',
      }
    }

    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const dataStr = trimmed.slice(5).trim()
        if (!dataStr || dataStr === '[DONE]') continue
        let chunk
        try {
          chunk = JSON.parse(dataStr)
        } catch {
          continue
        }
        const delta = chunk?.choices?.[0]?.delta
        if (!delta || typeof delta !== 'object') continue

        if (Array.isArray(delta.tool_calls) && delta.tool_calls.length) {
          if (!sawToolCalls) {
            sawToolCalls = true
            emit({ type: 'tools_pending' })
          }
          mergeToolCallDeltas(toolAcc, delta.tool_calls)
        }

        const thinkDelta =
          delta.reasoning ?? delta.reasoning_content ?? delta.thinking
        if (thinkDelta) {
          const t = String(thinkDelta)
          reasoning += t
          emit({ type: 'reasoning', delta: t, full: reasoning })
        }

        if (delta.content && !sawToolCalls) {
          const c = String(delta.content)
          content += c
          emit({ type: 'content', delta: c, full: content })
        }
      }
    }

    const toolCalls = finalizeToolCalls(toolAcc)
    const reasoningOut = reasoning.trim() || undefined

    if (toolCalls.length > 0) {
      return {
        ok: true,
        text: content.trim(),
        toolCalls,
        reasoningContent: reasoningOut,
        provider: 'ollama',
        ...(cloudModel ? { ollamaCloud: true } : {}),
      }
    }
    if (!content.trim()) {
      return {
        ok: false,
        error: 'Resposta vazia do Ollama.',
      }
    }
    return {
      ok: true,
      text: content,
      reasoningContent: reasoningOut,
      provider: 'ollama',
      ...(cloudModel ? { ollamaCloud: true } : {}),
    }
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'AbortError') {
      return {
        ok: false,
        error: `Tempo limite (${Math.round(timeoutMs / 1000)}s) na chamada ao Ollama.`,
      }
    }
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

/**
 * @param {unknown} raw
 */
async function ollamaChat(raw) {
  if (!ollamaEnabled()) {
    return {
      ok: false,
      error: 'Ollama desligado (OLLAMA_ENABLED=0).',
    }
  }

  const built = buildOllamaChatRequest(raw, { stream: false })
  if (!built.ok) return built
  const { model, cloudModel, chatBody, headers, timeoutMs } = built

  try {
    const res = await fetchWithTimeout(
      chatEndpoint(),
      {
        method: 'POST',
        headers,
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
      const hint =
        res.status === 404 || /not found/i.test(detail)
          ? ` Modelo "${model}" instalado? Rode: ollama pull ${model}`
          : ''
      return {
        ok: false,
        error: `Ollama (${res.status}): ${detail}${hint}`,
      }
    }

    const data = JSON.parse(bodyText)
    const msg = data?.choices?.[0]?.message ?? {}
    const { text, reasoningContent, toolCalls } = parseAssistantMessage(msg)
    const reasoning =
      reasoningContent.trim().length > 0 ? reasoningContent.trim() : undefined

    if (toolCalls.length > 0) {
      return {
        ok: true,
        text: text.trim(),
        toolCalls,
        reasoningContent: reasoning,
        provider: 'ollama',
        ...(cloudModel ? { ollamaCloud: true } : {}),
      }
    }
    if (!String(text).trim()) {
      return {
        ok: false,
        error:
          'Resposta vazia do Ollama. Confirme que o modelo suporta tools (ex.: qwen2.5, llama3.1).',
      }
    }
    return {
      ok: true,
      text: String(text),
      reasoningContent: reasoning,
      provider: 'ollama',
      ...(cloudModel ? { ollamaCloud: true } : {}),
    }
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'AbortError') {
      return {
        ok: false,
        error: `Tempo limite (${Math.round(timeoutMs / 1000)}s) na chamada ao Ollama.`,
      }
    }
    const msg = e instanceof Error ? e.message : String(e)
    if (/ECONNREFUSED|fetch failed|Failed to fetch/i.test(msg)) {
      return {
        ok: false,
        error:
          'Ollama não está a correr. Inicia com `ollama serve` ou abre a app Ollama.',
      }
    }
    return { ok: false, error: msg }
  }
}

/**
 * @param {string | string[]} input
 */
async function ollamaEmbed(input) {
  if (!ollamaEnabled()) {
    return { ok: false, error: 'Ollama desligado (OLLAMA_ENABLED=0).' }
  }

  const texts = Array.isArray(input) ? input : [input]
  if (!texts.length) {
    return { ok: false, error: 'Nenhum texto para embedding.' }
  }

  const model = process.env.OLLAMA_EMBED_MODEL || DEFAULT_EMBED_MODEL
  const timeoutMs = chatFetchTimeoutMs()
  const headers = { 'Content-Type': 'application/json' }
  const apiKey = process.env.OLLAMA_API_KEY?.trim()
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  try {
    const vectors = []
    for (const text of texts) {
      const res = await fetchWithTimeout(
        embedEndpoint(),
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ model, input: text }),
        },
        timeoutMs,
      )
      const bodyText = await res.text()
      if (!res.ok) {
        return {
          ok: false,
          error: `Ollama embed (${res.status}): ${bodyText.slice(0, 400)}`,
        }
      }
      const data = JSON.parse(bodyText)
      const emb = data?.embedding ?? data?.data?.[0]?.embedding
      if (!Array.isArray(emb)) {
        return { ok: false, error: 'Embedding inválido do Ollama.' }
      }
      vectors.push(emb)
    }
    return { ok: true, embeddings: vectors }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

async function ollamaVisionDescribe() {
  return {
    ok: false,
    error:
      'Visão local não configurada. Use Groq/Together para describe_images ou desactive imagens em dev.',
  }
}

module.exports = {
  ollamaChat,
  ollamaChatStream,
  ollamaEmbed,
  ollamaVisionDescribe,
  ollamaEnabled,
}
