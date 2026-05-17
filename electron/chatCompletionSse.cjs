/**
 * Leitor SSE partilhado (OpenAI-compatible chat/completions).
 * @param {Response} res
 * @param {(evt: { type: string; delta?: string; full?: string }) => void} emit
 * @param {{ provider?: string; parseMessage?: (msg: unknown) => { text: string; reasoningContent: string; toolCalls: unknown[] } }} opts
 */
async function consumeChatCompletionSse(res, emit, opts = {}) {
  const body = res.body
  if (!body || typeof body.getReader !== 'function') {
    const bodyText = await res.text()
    const data = JSON.parse(bodyText)
    const msg = data?.choices?.[0]?.message ?? {}
    const parsed = opts.parseMessage
      ? opts.parseMessage(msg)
      : { text: String(msg.content ?? ''), reasoningContent: '', toolCalls: [] }
    if (parsed.reasoningContent?.trim()) {
      emit({
        type: 'reasoning',
        delta: parsed.reasoningContent,
        full: parsed.reasoningContent,
      })
    }
    if (parsed.text?.trim()) {
      emit({ type: 'content', delta: parsed.text, full: parsed.text })
    }
    return {
      text: parsed.text?.trim() ?? '',
      reasoningContent: parsed.reasoningContent?.trim() || undefined,
      toolCalls: parsed.toolCalls?.length ? parsed.toolCalls : undefined,
    }
  }

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let reasoning = ''
  /** @type {Record<number, { id: string; type: string; function: { name: string; arguments: string } }>} */
  const toolAcc = {}
  let sawToolCalls = false

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

      let thinkDelta =
        delta.reasoning ?? delta.reasoning_content ?? delta.thinking
      if (!thinkDelta && Array.isArray(delta.reasoning_details)) {
        const parts = []
        for (const rd of delta.reasoning_details) {
          if (!rd || typeof rd !== 'object') continue
          const chunk =
            rd.text ?? rd.content ?? (typeof rd.summary === 'string' ? rd.summary : '')
          if (chunk) parts.push(String(chunk))
        }
        if (parts.length) thinkDelta = parts.join('')
      }
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
  return {
    text: content.trim(),
    reasoningContent: reasoning.trim() || undefined,
    toolCalls: toolCalls.length ? toolCalls : undefined,
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
function sanitizeSaveMemoryArguments(argsJson) {
  try {
    const o = JSON.parse(argsJson)
    if (!o || typeof o !== 'object' || Array.isArray(o)) return argsJson
    const v = o.replace_of_note_id
    if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) {
      delete o.replace_of_note_id
    }
    return JSON.stringify(o)
  } catch {
    return argsJson
  }
}

function finalizeToolCalls(acc) {
  /** @type {{ id: string; type: string; function: { name: string; arguments: string } }[]} */
  const toolCalls = []
  for (const idx of Object.keys(acc).sort((a, b) => Number(a) - Number(b))) {
    const row = acc[Number(idx)]
    if (!row?.id || !row.function?.name) continue
    let args = row.function.arguments || '{}'
    if (row.function.name === 'save_memory') {
      args = sanitizeSaveMemoryArguments(args)
    }
    toolCalls.push({
      id: row.id,
      type: 'function',
      function: {
        name: row.function.name,
        arguments: args,
      },
    })
  }
  return toolCalls
}

/**
 * Normaliza fim de stream: reasoning sem texto não é erro fatal (o agente tenta síntese).
 * @param {{ text?: string; reasoningContent?: string; toolCalls?: unknown[] }} streamed
 * @param {string} provider
 * @param {string} emptyError
 */
function finalizeStreamedChatResult(streamed, provider, emptyError) {
  if (streamed.toolCalls?.length) {
    return {
      ok: true,
      text: streamed.text?.trim() ?? '',
      toolCalls: streamed.toolCalls,
      reasoningContent: streamed.reasoningContent,
      provider,
    }
  }
  if (streamed.text?.trim()) {
    return {
      ok: true,
      text: streamed.text.trim(),
      reasoningContent: streamed.reasoningContent,
      provider,
    }
  }
  if (streamed.reasoningContent?.trim()) {
    return {
      ok: true,
      text: '',
      reasoningContent: streamed.reasoningContent.trim(),
      provider,
    }
  }
  return { ok: false, error: emptyError }
}

module.exports = {
  consumeChatCompletionSse,
  mergeToolCallDeltas,
  finalizeToolCalls,
  finalizeStreamedChatResult,
}
