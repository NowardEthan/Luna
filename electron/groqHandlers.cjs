const {
  consumeChatCompletionSse,
  finalizeStreamedChatResult,
} = require('./chatCompletionSse.cjs')

const DEFAULT_MODEL = 'openai/gpt-oss-120b'
const DEFAULT_VISION_MODEL =
  'meta-llama/llama-4-scout-17b-16e-instruct'
const DEFAULT_EMBED_MODEL = 'nomic-embed-text-v1_5'
const CHAT_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const EMBED_ENDPOINT = 'https://api.groq.com/openai/v1/embeddings'

const DEFAULT_CHAT_FETCH_TIMEOUT_MS = 180_000

function apiKey() {
  return process.env.GROQ_API_KEY?.trim() || ''
}

function chatFetchTimeoutMs() {
  const n = Number(process.env.GROQ_CHAT_TIMEOUT_MS)
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

function isGptOssGroqModel(model) {
  return String(model || '').toLowerCase().includes('gpt-oss')
}

function isQwen3GroqModel(model) {
  const m = String(model || '').toLowerCase()
  return m.includes('qwen3') || m.includes('qwen/qwen3')
}

function isGroqReasoningModel(model) {
  return isGptOssGroqModel(model) || isQwen3GroqModel(model)
}

function groqReasoningDisabled(payload) {
  if (payload?.reasoning_enabled === true) return false
  if (payload?.reasoning_enabled === false) return true
  const env = process.env.GROQ_REASONING_ENABLED ?? process.env.LLM_REASONING_ENABLED
  if (env === '1' || env === 'true') return false
  if (env === '0' || env === 'false') return true
  return true
}

/**
 * Groq rejeita `reasoning_content` em mensagens assistant do histórico
 * (ex. vindas de OpenRouter no loop do agente). Mantém só content + tool_calls.
 * @param {unknown[]} messages
 */
function sanitizeMessagesForGroqApi(messages) {
  if (!Array.isArray(messages)) return messages
  return messages.map((m) => {
    if (!m || typeof m !== 'object') return m
    const msg = /** @type {Record<string, unknown>} */ ({ ...m })
    if (msg.role !== 'assistant') return msg
    delete msg.reasoning_content
    delete msg.reasoning
    return msg
  })
}

function parseGroqAssistantMessage(msg) {
  const textRaw = msg.content
  const text =
    textRaw === null || textRaw === undefined ? '' : String(textRaw)
  const reasoningRaw = msg.reasoning ?? msg.reasoning_content ?? ''
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
 * @param {unknown} raw
 * @returns {{ ok: true; chatBody: Record<string, unknown> } | { ok: false; error: string }}
 */
function buildGroqChatBody(raw) {
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
    const envT = Number(process.env.GROQ_TEMPERATURE)
    if (!Number.isNaN(envT)) {
      temperature = Math.min(2, Math.max(0, envT))
    }
  }

  const model =
    String(payload.llm_provider || '').toLowerCase() === 'groq' &&
    String(payload.llm_model || '').trim()
      ? String(payload.llm_model).trim()
      : process.env.GROQ_MODEL || DEFAULT_MODEL

  const hasTools = Array.isArray(payload.tools) && payload.tools.length > 0
  const reasoningOff = groqReasoningDisabled(payload)

  /** @type {Record<string, unknown>} */
  const chatBody = {
    model,
    messages: sanitizeMessagesForGroqApi(payload.messages),
    temperature,
  }
  if (isGroqReasoningModel(model)) {
    const effort = String(process.env.GROQ_REASONING_EFFORT || '').trim()
    if (isGptOssGroqModel(model)) {
      chatBody.include_reasoning = !reasoningOff
      if (
        !reasoningOff &&
        (effort === 'low' || effort === 'medium' || effort === 'high')
      ) {
        chatBody.reasoning_effort = effort
      }
    } else if (isQwen3GroqModel(model)) {
      if (hasTools || !reasoningOff) {
        chatBody.reasoning_format = reasoningOff ? 'hidden' : 'parsed'
      }
      if (
        !reasoningOff &&
        (effort === 'low' || effort === 'medium' || effort === 'high')
      ) {
        chatBody.reasoning_effort = effort
      }
    }
  }
  if (
    typeof payload.max_completion_tokens === 'number' &&
    !Number.isNaN(payload.max_completion_tokens)
  ) {
    chatBody.max_completion_tokens = Math.min(
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

  return { ok: true, chatBody }
}

/**
 * @param {unknown} raw
 * @param {(evt: { type: string; delta?: string; full?: string }) => void} emit
 */
async function groqChatStream(raw, emit) {
  const key = apiKey()
  if (!key) {
    return {
      ok: false,
      error: 'Falta GROQ_API_KEY no `.env` (fallback Groq).',
    }
  }

  const built = buildGroqChatBody(raw)
  if (!built.ok) return built

  const chatBody = { ...built.chatBody, stream: true }
  const timeoutMs = chatFetchTimeoutMs()

  try {
    const res = await fetchWithTimeout(
      CHAT_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
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
      } catch {
        /* manter detail */
      }
      return { ok: false, error: `Groq (${res.status}): ${detail}` }
    }

    const streamed = await consumeChatCompletionSse(res, emit, {
      provider: 'groq',
      parseMessage: parseGroqAssistantMessage,
    })

    return finalizeStreamedChatResult(
      streamed,
      'groq',
      'Resposta vazia do modelo.',
    )
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'AbortError') {
      return {
        ok: false,
        error: `Tempo limite (${Math.round(timeoutMs / 1000)}s) na chamada à Groq.`,
      }
    }
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

/**
 * @param {unknown} raw
 */
async function groqChat(raw) {
  const key = apiKey()
  if (!key) {
    return {
      ok: false,
      error:
        'Falta GROQ_API_KEY no `.env` (fallback Groq).',
    }
  }

  const built = buildGroqChatBody(raw)
  if (!built.ok) return built

  const chatBody = built.chatBody
  const timeoutMs = chatFetchTimeoutMs()
  const maxAttempts = 4
  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await fetchWithTimeout(
        CHAT_ENDPOINT,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(chatBody),
        },
        timeoutMs,
      )

      const bodyText = await res.text()

      if (!res.ok) {
        let detail = bodyText.slice(0, 900)
        try {
          const parsed = JSON.parse(bodyText)
          if (parsed?.error?.message) {
            detail = String(parsed.error.message)
          }
        } catch {
          /* manter detail */
        }
        if (res.status === 429 && attempt < maxAttempts) {
          const waitMatch = /try again in ([\d.]+)s/i.exec(detail)
          const waitMs = waitMatch
            ? Math.min(
                120_000,
                Math.ceil(parseFloat(waitMatch[1]) * 1000) + 400,
              )
            : 18_000
          await new Promise((r) => setTimeout(r, waitMs))
          continue
        }
        return { ok: false, error: `Groq (${res.status}): ${detail}` }
      }

      const data = JSON.parse(bodyText)
      const msg = data?.choices?.[0]?.message ?? {}
      const { text, reasoningContent, toolCalls } = parseGroqAssistantMessage(msg)
      const reasoning =
        reasoningContent.trim().length > 0 ? reasoningContent.trim() : undefined
      if (toolCalls.length > 0) {
        return {
          ok: true,
          text: text.trim(),
          toolCalls,
          reasoningContent: reasoning,
          provider: 'groq',
        }
      }
      if (!String(text).trim()) {
        return { ok: false, error: 'Resposta vazia do modelo.' }
      }
      return {
        ok: true,
        text: String(text),
        reasoningContent: reasoning,
        provider: 'groq',
      }
    }
    return { ok: false, error: 'Groq: limite de tentativas excedido.' }
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'AbortError') {
      return {
        ok: false,
        error: `Tempo limite (${Math.round(timeoutMs / 1000)}s) na chamada à Groq.`,
      }
    }
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

/**
 * @param {unknown} raw
 */
async function groqVisionDescribe(raw) {
  const key = apiKey()
  if (!key) {
    return { ok: false, error: 'Falta GROQ_API_KEY no `.env`.' }
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

  const model = process.env.GROQ_VISION_MODEL || DEFAULT_VISION_MODEL

  const instruction = `Descreva TODAS as imagens em português do Brasil, com detalhe objetivo (OCR, UI, cores, disposição). Seções "Imagem 1:", "Imagem 2:" se houver várias.

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
    content.push({
      type: 'image_url',
      image_url: { url: `data:${mime};base64,${b64}` },
    })
  }

  if (content.length < 2) {
    return { ok: false, error: 'Nenhuma imagem válida.' }
  }

  const timeoutMs = chatFetchTimeoutMs()
  try {
    const res = await fetchWithTimeout(
      CHAT_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content }],
          temperature: 0.25,
          max_completion_tokens: 2048,
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
      return { ok: false, error: `Groq visão (${res.status}): ${detail}` }
    }

    const data = JSON.parse(bodyText)
    const text = data?.choices?.[0]?.message?.content ?? ''
    if (!String(text).trim()) {
      return { ok: false, error: 'Resposta vazia do modelo de visão.' }
    }
    return { ok: true, text: String(text) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

/**
 * @param {string | string[]} input
 */
async function groqEmbed(input) {
  const key = apiKey()
  if (!key) {
    return { ok: false, error: 'Falta GROQ_API_KEY no `.env`.' }
  }

  const parts = Array.isArray(input) ? input : [input]
  if (!parts.length) {
    return { ok: false, error: 'Nenhum texto para gerar embeddings.' }
  }

  const model = process.env.GROQ_EMBED_MODEL || DEFAULT_EMBED_MODEL

  try {
    const res = await fetch(EMBED_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
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
      return { ok: false, error: `Groq embeddings (${res.status}): ${detail}` }
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
  groqChat,
  groqChatStream,
  groqVisionDescribe,
  groqEmbed,
  DEFAULT_MODEL,
  DEFAULT_VISION_MODEL,
  DEFAULT_EMBED_MODEL,
}
