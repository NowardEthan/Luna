const fs = require('fs')
const path = require('path')

function readBrandName() {
  try {
    const p = path.join(__dirname, '..', 'src', 'brand.json')
    const j = JSON.parse(fs.readFileSync(p, 'utf8'))
    return typeof j.BRAND_APP_NAME === 'string' ? j.BRAND_APP_NAME : 'Luna v1'
  } catch {
    return 'Luna v1'
  }
}

const BRAND_APP_NAME = readBrandName()

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
})

const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron')
const { createLunaServices } = require('./bootstrap.cjs')
const { registerGoogleOAuth } = require('./googleOAuth.cjs')

const isDev = process.env.NODE_ENV === 'development'
const USE_HTTP_SERVER = process.env.LUNA_USE_SERVER !== '0'

Menu.setApplicationMenu(null)

const CHAT_WINDOW = { width: 560, height: 780, minWidth: 400, minHeight: 480 }
const IDE_WINDOW = { width: 1280, height: 800, minWidth: 900, minHeight: 560 }
function applyWorkbenchBounds(win, mode) {
  const b = mode === 'ide' ? IDE_WINDOW : CHAT_WINDOW
  win.setMinimumSize(b.minWidth, b.minHeight)
  win.setSize(b.width, b.height, true)
}

function createWindow() {
  const win = new BrowserWindow({
    width: CHAT_WINDOW.width,
    height: CHAT_WINDOW.height,
    minWidth: CHAT_WINDOW.minWidth,
    minHeight: CHAT_WINDOW.minHeight,
    title: BRAND_APP_NAME,
    backgroundColor: '#161618',
    show: false,
    frame: false,
    webPreferences: {
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  if (isDev) {
    const devUrl = 'http://127.0.0.1:5173'
    win.webContents.openDevTools({ mode: 'detach' })
    loadDevUrlWithRetry(win, devUrl)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

/** Em dev o Vite pode ainda não estar pronto quando o Electron abre. */
function loadDevUrlWithRetry(win, url) {
  const wc = win.webContents
  let attempt = 0
  const maxAttempts = 90
  const retryable = new Set([-102, -106, -105]) // refused, offline, name not resolved

  const scheduleRetry = () => {
    if (attempt >= maxAttempts) {
      console.error(
        `[electron] Vite indisponivel em ${url}. Corre "npm run dev:web" ou "npm run dev".`,
      )
      return
    }
    if (attempt === 0) {
      console.warn(
        `[electron] A aguardar Vite em ${url} (npm run dev:web ou npm run dev)...`,
      )
    }
    attempt += 1
    setTimeout(() => {
      wc.loadURL(url).catch(() => {})
    }, 1500)
  }

  const onFail = (_event, errorCode, _desc, validatedURL) => {
    if (!String(validatedURL).startsWith(url)) return
    if (!retryable.has(errorCode)) return
    scheduleRetry()
  }

  wc.on('did-fail-load', onFail)
  wc.once('did-finish-load', () => wc.removeListener('did-fail-load', onFail))
  wc.loadURL(url).catch(() => scheduleRetry())
}

function registerIpc(services) {
  const {
    rag,
    chatMemory,
    agentTools,
    llmChat,
    llmChatStream,
    llmVisionDescribe,
    listLunaModels,
    translateText,
  } = services

  registerGoogleOAuth(ipcMain)

  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.handle('window:maximizeToggle', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  ipcMain.handle('window:setWorkbenchLayout', (event, mode) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    applyWorkbenchBounds(win, mode === 'ide' ? 'ide' : 'chat')
  })

  if (USE_HTTP_SERVER) {
    ipcMain.handle('rag:pickFolder', async () => {
      const r = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      })
      if (r.canceled || !r.filePaths[0]) {
        return { canceled: true, path: null }
      }
      return { canceled: false, path: r.filePaths[0] }
    })

    ipcMain.handle('rag:pickFiles', async () => {
      const r = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          {
            name: 'Texto e código',
            extensions: [
              'md',
              'txt',
              'ts',
              'tsx',
              'js',
              'jsx',
              'mjs',
              'cjs',
              'json',
              'html',
              'htm',
              'css',
              'scss',
              'less',
              'csv',
              'log',
              'py',
              'rs',
              'go',
              'yaml',
              'yml',
              'xml',
              'sql',
              'sh',
              'env',
            ],
          },
          { name: 'Todos os arquivos', extensions: ['*'] },
        ],
      })
      if (r.canceled || !r.filePaths.length) {
        return { canceled: true, paths: [] }
      }
      return { canceled: false, paths: r.filePaths }
    })
    return
  }

  ipcMain.handle('translation:translate', async (_event, payload) => {
    const text = typeof payload?.text === 'string' ? payload.text : ''
    const to = typeof payload?.to === 'string' ? payload.to : 'pt'
    const from =
      typeof payload?.from === 'string' && payload.from.trim()
        ? payload.from.trim()
        : undefined
    return translateText(text, { to, ...(from ? { from } : {}) })
  })

  ipcMain.handle('llm:listModels', () => listLunaModels())

  ipcMain.handle('llm:chat', async (_event, payload) => llmChat(payload))

  ipcMain.handle('llm:chatStream', async (event, payload) => {
    const { channel, requestId, ...raw } = payload ?? {}
    const send = (msg) => {
      if (channel && requestId) {
        event.sender.send(channel, { requestId, ...msg })
      }
    }
    return llmChatStream(raw, send)
  })

  ipcMain.handle('llm:visionDescribe', async (_event, payload) =>
    llmVisionDescribe(payload),
  )

  ipcMain.handle('together:chat', async (_event, payload) => llmChat(payload))
  ipcMain.handle('together:visionDescribe', async (_event, payload) =>
    llmVisionDescribe(payload),
  )

  ipcMain.handle('rag:status', () => rag.getStatus())
  ipcMain.handle('rag:clear', () => rag.clearIndex())
  ipcMain.handle('rag:indexFolder', async (_event, folderPath) => {
    if (typeof folderPath !== 'string' || !folderPath.trim()) {
      return { ok: false, error: 'Caminho da pasta inválido.' }
    }
    return rag.indexFolder(folderPath.trim())
  })
  ipcMain.handle('rag:indexFiles', async (_event, filePaths) => {
    if (!Array.isArray(filePaths)) {
      return { ok: false, error: 'Lista de arquivos inválida.' }
    }
    const paths = filePaths.filter((p) => typeof p === 'string' && p.trim())
    return rag.indexFilePaths(paths)
  })
  ipcMain.handle('rag:retrieve', async (_event, query) => {
    if (typeof query !== 'string') {
      return {
        ok: false,
        error: 'Consulta inválida.',
        context: '',
        citations: [],
      }
    }
    return rag.retrieve(query)
  })

  ipcMain.handle('chatMemory:sync', async (_event, payload) =>
    chatMemory.syncFromPayload(payload),
  )
  ipcMain.handle('chatMemory:retrieve', async (_event, query) => {
    if (typeof query !== 'string') {
      return { ok: false, error: 'Consulta inválida.', text: '' }
    }
    return chatMemory.retrieve(query)
  })
  ipcMain.handle('chatMemory:status', () => chatMemory.getStatus())
  ipcMain.handle('chatMemory:clear', () => chatMemory.clearIndex())

  ipcMain.handle('agentTools:listDirectory', (_event, dirPath) =>
    agentTools.listDirectory(dirPath),
  )
  ipcMain.handle('agentTools:readFile', (_event, filePath, maxChars) =>
    agentTools.readFile(filePath, maxChars),
  )
  ipcMain.handle('agentTools:webSearch', (_event, query) =>
    agentTools.webSearch(query),
  )
  ipcMain.handle('agentTools:setWorkspaceRoot', (_event, rootPath) =>
    agentTools.setWorkspaceRoot(rootPath),
  )
  ipcMain.handle('agentTools:writeFile', (_event, filePath, content) =>
    agentTools.writeFile(filePath, content),
  )
  ipcMain.handle('agentTools:grep', (_event, pattern, searchPath, options) =>
    agentTools.grep(pattern, searchPath, options),
  )
  ipcMain.handle('agentTools:glob', (_event, pattern, searchPath) =>
    agentTools.glob(pattern, searchPath),
  )
  ipcMain.handle('agentTools:runCommand', (_event, command, cwd, options) =>
    agentTools.runCommand(command, cwd, options),
  )
  ipcMain.handle('agentTools:gitStatus', (_event, repoPath) =>
    agentTools.gitStatus(repoPath),
  )
  ipcMain.handle('agentTools:gitDiff', (_event, repoPath, staged) =>
    agentTools.gitDiff(repoPath, staged),
  )
  ipcMain.handle('agentTools:gitCommit', (_event, repoPath, message) =>
    agentTools.gitCommit(repoPath, message),
  )

  ipcMain.handle('rag:pickFolder', async () => {
    const r = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    if (r.canceled || !r.filePaths[0]) {
      return { canceled: true, path: null }
    }
    return { canceled: false, path: r.filePaths[0] }
  })

  ipcMain.handle('rag:pickFiles', async () => {
    const r = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Texto e código',
          extensions: [
            'md',
            'txt',
            'ts',
            'tsx',
            'js',
            'jsx',
            'mjs',
            'cjs',
            'json',
            'html',
            'htm',
            'css',
            'scss',
            'less',
            'csv',
            'log',
            'py',
            'rs',
            'go',
            'yaml',
            'yml',
            'xml',
            'sql',
            'sh',
            'env',
          ],
        },
        { name: 'Todos os arquivos', extensions: ['*'] },
      ],
    })
    if (r.canceled || !r.filePaths.length) {
      return { canceled: true, paths: [] }
    }
    return { canceled: false, paths: r.filePaths }
  })
}

function userPluginsDir() {
  return path.join(app.getPath('userData'), 'luna', 'plugins')
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name)
    const d = path.join(dest, ent.name)
    if (ent.isDirectory()) copyDirRecursive(s, d)
    else fs.copyFileSync(s, d)
  }
}

function resolvePluginEntryFile(dir, manifest) {
  const candidates = []
  const entry = manifest.entry?.trim()
  if (entry) candidates.push(entry)
  candidates.push('index.js', 'index.mjs', 'index.cjs')
  for (const file of candidates) {
    const full = path.join(dir, file)
    if (fs.existsSync(full)) return full
    if (file.endsWith('.ts')) {
      const js = full.replace(/\.ts$/, '.js')
      if (fs.existsSync(js)) return js
    }
  }
  return null
}

function bundledPluginsDir() {
  return path.join(__dirname, '..', '.luna', 'plugins')
}

function installPluginFromDirectory(src) {
  const manifestPath = path.join(src, 'plugin.json')
  if (!fs.existsSync(manifestPath)) {
    return { ok: false, error: 'plugin.json não encontrado na pasta seleccionada.' }
  }
  let manifest
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  } catch {
    return { ok: false, error: 'plugin.json inválido.' }
  }
  if (!manifest.id || !manifest.name) {
    return { ok: false, error: 'plugin.json deve incluir id e name.' }
  }
  const dest = path.join(userPluginsDir(), manifest.id)
  fs.mkdirSync(userPluginsDir(), { recursive: true })
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true })
  }
  copyDirRecursive(src, dest)

  let needsReload = false
  if (isDev) {
    const projectDest = path.join(bundledPluginsDir(), manifest.id)
    fs.mkdirSync(path.dirname(projectDest), { recursive: true })
    if (fs.existsSync(projectDest)) {
      fs.rmSync(projectDest, { recursive: true, force: true })
    }
    copyDirRecursive(src, projectDest)
    needsReload = true
  }

  return {
    ok: true,
    manifest,
    rootPath: dest,
    needsReload,
    installedAt: new Date().toISOString(),
  }
}

function registerPluginIpcHandlers() {
  if (ipcMain.listenerCount('plugins:pickAndInstall') > 0) return

  ipcMain.handle('plugins:pickAndInstall', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const r = await dialog.showOpenDialog(win ?? undefined, {
      properties: ['openDirectory'],
      title: 'Seleccionar pasta do add-on',
    })
    if (r.canceled || !r.filePaths[0]) {
      return { ok: false, canceled: true }
    }
    return installPluginFromDirectory(r.filePaths[0])
  })

  ipcMain.handle('plugins:installBundled', async (_event, pluginId) => {
    if (!pluginId || typeof pluginId !== 'string') {
      return { ok: false, error: 'ID do add-on inválido.' }
    }
    const src = path.join(bundledPluginsDir(), pluginId)
    if (!fs.existsSync(src)) {
      return {
        ok: false,
        error: `Add-on «${pluginId}» não está incluído nesta instalação da Luna.`,
      }
    }
    return installPluginFromDirectory(src)
  })

  ipcMain.handle('plugins:uninstall', async (_event, pluginId) => {
    if (!pluginId || typeof pluginId !== 'string') {
      return { ok: false, error: 'ID inválido.' }
    }
    const dest = path.join(userPluginsDir(), pluginId)
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true })
    }
    if (isDev) {
      const projectDest = path.join(__dirname, '..', '.luna', 'plugins', pluginId)
      if (fs.existsSync(projectDest)) {
        fs.rmSync(projectDest, { recursive: true, force: true })
      }
    }
    return { ok: true }
  })

  ipcMain.handle('plugins:readEntry', async (_event, pluginId) => {
    if (!pluginId || typeof pluginId !== 'string') {
      return { ok: false, error: 'ID inválido.' }
    }
    const dir = path.join(userPluginsDir(), pluginId)
    const manifestPath = path.join(dir, 'plugin.json')
    if (!fs.existsSync(manifestPath)) {
      return { ok: false, error: 'Add-on não encontrado.' }
    }
    let manifest
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    } catch {
      return { ok: false, error: 'plugin.json inválido.' }
    }
    const entryFile = resolvePluginEntryFile(dir, manifest)
    if (!entryFile) {
      return {
        ok: false,
        error:
          'Ficheiro de entrada não encontrado. Use index.js ou compile TypeScript para JavaScript.',
      }
    }
    const source = fs.readFileSync(entryFile, 'utf8')
    return { ok: true, source, entry: path.basename(entryFile) }
  })
}

app.whenReady().then(async () => {
  registerPluginIpcHandlers()
  if (!USE_HTTP_SERVER) {
    const services = await createLunaServices()
    registerIpc(services)
  } else {
    registerIpc({})
  }
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
