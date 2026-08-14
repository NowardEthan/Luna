const DEFAULT_TIMEOUT_MS = 5000

function normalizeBaseUrl(url) {
  const trimmed = String(url || '').trim().replace(/\/$/, '')
  if (!trimmed) return 'http://127.0.0.1:1234/v1'
  if (trimmed.includes('://')) return trimmed
  return `http://${trimmed}`
}

/**
 * @param {string} baseUrl
 * @param {string} [apiKey]
 * @param {number} [timeoutMs]
 */
async function listLocalModels(baseUrl, apiKey = 'lm-studio', timeoutMs = DEFAULT_TIMEOUT_MS) {
  const url = `${normalizeBaseUrl(baseUrl)}/models`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey || 'lm-studio'}`,
      },
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return {
        ok: false,
        error: `LM Studio/Ollama respondeu ${res.status}. ${body.slice(0, 120)}`.trim(),
        models: [],
      }
    }

    const json = await res.json()
    const raw = Array.isArray(json?.data) ? json.data : Array.isArray(json?.models) ? json.models : []
    const models = raw
      .map((m) => {
        const id = typeof m === 'string' ? m : m?.id ?? m?.name ?? ''
        const label = typeof m === 'string' ? m : m?.id ?? m?.name ?? ''
        return id ? { id: String(id), label: String(label) } : null
      })
      .filter(Boolean)

    return { ok: true, models }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const friendly =
      msg.includes('abort') || msg.includes('AbortError')
        ? 'Tempo esgotado — o LM Studio está a correr na porta indicada?'
        : msg.includes('ECONNREFUSED') || msg.includes('fetch failed')
          ? 'Não foi possível ligar ao servidor local. Abre o LM Studio e activa o Local Server.'
          : msg
    return { ok: false, error: friendly, models: [] }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * @param {{ baseUrl: string, apiKey?: string, modeloMaior?: string }} opts
 */
async function testLocalLlm(opts) {
  const baseUrl = normalizeBaseUrl(opts?.baseUrl)
  const apiKey = opts?.apiKey || 'lm-studio'
  const start = Date.now()

  const listed = await listLocalModels(baseUrl, apiKey, DEFAULT_TIMEOUT_MS)
  if (!listed.ok) {
    return { ok: false, error: listed.error, latencyMs: Date.now() - start }
  }

  if (!listed.models.length) {
    return {
      ok: false,
      error: 'Servidor respondeu, mas não há modelos listados. Carrega um modelo no LM Studio.',
      latencyMs: Date.now() - start,
    }
  }

  const modelo = opts?.modeloMaior?.trim()
  if (modelo && !listed.models.some((m) => m.id === modelo)) {
    return {
      ok: false,
      error: `Modelo «${modelo}» não está disponível no servidor. Escolhe um da lista.`,
      latencyMs: Date.now() - start,
      models: listed.models,
    }
  }

  return {
    ok: true,
    latencyMs: Date.now() - start,
    modelCount: listed.models.length,
    models: listed.models,
  }
}

module.exports = {
  listLocalModels,
  testLocalLlm,
  normalizeBaseUrl,
}
