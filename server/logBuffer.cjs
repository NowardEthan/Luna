/** Buffer circular de linhas de log do servidor Luna (para diagnóstico na UI). */

const MAX_LINES = 400

/** @type {{ ts: string; level: string; tag: string; msg: string; extra?: string }[]} */
const lines = []

/**
 * @param {string} level
 * @param {string} tag
 * @param {string} msg
 * @param {unknown} [extra]
 */
function pushLog(level, tag, msg, extra) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    tag,
    msg: String(msg),
    ...(extra !== undefined
      ? {
          extra:
            typeof extra === 'string' ? extra : JSON.stringify(extra, null, 0),
        }
      : {}),
  }
  lines.push(entry)
  if (lines.length > MAX_LINES) {
    lines.splice(0, lines.length - MAX_LINES)
  }
}

function getRecentLogs(limit = 120) {
  const n = Math.min(Math.max(1, limit), MAX_LINES)
  return lines.slice(-n)
}

function formatLogLine(entry) {
  const extra = entry.extra ? ` ${entry.extra}` : ''
  return `${entry.ts} [${entry.level}/${entry.tag}] ${entry.msg}${extra}`
}

function getRecentLogsText(limit = 80) {
  return getRecentLogs(limit).map(formatLogLine).join('\n')
}

module.exports = {
  pushLog,
  getRecentLogs,
  getRecentLogsText,
  MAX_LINES,
}
