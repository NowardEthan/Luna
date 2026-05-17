const { log } = require('./logger.cjs')

/**
 * @param {Record<string, unknown>} body
 */
function bodyHints(body) {
  if (!body || typeof body !== 'object') return {}
  /** @type {Record<string, unknown>} */
  const h = {}
  if (body.path != null && String(body.path).trim()) {
    h.path = String(body.path).trim()
  }
  if (body.pattern != null && String(body.pattern).trim()) {
    h.pattern = String(body.pattern).trim()
  }
  if (body.command != null && String(body.command).trim()) {
    h.command = String(body.command).trim().slice(0, 200)
  }
  if (body.query != null && String(body.query).trim()) {
    h.query = String(body.query).trim().slice(0, 120)
  }
  if (body.cwd != null && String(body.cwd).trim()) {
    h.cwd = String(body.cwd).trim()
  }
  return h
}

/**
 * @param {unknown} result
 */
function resultHints(result) {
  if (!result || typeof result !== 'object') return {}
  const r = /** @type {Record<string, unknown>} */ (result)
  /** @type {Record<string, unknown>} */
  const h = {}
  if (r.exit_code != null) h.exit_code = r.exit_code
  if (typeof r.match_count === 'number') h.match_count = r.match_count
  if (Array.isArray(r.entries)) h.entries = r.entries.length
  if (Array.isArray(r.matches)) h.matches = r.matches.length
  if (Array.isArray(r.results)) h.results = r.results.length
  if (typeof r.stderr === 'string' && r.stderr.trim()) {
    h.stderr = r.stderr.trim().slice(0, 400)
  }
  if (typeof r.stdout === 'string' && r.stdout.trim() && r.ok === false) {
    h.stdout = r.stdout.trim().slice(0, 200)
  }
  return h
}

/**
 * Regista no terminal OK ou ERRO com mensagem legível (não só `ok: false`).
 * @param {{ method: string; url: string; id: string; started: number; ok: (d?: object) => void; warn: (m: string, e?: object) => void }} rl
 * @param {unknown} body
 * @param {{ ok?: boolean; error?: string } & Record<string, unknown>} result
 */
function logHttpResult(rl, body, result) {
  const ms = Date.now() - rl.started
  const route = `${rl.method} ${rl.url}`
  const hints = { ...bodyHints(body), ...resultHints(result) }

  if (result?.ok === false) {
    const err = String(result.error || 'falhou (sem mensagem de erro)').trim()
    log('error', 'http', `${route} FALHOU em ${ms}ms`, {
      id: rl.id,
      error: err,
      ...hints,
    })
    rl.warn(`↳ ${err}`, hints)
    return
  }

  rl.ok({
    ms,
    ...hints,
  })
}

module.exports = { logHttpResult, bodyHints, resultHints }
