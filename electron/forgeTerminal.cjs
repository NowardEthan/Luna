const os = require('os')
const path = require('path')

let ptyModule = null

function loadPty() {
  if (ptyModule) return ptyModule
  try {
    ptyModule = require('@homebridge/node-pty-prebuilt-multiarch')
    return ptyModule
  } catch (e) {
    return null
  }
}

function defaultShell() {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'powershell.exe'
  }
  return process.env.SHELL || '/bin/bash'
}

/**
 * @param {(payload: { id: string, data?: string, exitCode?: number }) => void} emit
 */
function createForgeTerminal(emit) {
  /** @type {Map<string, import('@homebridge/node-pty-prebuilt-multiarch').IPty>} */
  const sessions = new Map()
  let nextId = 1

  return {
    isAvailable() {
      return loadPty() !== null
    },

    /**
     * @param {{ cwd?: string, cols?: number, rows?: number, title?: string }} opts
     */
    create(opts = {}) {
      const pty = loadPty()
      if (!pty) {
        return {
          ok: false,
          error:
            'PTY indisponível. Reinicia o Orbit (modo Electron) após instalar dependências nativas.',
        }
      }

      let cwd = String(opts.cwd ?? '').trim()
      if (!cwd) {
        try {
          cwd = os.homedir()
        } catch {
          cwd = process.cwd()
        }
      }
      try {
        cwd = path.resolve(cwd)
      } catch {
        cwd = process.cwd()
      }

      const cols = Math.max(2, Number(opts.cols) || 80)
      const rows = Math.max(2, Number(opts.rows) || 24)
      const id = String(nextId++)

      try {
        const shell = defaultShell()
        const proc = pty.spawn(shell, [], {
          name: 'xterm-color',
          cols,
          rows,
          cwd,
          env: { ...process.env, TERM: 'xterm-256color' },
        })

        proc.onData((data) => {
          emit({ id, data })
        })

        proc.onExit(({ exitCode }) => {
          emit({ id, exitCode: exitCode ?? 0 })
          sessions.delete(id)
        })

        sessions.set(id, proc)
        return { ok: true, id, shell, cwd }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    },

    /**
     * @param {string} id
     * @param {string} data
     */
    write(id, data) {
      const proc = sessions.get(String(id))
      if (!proc) return { ok: false, error: 'Sessão não encontrada.' }
      try {
        proc.write(String(data ?? ''))
        return { ok: true }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    },

    /**
     * @param {string} id
     * @param {number} cols
     * @param {number} rows
     */
    resize(id, cols, rows) {
      const proc = sessions.get(String(id))
      if (!proc) return { ok: false, error: 'Sessão não encontrada.' }
      try {
        proc.resize(
          Math.max(2, Number(cols) || 80),
          Math.max(2, Number(rows) || 24),
        )
        return { ok: true }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    },

    /** @param {string} id */
    kill(id) {
      const key = String(id)
      const proc = sessions.get(key)
      if (!proc) return { ok: true }
      try {
        proc.kill()
      } catch {
        /* ignore */
      }
      sessions.delete(key)
      return { ok: true }
    },

    disposeAll() {
      for (const [id, proc] of sessions) {
        try {
          proc.kill()
        } catch {
          /* ignore */
        }
        sessions.delete(id)
      }
    },
  }
}

module.exports = { createForgeTerminal, defaultShell }
