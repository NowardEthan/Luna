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

app.whenReady().then(async () => {
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
