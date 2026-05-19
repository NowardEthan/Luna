const { contextBridge, ipcRenderer } = require('electron')

const LUNA_SERVER_PORT = process.env.LUNA_SERVER_PORT || '39281'
const LUNA_SERVER_HOST = process.env.LUNA_SERVER_HOST || '127.0.0.1'
const useHttpServer = process.env.LUNA_USE_SERVER !== '0'

if (useHttpServer) {
  contextBridge.exposeInMainWorld('lunaServer', {
    baseUrl: `http://${LUNA_SERVER_HOST}:${LUNA_SERVER_PORT}`,
  })
}

contextBridge.exposeInMainWorld('electron', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximizeToggle: () => ipcRenderer.invoke('window:maximizeToggle'),
  close: () => ipcRenderer.invoke('window:close'),
  setWorkbenchLayout: (mode) =>
    ipcRenderer.invoke('window:setWorkbenchLayout', mode),
  /** OAuth Google no browser do sistema (Electron). */
  googleSignIn: () => ipcRenderer.invoke('auth:googleSignIn'),
})

contextBridge.exposeInMainWorld('translation', {
  translate: (payload) => ipcRenderer.invoke('translation:translate', payload),
})

const llmBridge = {
  listModels: () => ipcRenderer.invoke('llm:listModels'),
  chat: (payload) => ipcRenderer.invoke('llm:chat', payload),
  chatStream: (payload, callbacks) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    const channel = `llm:stream:${requestId}`
    return new Promise((resolve, reject) => {
      const onEvent = (_event, data) => {
        if (!data || data.requestId !== requestId) return
        switch (data.type) {
          case 'content':
            callbacks?.onContent?.(data.delta ?? '', data.full ?? '')
            break
          case 'reasoning':
            callbacks?.onReasoning?.(data.delta ?? '', data.full ?? '')
            break
          case 'tools_pending':
            callbacks?.onToolsPending?.()
            break
          default:
            break
        }
      }
      ipcRenderer.on(channel, onEvent)
      ipcRenderer
        .invoke('llm:chatStream', { ...payload, channel, requestId })
        .then((result) => {
          ipcRenderer.removeListener(channel, onEvent)
          if (result && typeof result === 'object' && result.ok) {
            resolve(result)
          } else {
            reject(
              new Error(
                (result && result.error) || 'Erro no streaming do LLM',
              ),
            )
          }
        })
        .catch((err) => {
          ipcRenderer.removeListener(channel, onEvent)
          reject(err)
        })
    })
  },
  visionDescribe: (payload) =>
    ipcRenderer.invoke('llm:visionDescribe', payload),
}

contextBridge.exposeInMainWorld('llm', llmBridge)
contextBridge.exposeInMainWorld('together', llmBridge)

contextBridge.exposeInMainWorld('rag', {
  status: () => ipcRenderer.invoke('rag:status'),
  clear: () => ipcRenderer.invoke('rag:clear'),
  /** @param {string} folderPath */
  indexFolder: (folderPath) =>
    ipcRenderer.invoke('rag:indexFolder', folderPath),
  /** @param {string[]} filePaths */
  indexFiles: (filePaths) => ipcRenderer.invoke('rag:indexFiles', filePaths),
  /** @param {string} query */
  retrieve: (query) => ipcRenderer.invoke('rag:retrieve', query),
  pickFolder: () => ipcRenderer.invoke('rag:pickFolder'),
  pickFiles: () => ipcRenderer.invoke('rag:pickFiles'),
})

contextBridge.exposeInMainWorld('chatMemory', {
  /** @param {{ conversations: unknown[] }} payload */
  sync: (payload) => ipcRenderer.invoke('chatMemory:sync', payload),
  /** @param {string} query */
  retrieve: (query) => ipcRenderer.invoke('chatMemory:retrieve', query),
  status: () => ipcRenderer.invoke('chatMemory:status'),
  clear: () => ipcRenderer.invoke('chatMemory:clear'),
})

contextBridge.exposeInMainWorld('agentTools', {
  listDirectory: (dirPath) =>
    ipcRenderer.invoke('agentTools:listDirectory', dirPath),
  readFile: (filePath, maxChars) =>
    ipcRenderer.invoke('agentTools:readFile', filePath, maxChars),
  webSearch: (query) => ipcRenderer.invoke('agentTools:webSearch', query),
  setWorkspaceRoot: (rootPath) =>
    ipcRenderer.invoke('agentTools:setWorkspaceRoot', rootPath),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke('agentTools:writeFile', filePath, content),
  grep: (pattern, searchPath, options) =>
    ipcRenderer.invoke('agentTools:grep', pattern, searchPath, options),
  glob: (pattern, searchPath) =>
    ipcRenderer.invoke('agentTools:glob', pattern, searchPath),
  runCommand: (command, cwd, options) =>
    ipcRenderer.invoke('agentTools:runCommand', command, cwd, options),
  gitStatus: (repoPath) => ipcRenderer.invoke('agentTools:gitStatus', repoPath),
  gitDiff: (repoPath, staged) =>
    ipcRenderer.invoke('agentTools:gitDiff', repoPath, staged),
  gitCommit: (repoPath, message) =>
    ipcRenderer.invoke('agentTools:gitCommit', repoPath, message),
})

contextBridge.exposeInMainWorld('plugins', {
  pickAndInstall: () => ipcRenderer.invoke('plugins:pickAndInstall'),
  installBundled: (pluginId) =>
    ipcRenderer.invoke('plugins:installBundled', pluginId),
  uninstall: (pluginId) => ipcRenderer.invoke('plugins:uninstall', pluginId),
  readEntry: (pluginId) => ipcRenderer.invoke('plugins:readEntry', pluginId),
})
