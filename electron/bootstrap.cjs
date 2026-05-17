const fs = require('fs')
const os = require('os')
const path = require('path')

/**
 * App mínimo compatível com getPath('userData' | 'documents').
 * @param {{ dataDir: string, documentsDir?: string }} opts
 */
function createDataApp(opts) {
  const dataDir = path.resolve(opts.dataDir)
  const documentsDir = path.resolve(
    opts.documentsDir || path.join(os.homedir(), 'Documents'),
  )
  fs.mkdirSync(dataDir, { recursive: true })
  return {
    getPath: (name) => {
      if (name === 'userData') return dataDir
      if (name === 'documents') return documentsDir
      return dataDir
    },
  }
}

function resolveDataDir() {
  if (process.env.LUNA_DATA_DIR?.trim()) {
    return path.resolve(process.env.LUNA_DATA_DIR.trim())
  }
  return path.join(
    process.env.APPDATA || os.homedir(),
    'Luna',
    'userData',
  )
}

/**
 * Inicializa RAG, memória semântica e ferramentas do agente.
 * @param {{ dataDir?: string, documentsDir?: string }} [opts]
 */
async function createLunaServices(opts = {}) {
  const dataDir = opts.dataDir
    ? path.resolve(opts.dataDir)
    : resolveDataDir()

  const dataApp = createDataApp({
    dataDir,
    documentsDir: opts.documentsDir,
  })

  const rag = require('./ragService.cjs')
  const chatMemory = require('./conversationMemoryService.cjs')
  const { createAgentTools } = require('./agentTools.cjs')
  const {
    llmChat,
    llmChatStream,
    llmVisionDescribe,
    listLunaModels,
    llmEmbed,
  } = require('./llmHandlers.cjs')
  const { translateText } = require('./translation/index.cjs')

  await rag.init(dataApp)
  await chatMemory.init(dataApp)
  const agentTools = createAgentTools(dataApp, rag)

  return {
    dataDir,
    rag,
    chatMemory,
    agentTools,
    llmChat,
    llmChatStream,
    llmVisionDescribe,
    listLunaModels,
    llmEmbed,
    translateText,
  }
}

module.exports = {
  createLunaServices,
  createDataApp,
  resolveDataDir,
}
