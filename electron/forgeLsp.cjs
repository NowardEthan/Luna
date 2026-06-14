const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const LSP_LANG_IDS = new Set([
  'typescript',
  'javascript',
  'typescriptreact',
  'javascriptreact',
  'json',
])

/** @param {string} p */
function pathToUri(p) {
  const normalized = path.resolve(p).replace(/\\/g, '/')
  if (/^[A-Za-z]:/.test(normalized)) {
    return `file:///${encodeURI(normalized).replace(/#/g, '%23')}`
  }
  return `file://${encodeURI(normalized)}`
}

/** @param {string} uri */
function uriToPath(uri) {
  if (!uri || typeof uri !== 'string') return null
  try {
    const u = new URL(uri)
    let p = decodeURIComponent(u.pathname)
    if (/^\/[A-Za-z]:/.test(p)) p = p.slice(1)
    return path.resolve(p.replace(/\//g, path.sep))
  } catch {
    return null
  }
}

/** @param {string} languageId */
function mapLanguageId(languageId) {
  const id = String(languageId ?? '').toLowerCase()
  if (id === 'typescriptreact') return 'typescriptreact'
  if (id === 'javascriptreact') return 'javascriptreact'
  if (id === 'typescript') return 'typescript'
  if (id === 'javascript') return 'javascript'
  if (id === 'json') return 'json'
  return id
}

class ForgeLspSession {
  /**
   * @param {string} workspaceRoot
   * @param {(payload: { path: string, diagnostics: unknown[] }) => void} onDiagnostics
   */
  constructor(workspaceRoot, onDiagnostics) {
    this.workspaceRoot = workspaceRoot
    this.onDiagnostics = onDiagnostics
    this.proc = null
    this.buffer = Buffer.alloc(0)
    /** @type {Map<number, { resolve: (v: unknown) => void, reject: (e: Error) => void }>} */
    this.pending = new Map()
    this.nextId = 1
    this.ready = false
    /** @type {Map<string, { version: number, languageId: string }>} */
    this.openDocs = new Map()
    this.startPromise = null
  }

  /** @returns {Promise<void>} */
  ensureStarted() {
    if (this.ready) return Promise.resolve()
    if (this.startPromise) return this.startPromise
    this.startPromise = this.start()
    return this.startPromise
  }

  async start() {
    const bin =
      process.platform === 'win32'
        ? path.join(
            __dirname,
            '..',
            'node_modules',
            '.bin',
            'typescript-language-server.cmd',
          )
        : path.join(
            __dirname,
            '..',
            'node_modules',
            '.bin',
            'typescript-language-server',
          )

    let cmd = bin
    let args = ['--stdio']
    if (!fs.existsSync(bin)) {
      cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx'
      args = ['typescript-language-server', '--stdio']
    }

    this.proc = spawn(cmd, args, {
      cwd: this.workspaceRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true,
    })

    this.proc.stdout.on('data', (chunk) => this.onStdout(chunk))
    this.proc.stderr.on('data', () => {
      /* ignore noisy logs */
    })
    this.proc.on('exit', () => {
      this.ready = false
      this.proc = null
      for (const [, p] of this.pending) {
        p.reject(new Error('LSP encerrado'))
      }
      this.pending.clear()
    })

    await this.request('initialize', {
      processId: process.pid,
      rootUri: pathToUri(this.workspaceRoot),
      capabilities: {
        textDocument: {
          synchronization: { dynamicRegistration: false },
          completion: {
            completionItem: {
              snippetSupport: false,
              commitCharactersSupport: true,
            },
          },
          hover: { contentFormat: ['plaintext', 'markdown'] },
          publishDiagnostics: { relatedInformation: true },
        },
      },
      workspaceFolders: [
        { uri: pathToUri(this.workspaceRoot), name: path.basename(this.workspaceRoot) },
      ],
    })

    this.notify('initialized', {})
    this.ready = true
  }

  /** @param {Buffer} chunk */
  onStdout(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk])
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n')
      if (headerEnd === -1) return
      const header = this.buffer.slice(0, headerEnd).toString('utf8')
      const match = header.match(/Content-Length:\s*(\d+)/i)
      if (!match) {
        this.buffer = this.buffer.slice(headerEnd + 4)
        continue
      }
      const len = Number(match[1])
      const start = headerEnd + 4
      if (this.buffer.length < start + len) return
      const body = this.buffer.slice(start, start + len).toString('utf8')
      this.buffer = this.buffer.slice(start + len)
      try {
        const msg = JSON.parse(body)
        this.handleMessage(msg)
      } catch {
        /* ignore */
      }
    }
  }

  /** @param {Record<string, unknown>} msg */
  handleMessage(msg) {
    if (msg.method === 'textDocument/publishDiagnostics') {
      const params = msg.params
      if (!params || typeof params !== 'object') return
      const uri = params.uri
      const filePath = uriToPath(String(uri ?? ''))
      if (!filePath) return
      const diags = Array.isArray(params.diagnostics) ? params.diagnostics : []
      this.onDiagnostics({ path: filePath, diagnostics: diags })
      return
    }
    if (msg.id !== undefined) {
      const pending = this.pending.get(msg.id)
      if (!pending) return
      this.pending.delete(msg.id)
      if (msg.error) {
        pending.reject(new Error(String(msg.error.message ?? 'LSP error')))
      } else {
        pending.resolve(msg.result)
      }
    }
  }

  /**
   * @param {string} method
   * @param {unknown} params
   */
  request(method, params) {
    return new Promise((resolve, reject) => {
      if (!this.proc?.stdin) {
        reject(new Error('LSP não iniciado'))
        return
      }
      const id = this.nextId++
      const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params })
      const header = `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n`
      this.proc.stdin.write(header + payload, 'utf8')
      this.pending.set(id, { resolve, reject })
    })
  }

  /**
   * @param {string} method
   * @param {unknown} params
   */
  notify(method, params) {
    if (!this.proc?.stdin) return
    const payload = JSON.stringify({ jsonrpc: '2.0', method, params })
    const header = `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n`
    this.proc.stdin.write(header + payload, 'utf8')
  }

  /**
   * @param {{ path: string, languageId: string, text: string, version?: number }} doc
   */
  async openDocument(doc) {
    const languageId = mapLanguageId(doc.languageId)
    if (!LSP_LANG_IDS.has(languageId)) return { ok: false, error: 'Linguagem sem LSP' }
    await this.ensureStarted()
    const version = doc.version ?? 1
    this.openDocs.set(doc.path, { version, languageId })
    this.notify('textDocument/didOpen', {
      textDocument: {
        uri: pathToUri(doc.path),
        languageId,
        version,
        text: String(doc.text ?? ''),
      },
    })
    return { ok: true }
  }

  /**
   * @param {{ path: string, text: string, version: number }} doc
   */
  async changeDocument(doc) {
    const meta = this.openDocs.get(doc.path)
    if (!meta) return { ok: false, error: 'Documento não aberto' }
    await this.ensureStarted()
    meta.version = doc.version
    this.notify('textDocument/didChange', {
      textDocument: { uri: pathToUri(doc.path), version: doc.version },
      contentChanges: [{ text: String(doc.text ?? '') }],
    })
    return { ok: true }
  }

  /** @param {string} filePath */
  async closeDocument(filePath) {
    if (!this.openDocs.has(filePath)) return { ok: true }
    await this.ensureStarted()
    this.openDocs.delete(filePath)
    this.notify('textDocument/didClose', {
      textDocument: { uri: pathToUri(filePath) },
    })
    return { ok: true }
  }

  /**
   * @param {{ path: string, line: number, character: number }} pos
   */
  async completion(pos) {
    await this.ensureStarted()
    const result = await this.request('textDocument/completion', {
      textDocument: { uri: pathToUri(pos.path) },
      position: { line: Math.max(0, pos.line - 1), character: Math.max(0, pos.character - 1) },
    })
    return { ok: true, result }
  }

  /**
   * @param {{ path: string, line: number, character: number }} pos
   */
  async hover(pos) {
    await this.ensureStarted()
    const result = await this.request('textDocument/hover', {
      textDocument: { uri: pathToUri(pos.path) },
      position: { line: Math.max(0, pos.line - 1), character: Math.max(0, pos.character - 1) },
    })
    return { ok: true, result }
  }

  /**
   * @param {{ path: string, line: number, character: number }} pos
   */
  async definition(pos) {
    await this.ensureStarted()
    const result = await this.request('textDocument/definition', {
      textDocument: { uri: pathToUri(pos.path) },
      position: { line: Math.max(0, pos.line - 1), character: Math.max(0, pos.character - 1) },
    })
    return { ok: true, result }
  }

  dispose() {
    for (const filePath of [...this.openDocs.keys()]) {
      void this.closeDocument(filePath)
    }
    if (this.proc) {
      this.proc.kill()
      this.proc = null
    }
    this.ready = false
    this.startPromise = null
  }
}

/**
 * @param {(payload: { path: string, diagnostics: unknown[] }) => void} emitDiagnostics
 */
function createForgeLsp(emitDiagnostics) {
  /** @type {ForgeLspSession | null} */
  let session = null
  /** @type {string | null} */
  let currentRoot = null

  return {
    /**
     * @param {string} workspaceRoot
     */
    async setWorkspaceRoot(workspaceRoot) {
      const root = String(workspaceRoot ?? '').trim()
      if (!root) {
        session?.dispose()
        session = null
        currentRoot = null
        return { ok: true }
      }
      if (currentRoot === root && session) return { ok: true, path: root }
      session?.dispose()
      currentRoot = root
      session = new ForgeLspSession(root, emitDiagnostics)
      try {
        await session.ensureStarted()
        return { ok: true, path: root }
      } catch (e) {
        session.dispose()
        session = null
        currentRoot = null
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    },

    openDocument: (doc) => session?.openDocument(doc) ?? Promise.resolve({ ok: false }),
    changeDocument: (doc) => session?.changeDocument(doc) ?? Promise.resolve({ ok: false }),
    closeDocument: (filePath) =>
      session?.closeDocument(filePath) ?? Promise.resolve({ ok: true }),
    completion: (pos) => session?.completion(pos) ?? Promise.resolve({ ok: false }),
    hover: (pos) => session?.hover(pos) ?? Promise.resolve({ ok: false }),
    definition: (pos) => session?.definition(pos) ?? Promise.resolve({ ok: false }),

    dispose() {
      session?.dispose()
      session = null
      currentRoot = null
    },
  }
}

module.exports = { createForgeLsp, pathToUri, uriToPath, LSP_LANG_IDS }
