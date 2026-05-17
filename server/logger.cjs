const { pushLog: bufferPush } = require('./logBuffer.cjs')

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

function ts() {
  return new Date().toISOString()
}

function fmt(level, tag, msg, extra) {
  const color =
    level === 'error'
      ? COLORS.red
      : level === 'warn'
        ? COLORS.yellow
        : level === 'ok'
          ? COLORS.green
          : level === 'req'
            ? COLORS.cyan
            : COLORS.dim
  const base = `${COLORS.dim}${ts()}${COLORS.reset} ${color}[${tag}]${COLORS.reset} ${msg}`
  if (extra === undefined) return base
  return `${base} ${COLORS.dim}${typeof extra === 'string' ? extra : JSON.stringify(extra)}${COLORS.reset}`
}

function log(level, tag, msg, extra) {
  const line = fmt(level, tag, msg, extra)
  if (level === 'error') console.error(line)
  else console.log(line)
  try {
    bufferPush(level, tag, msg, extra)
  } catch {
    /* ignore */
  }
}

function createRequestLogger(method, url) {
  const id = Math.random().toString(36).slice(2, 9)
  const started = Date.now()
  log('req', 'http', `${method} ${url}`, { id })

  return {
    id,
    method,
    url,
    started,
    ok(detail) {
      log('ok', 'http', `${method} ${url} ${Date.now() - started}ms`, {
        id,
        ...detail,
      })
    },
    fail(status, detail) {
      log('error', 'http', `${method} ${url} → ${status} (${Date.now() - started}ms)`, {
        id,
        ...detail,
      })
    },
    info(msg, extra) {
      log('info', 'luna', msg, { id, ...extra })
    },
    warn(msg, extra) {
      log('warn', 'luna', msg, { id, ...extra })
    },
  }
}

module.exports = { log, createRequestLogger }
