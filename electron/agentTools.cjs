const fs = require('fs')
const path = require('path')
const { createIdeAgentTools } = require('./ideAgentTools.cjs')

const MAX_READ_CHARS = 48_000
const LIST_MAX_ENTRIES = 200

/**
 * @param {string} requested
 * @param {string[]} allowRoots
 */
function resolveSafePath(requested, allowRoots) {
  if (!requested || typeof requested !== 'string') return null
  let normalized
  try {
    normalized = path.resolve(requested.trim())
  } catch {
    return null
  }
  if (normalized.includes('..')) return null
  const lower = normalized.toLowerCase()
  if (
    lower.includes('\\windows\\') ||
    lower.includes('/etc/') ||
    lower.includes('system32')
  ) {
    return null
  }
  for (const root of allowRoots) {
    if (!root) continue
    let r
    try {
      r = path.resolve(root)
    } catch {
      continue
    }
    if (normalized === r || normalized.startsWith(r + path.sep)) {
      return normalized
    }
  }
  return null
}

/**
 * @param {import('electron').App} electronApp
 * @param {{ getStatus: () => { indexedFolder?: string } }} ragModule
 */
function getAllowRoots(electronApp, ragModule, userWorkspaceRoots) {
  const roots = []
  if (Array.isArray(userWorkspaceRoots)) {
    for (const r of userWorkspaceRoots) {
      if (r) roots.push(r)
    }
  }
  const projectRoot = path.join(__dirname, '..')
  roots.push(projectRoot)
  try {
    const docs = electronApp.getPath('documents')
    if (docs) roots.push(docs)
  } catch {
    /* ignore */
  }
  try {
    const st = ragModule.getStatus()
    if (st?.indexedFolder && String(st.indexedFolder).trim()) {
      const folder = String(st.indexedFolder).trim()
      roots.push(path.resolve(folder))
    }
  } catch {
    /* ignore */
  }
  return [...new Set(roots)]
}

/**
 * @param {import('electron').App} electronApp
 * @param {{ getStatus: () => unknown }} ragModule
 */
function createAgentTools(electronApp, ragModule) {
  /** @type {string[]} */
  let userWorkspaceRoots = []
  const allowRoots = () =>
    getAllowRoots(electronApp, ragModule, userWorkspaceRoots)
  const ide = createIdeAgentTools(electronApp, allowRoots)

  return {
    setWorkspaceRoot(dirPath) {
      const r = ide.setWorkspaceRoot(dirPath)
      if (r.ok && Array.isArray(r.paths)) userWorkspaceRoots = r.paths
      else if (!dirPath) userWorkspaceRoots = []
      return r
    },

    /**
     * @param {string[]} paths
     */
    setWorkspaceRoots(paths) {
      const r = ide.setWorkspaceRoots(paths)
      if (r.ok && Array.isArray(r.paths)) userWorkspaceRoots = r.paths
      else if (!paths?.length) userWorkspaceRoots = []
      return r
    },
    writeFile: ide.writeFile,
    grep: ide.grep,
    glob: ide.glob,
    runCommand: ide.runCommand,
    gitStatus: ide.gitStatus,
    gitDiff: ide.gitDiff,
    gitCommit: ide.gitCommit,
    /**
     * @param {string} dirPath
     */
    listDirectory(dirPath) {
      const safe = resolveSafePath(dirPath, allowRoots())
      if (!safe) {
        return {
          ok: false,
          error: 'Caminho não permitido ou inválido.',
        }
      }
      try {
        const st = fs.statSync(safe)
        if (!st.isDirectory()) {
          return { ok: false, error: 'Não é uma pasta.' }
        }
        const names = fs.readdirSync(safe)
        const entries = []
        for (const name of names.slice(0, LIST_MAX_ENTRIES)) {
          const full = path.join(safe, name)
          try {
            const s = fs.statSync(full)
            entries.push({
              name,
              path: full,
              type: s.isDirectory() ? 'directory' : 'file',
            })
          } catch {
            entries.push({ name, path: full, type: 'unknown' })
          }
        }
        return {
          ok: true,
          path: safe,
          entries,
          truncated: names.length > LIST_MAX_ENTRIES,
        }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    },

    /**
     * @param {string} filePath
     * @param {number} [maxChars]
     */
    readFile(filePath, maxChars) {
      const safe = resolveSafePath(filePath, allowRoots())
      if (!safe) {
        return {
          ok: false,
          error: 'Caminho não permitido ou inválido.',
        }
      }
      const limit =
        typeof maxChars === 'number' && !Number.isNaN(maxChars)
          ? Math.min(MAX_READ_CHARS, Math.max(500, Math.floor(maxChars)))
          : MAX_READ_CHARS
      try {
        const st = fs.statSync(safe)
        if (!st.isFile()) {
          return { ok: false, error: 'Não é um ficheiro.' }
        }
        const buf = fs.readFileSync(safe)
        let text = buf.toString('utf8')
        let truncated = false
        if (text.length > limit) {
          text = text.slice(0, limit)
          truncated = true
        }
        return { ok: true, path: safe, content: text, truncated }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    },

    /**
     * @param {string} query
     */
    async webSearch(query) {
      const q = String(query ?? '').trim()
      if (!q.length) {
        return { ok: false, error: 'Consulta vazia.' }
      }
      const key = process.env.WEB_SEARCH_API_KEY || process.env.TAVILY_API_KEY
      if (!key || !String(key).trim()) {
        return {
          ok: false,
          error:
            'Pesquisa web não configurada. Defina WEB_SEARCH_API_KEY ou TAVILY_API_KEY no .env.',
        }
      }
      const provider = (
        process.env.WEB_SEARCH_PROVIDER || 'tavily'
      ).toLowerCase()

      if (provider === 'tavily') {
        try {
          const now = new Date()
          const referenceDate = new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
          }).format(now)
          const daysRaw = Number(process.env.TAVILY_SEARCH_DAYS)
          const days =
            !Number.isNaN(daysRaw) && daysRaw >= 1 && daysRaw <= 365
              ? Math.floor(daysRaw)
              : 30

          const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: String(key).trim(),
              query: q,
              search_depth: 'basic',
              max_results: 5,
              days,
              ...(/\b(not[ií]cia|news|recente|hoje|atual)\b/i.test(q)
                ? { topic: 'news' }
                : {}),
            }),
          })
          const bodyText = await res.text()
          if (!res.ok) {
            return {
              ok: false,
              error: `Tavily (${res.status}): ${bodyText.slice(0, 400)}`,
            }
          }
          const data = JSON.parse(bodyText)
          const results = Array.isArray(data.results)
            ? data.results.map((r) => ({
                title: r.title,
                url: r.url,
                content: String(r.content ?? '').slice(0, 800),
                published_date: r.published_date || r.publishedDate || undefined,
              }))
            : []
          return {
            ok: true,
            query: q,
            answer: data.answer ? String(data.answer).slice(0, 2000) : '',
            results,
            searched_at: now.toISOString(),
            reference_date: referenceDate,
            reference_year: now.getFullYear(),
            search_window_days: days,
            temporal_note:
              'reference_date é o relógio deste computador ("hoje"). Resultados podem ser mais antigos — use published_date quando existir; não trate artigos de outro ano como notícia de hoje.',
          }
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          }
        }
      }

      return {
        ok: false,
        error: `Provider desconhecido: ${provider}. Use tavily.`,
      }
    },
  }
}

module.exports = { createAgentTools }
