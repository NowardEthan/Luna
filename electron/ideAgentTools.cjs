const fs = require('fs')
const path = require('path')
const { spawn, spawnSync } = require('child_process')

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '__pycache__',
])
const MAX_GREP_FILES = 4000
const MAX_GREP_MATCHES = 150
const MAX_GLOB_RESULTS = 300
const MAX_CMD_OUTPUT = 32_000
const CMD_TIMEOUT_MS = 120_000

const DENY_CMD =
  /\b(rm\s+-rf|del\s+\/|format\s+|mkfs|shutdown|reboot|:(){ :|:|>\s*\/dev\/sd)\b/i

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
 * Pasta escolhida explicitamente pelo utilizador (pode ficar fora das raízes actuais).
 * @param {string} dirPath
 * @param {string[]} allowRoots
 */
function resolveWorkspaceRootPath(dirPath, allowRoots) {
  const safe = resolveSafePath(dirPath, allowRoots)
  if (safe) return safe
  if (!dirPath || typeof dirPath !== 'string') return null
  let normalized
  try {
    normalized = path.resolve(dirPath.trim())
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
  try {
    const st = fs.statSync(normalized)
    if (st.isDirectory()) return normalized
  } catch {
    /* ignore */
  }
  return null
}

/**
 * @param {string} dir
 * @param {(filePath: string) => void} onFile
 * @param {{ count: number }} state
 */
function walkFiles(dir, onFile, state) {
  if (state.count >= MAX_GREP_FILES) return
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const ent of entries) {
    if (state.count >= MAX_GREP_FILES) return
    if (ent.isDirectory()) {
      if (SKIP_DIR_NAMES.has(ent.name)) continue
      walkFiles(path.join(dir, ent.name), onFile, state)
    } else if (ent.isFile()) {
      state.count++
      onFile(path.join(dir, ent.name))
    }
  }
}

/**
 * @param {string} pattern
 */
function globToRegExp(pattern) {
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const re = esc
    .replace(/\*\*/g, '<<<GLOBSTAR>>>')
    .replace(/\*/g, '[^/\\\\]*')
    .replace(/<<<GLOBSTAR>>>/g, '.*')
  return new RegExp(`^${re}$`, 'i')
}

/**
 * @param {import('electron').App} electronApp
 * @param {() => string[]} allowRootsFn
 */
function createIdeAgentTools(electronApp, allowRootsFn) {
  /** @type {string[]} */
  let userWorkspaceRoots = []

  const primaryWorkspaceRoot = () => userWorkspaceRoots[0] ?? null

  return {
    setWorkspaceRoot(rootPath) {
      if (!rootPath || typeof rootPath !== 'string') {
        userWorkspaceRoots = []
        return { ok: true, path: null, paths: [] }
      }
      return this.setWorkspaceRoots([rootPath])
    },

    /**
     * @param {string[]} paths
     */
    setWorkspaceRoots(paths) {
      if (!Array.isArray(paths)) {
        return { ok: false, error: 'Lista de pastas inválida.' }
      }
      if (!paths.length) {
        userWorkspaceRoots = []
        return { ok: true, paths: [], path: null }
      }
      const bootstrap = allowRootsFn()
      const validated = []
      for (const p of paths) {
        const safe = resolveWorkspaceRootPath(p, bootstrap)
        if (!safe) {
          return {
            ok: false,
            error: `Pasta de workspace não permitida: ${String(p)}`,
          }
        }
        if (!validated.some((x) => x.toLowerCase() === safe.toLowerCase())) {
          validated.push(safe)
        }
      }
      userWorkspaceRoots = validated
      return { ok: true, paths: validated, path: validated[0] ?? null }
    },

    getWorkspaceRoot() {
      return primaryWorkspaceRoot()
    },

    getWorkspaceRoots() {
      return [...userWorkspaceRoots]
    },

    writeFile(filePath, content) {
      const safe = resolveSafePath(filePath, allowRootsFn())
      if (!safe) {
        return { ok: false, error: 'Caminho não permitido.' }
      }
      try {
        fs.mkdirSync(path.dirname(safe), { recursive: true })
        fs.writeFileSync(safe, String(content ?? ''), 'utf8')
        return { ok: true, path: safe }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    },

    createDirectory(dirPath) {
      const safe = resolveSafePath(dirPath, allowRootsFn())
      if (!safe) {
        return { ok: false, error: 'Caminho não permitido.' }
      }
      try {
        fs.mkdirSync(safe, { recursive: true })
        return { ok: true, path: safe }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    },

    deletePath(targetPath) {
      const safe = resolveSafePath(targetPath, allowRootsFn())
      if (!safe) {
        return { ok: false, error: 'Caminho não permitido.' }
      }
      try {
        const st = fs.statSync(safe)
        if (st.isDirectory()) {
          const entries = fs.readdirSync(safe)
          if (entries.length > 0) {
            return { ok: false, error: 'Pasta não está vazia.' }
          }
          fs.rmdirSync(safe)
        } else {
          fs.unlinkSync(safe)
        }
        return { ok: true, path: safe }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    },

    renamePath(fromPath, toPath) {
      const safeFrom = resolveSafePath(fromPath, allowRootsFn())
      const safeTo = resolveSafePath(toPath, allowRootsFn())
      if (!safeFrom || !safeTo) {
        return { ok: false, error: 'Caminho não permitido.' }
      }
      try {
        fs.mkdirSync(path.dirname(safeTo), { recursive: true })
        fs.renameSync(safeFrom, safeTo)
        return { ok: true, from: safeFrom, to: safeTo }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    },

    grep(query, searchPath, options = {}) {
      const pattern = String(query ?? '').trim()
      if (!pattern.length) {
        return { ok: false, error: 'Padrão vazio.' }
      }
      const roots = allowRootsFn()
      const base =
        resolveSafePath(
          searchPath || primaryWorkspaceRoot() || roots[0],
          roots,
        ) || primaryWorkspaceRoot()
      if (!base) {
        return { ok: false, error: 'Caminho de pesquisa inválido.' }
      }
      let re
      try {
        re = new RegExp(pattern, options.case_sensitive ? '' : 'i')
      } catch (e) {
        return {
          ok: false,
          error: `Regex inválido: ${e instanceof Error ? e.message : String(e)}`,
        }
      }
      const matches = []
      const state = { count: 0 }
      const scanFile = (filePath) => {
        if (matches.length >= MAX_GREP_MATCHES) return
        try {
          const st = fs.statSync(filePath)
          if (!st.isFile() || st.size > 512_000) return
          const text = fs.readFileSync(filePath, 'utf8')
          const lines = text.split(/\r?\n/)
          for (let i = 0; i < lines.length; i++) {
            if (matches.length >= MAX_GREP_MATCHES) return
            if (re.test(lines[i])) {
              matches.push({
                path: filePath,
                line: i + 1,
                text: lines[i].slice(0, 240),
              })
            }
          }
        } catch {
          /* skip */
        }
      }
      try {
        const st = fs.statSync(base)
        if (st.isFile()) {
          scanFile(base)
        } else if (st.isDirectory()) {
          walkFiles(base, scanFile, state)
        }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
      return {
        ok: true,
        pattern,
        root: base,
        match_count: matches.length,
        truncated:
          matches.length >= MAX_GREP_MATCHES || state.count >= MAX_GREP_FILES,
        matches,
      }
    },

    glob(pattern, searchPath) {
      const pat = String(pattern ?? '').trim()
      if (!pat.length) {
        return { ok: false, error: 'Padrão glob vazio.' }
      }
      const roots = allowRootsFn()
      const base =
        resolveSafePath(
          searchPath || primaryWorkspaceRoot() || roots[0],
          roots,
        ) || primaryWorkspaceRoot()
      if (!base) {
        return { ok: false, error: 'Caminho inválido.' }
      }
      const re = globToRegExp(pat.replace(/\\/g, '/'))
      const results = []
      const state = { count: 0 }
      const onFile = (filePath) => {
        if (results.length >= MAX_GLOB_RESULTS) return
        const rel = path.relative(base, filePath).replace(/\\/g, '/')
        if (re.test(rel) || re.test(filePath)) {
          results.push({ path: filePath, relative: rel })
        }
      }
      try {
        const st = fs.statSync(base)
        if (st.isDirectory()) {
          walkFiles(base, onFile, state)
        }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
      return {
        ok: true,
        pattern: pat,
        root: base,
        count: results.length,
        truncated: results.length >= MAX_GLOB_RESULTS,
        paths: results,
      }
    },

    runCommand(command, cwd, options = {}) {
      const cmd = String(command ?? '').trim()
      const gui = options.gui === true
      if (!cmd.length) {
        return { ok: false, error: 'Comando vazio.' }
      }
      if (DENY_CMD.test(cmd)) {
        return { ok: false, error: 'Comando bloqueado por segurança.' }
      }
      const roots = allowRootsFn()
      const workDir =
        resolveSafePath(cwd || primaryWorkspaceRoot() || roots[0], roots) ||
        primaryWorkspaceRoot()
      if (!workDir) {
        return { ok: false, error: 'cwd inválido.' }
      }
      try {
        if (gui) {
          const child = spawn(cmd, {
            shell: true,
            cwd: workDir,
            detached: true,
            stdio: 'ignore',
            windowsHide: false,
          })
          child.unref()
          return {
            ok: true,
            command: cmd,
            cwd: workDir,
            gui: true,
            pid: child.pid ?? null,
            message:
              'Processo GUI iniciado em segundo plano — a janela deve aparecer no ambiente de trabalho.',
          }
        }
        const r = spawnSync(cmd, {
          shell: true,
          cwd: workDir,
          encoding: 'utf8',
          timeout: CMD_TIMEOUT_MS,
          maxBuffer: MAX_CMD_OUTPUT * 2,
          windowsHide: true,
        })
        let stdout = String(r.stdout ?? '')
        let stderr = String(r.stderr ?? '')
        if (stdout.length > MAX_CMD_OUTPUT) {
          stdout = stdout.slice(0, MAX_CMD_OUTPUT) + '\n…(truncado)'
        }
        if (stderr.length > MAX_CMD_OUTPUT) {
          stderr = stderr.slice(0, MAX_CMD_OUTPUT) + '\n…(truncado)'
        }
        return {
          ok: true,
          command: cmd,
          cwd: workDir,
          exit_code: r.status,
          stdout,
          stderr,
          signal: r.signal || null,
        }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    },

    gitStatus(repoPath) {
      const roots = allowRootsFn()
      const dir =
        resolveSafePath(repoPath || primaryWorkspaceRoot() || roots[0], roots) ||
        primaryWorkspaceRoot()
      if (!dir) {
        return { ok: false, error: 'Repositório inválido.' }
      }
      const r = spawnSync('git', ['status', '--porcelain', '-b'], {
        cwd: dir,
        encoding: 'utf8',
        timeout: 30_000,
        windowsHide: true,
      })
      if (r.error) {
        return { ok: false, error: r.error.message }
      }
      return {
        ok: r.status === 0,
        path: dir,
        exit_code: r.status,
        output: String(r.stdout ?? '').slice(0, MAX_CMD_OUTPUT),
        stderr: String(r.stderr ?? '').slice(0, 4000),
      }
    },

    gitDiff(repoPath, staged = false) {
      const roots = allowRootsFn()
      const dir =
        resolveSafePath(repoPath || primaryWorkspaceRoot() || roots[0], roots) ||
        primaryWorkspaceRoot()
      if (!dir) {
        return { ok: false, error: 'Repositório inválido.' }
      }
      const args = staged ? ['diff', '--staged'] : ['diff']
      const r = spawnSync('git', args, {
        cwd: dir,
        encoding: 'utf8',
        timeout: 60_000,
        maxBuffer: MAX_CMD_OUTPUT * 2,
        windowsHide: true,
      })
      let diff = String(r.stdout ?? '')
      if (diff.length > MAX_CMD_OUTPUT) {
        diff = diff.slice(0, MAX_CMD_OUTPUT) + '\n…(diff truncado)'
      }
      return {
        ok: r.status === 0 || r.status === 1,
        path: dir,
        staged: Boolean(staged),
        diff,
        stderr: String(r.stderr ?? '').slice(0, 2000),
      }
    },

    gitCommit(repoPath, message) {
      const roots = allowRootsFn()
      const dir =
        resolveSafePath(repoPath || primaryWorkspaceRoot() || roots[0], roots) ||
        primaryWorkspaceRoot()
      if (!dir) {
        return { ok: false, error: 'Repositório inválido.' }
      }
      const msg = String(message ?? '').trim().slice(0, 500)
      if (!msg.length) {
        return { ok: false, error: 'Mensagem de commit vazia.' }
      }
      const r = spawnSync('git', ['commit', '-m', msg], {
        cwd: dir,
        encoding: 'utf8',
        timeout: 60_000,
        windowsHide: true,
      })
      return {
        ok: r.status === 0,
        path: dir,
        message: msg,
        output: String(r.stdout ?? '').slice(0, 4000),
        stderr: String(r.stderr ?? '').slice(0, 4000),
        exit_code: r.status,
      }
    },
  }
}

module.exports = { createIdeAgentTools, resolveSafePath }
