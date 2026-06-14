/**
 * Explorador de ficheiros Luna — IPC para o picker in-app (sem dialog nativo).
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const LIST_MAX = 500
/** Leitura para picker (zip de add-on até ~128 MB + margem). */
const READ_MAX_BYTES = 150 * 1024 * 1024

const BLOCKED = [
  '\\windows\\',
  '\\program files',
  '\\program files (x86)',
  '\\$recycle.bin\\',
  '\\system volume information\\',
  '/etc/',
  '/proc/',
  '/sys/',
]

/**
 * @param {import('electron').App} app
 */
function createLunaFileExplorer(app) {
  function blocked(normalized) {
    const lower = normalized.toLowerCase().replace(/\//g, '\\')
    if (lower.includes('..')) return true
    return BLOCKED.some((b) => lower.includes(b))
  }

  function resolveBrowsePath(requested) {
    if (!requested || typeof requested !== 'string') return null
    let normalized
    try {
      normalized = path.resolve(requested.trim())
    } catch {
      return null
    }
    if (blocked(normalized)) return null

    const home = path.resolve(os.homedir())
    if (normalized === home || normalized.startsWith(home + path.sep)) {
      return normalized
    }

    if (process.platform === 'win32') {
      const drive = normalized.match(/^([a-z]):\\/i)
      if (drive) {
        const root = `${drive[1].toUpperCase()}:\\`
        if (fs.existsSync(root)) return normalized
      }
    }

    const places = getPlaces(app).map((p) => p.path)
    for (const root of places) {
      if (normalized === root || normalized.startsWith(root + path.sep)) {
        return normalized
      }
    }
    return null
  }

  function getPlaces() {
    const items = []
    const home = os.homedir()
    items.push({ id: 'home', label: 'Início', path: home, icon: 'home' })

    const special = [
      ['desktop', 'Área de trabalho', 'desktop'],
      ['documents', 'Documentos', 'folder'],
      ['downloads', 'Downloads', 'download'],
      ['pictures', 'Imagens', 'image'],
      ['music', 'Música', 'music'],
      ['videos', 'Vídeos', 'video'],
    ]
    for (const [key, label, icon] of special) {
      try {
        const p = app.getPath(key)
        if (p && fs.existsSync(p)) {
          items.push({ id: key, label, path: path.resolve(p), icon })
        }
      } catch {
        /* ignore */
      }
    }

    if (process.platform === 'win32') {
      for (let code = 65; code <= 90; code++) {
        const letter = String.fromCharCode(code)
        const root = `${letter}:\\`
        if (fs.existsSync(root)) {
          items.push({
            id: `drive-${letter}`,
            label: `Disco local (${letter}:)`,
            path: root,
            icon: 'drive',
          })
        }
      }
    }

    const seen = new Set()
    return items.filter((x) => {
      const k = x.path.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  }

  function formatEntry(name, full, st) {
    return {
      name,
      path: full,
      type: st.isDirectory() ? 'directory' : 'file',
      size: st.isFile() ? st.size : 0,
      modifiedAt: st.mtimeMs,
    }
  }

  return {
    getPlaces() {
      return { ok: true, places: getPlaces(), home: os.homedir() }
    },

    listDirectory(dirPath, options = {}) {
      const safe = resolveBrowsePath(dirPath)
      if (!safe) {
        return { ok: false, error: 'Pasta inacessível ou não permitida.' }
      }
      try {
        const st = fs.statSync(safe)
        if (!st.isDirectory()) {
          return { ok: false, error: 'Não é uma pasta.' }
        }
        const showHidden = Boolean(options.showHidden)
        const names = fs.readdirSync(safe)
        const entries = []
        for (const name of names) {
          if (!showHidden && name.startsWith('.')) continue
          const full = path.join(safe, name)
          try {
            const s = fs.statSync(full)
            entries.push(formatEntry(name, full, s))
          } catch {
            entries.push({
              name,
              path: full,
              type: 'unknown',
              size: 0,
              modifiedAt: 0,
            })
          }
          if (entries.length >= LIST_MAX) break
        }
        return {
          ok: true,
          path: safe,
          parent: path.dirname(safe),
          entries,
          truncated: names.length > LIST_MAX,
        }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    },

    readFileBinary(filePath, maxBytes = READ_MAX_BYTES) {
      const safe = resolveBrowsePath(filePath)
      if (!safe) {
        return { ok: false, error: 'Arquivo inacessível.' }
      }
      try {
        const st = fs.statSync(safe)
        if (!st.isFile()) {
          return { ok: false, error: 'Não é um arquivo.' }
        }
        const limit = Math.min(READ_MAX_BYTES, Math.max(1, maxBytes || READ_MAX_BYTES))
        if (st.size > limit) {
          return {
            ok: false,
            error: `Arquivo muito grande (máx. ${Math.round(limit / 1024 / 1024)} MB).`,
          }
        }
        const buf = fs.readFileSync(safe)
        const ext = path.extname(safe).toLowerCase()
        const mime =
          ext === '.zip'
            ? 'application/zip'
            : ext === '.png'
              ? 'image/png'
              : ext === '.jpg' || ext === '.jpeg'
                ? 'image/jpeg'
                : ext === '.webp'
                  ? 'image/webp'
                  : ext === '.gif'
                    ? 'image/gif'
                    : 'application/octet-stream'
        return {
          ok: true,
          path: safe,
          name: path.basename(safe),
          size: st.size,
          mime,
          base64: buf.toString('base64'),
        }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    },
  }
}

module.exports = { createLunaFileExplorer }
