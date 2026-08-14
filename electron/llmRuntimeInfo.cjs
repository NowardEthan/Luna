/**
 * Lê modo LLM detectado a partir dos .env (Core + Orbit).
 * Partilhado entre Electron IPC e servidor HTTP Luna.
 */
const fs = require('fs')
const path = require('path')

const DEFAULT_LUNA_CORE_PATH = path.join(
  'C:',
  'Users',
  'ethan',
  'Documents',
  'Core',
  'Luna',
  'src',
  'luna-core',
)

function readDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {}
  /** @type {Record<string, string>} */
  const out = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function isProvedorLocalUrl(baseUrl) {
  if (!baseUrl) return false
  try {
    const host = new URL(baseUrl.includes('://') ? baseUrl : `http://${baseUrl}`)
      .hostname
      .toLowerCase()
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      host.endsWith('.local')
    )
  } catch {
    return /localhost|127\.0\.0\.1/i.test(baseUrl)
  }
}

function resolveLunaCorePath(orbitRoot) {
  if (process.env.LUNA_CORE_PATH?.trim()) {
    return path.resolve(process.env.LUNA_CORE_PATH.trim())
  }
  const orbitEnv = readDotEnv(path.join(orbitRoot, '.env'))
  if (orbitEnv.LUNA_CORE_PATH?.trim()) {
    return path.resolve(orbitEnv.LUNA_CORE_PATH.trim())
  }
  try {
    const { app } = require('electron')
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'luna-core')
    }
  } catch {
    /* fora do Electron */
  }
  return path.resolve(orbitRoot, DEFAULT_LUNA_CORE_PATH)
}

/**
 * @param {{ orbitRoot?: string, lunaCorePath?: string }} [options]
 */
function getLlmRuntimeInfo(options = {}) {
  const orbitRoot = options.orbitRoot
    ? path.resolve(options.orbitRoot)
    : process.cwd()
  const lunaCorePath = options.lunaCorePath
    ? path.resolve(options.lunaCorePath)
    : resolveLunaCorePath(orbitRoot)

  const coreEnv = readDotEnv(path.join(lunaCorePath, '.env'))
  const orbitEnv = readDotEnv(path.join(orbitRoot, '.env'))
  const lunaApiBase = coreEnv.LUNA_API_BASE || ''
  const detectedMode = isProvedorLocalUrl(lunaApiBase) ? 'local' : 'cloud'
  const groqKey = coreEnv.LUNA_API_KEY || orbitEnv.GROQ_API_KEY || ''

  return {
    ok: true,
    detectedMode,
    lunaApiBase,
    modeloMaior: coreEnv.LUNA_MODELO_MAIOR || '',
    modeloMenor: coreEnv.LUNA_MODELO_MENOR || '',
    ollamaBase: orbitEnv.OLLAMA_BASE_URL || '',
    groqConfigured: Boolean(
      groqKey && groqKey !== 'lm-studio' && !groqKey.includes('COLOCA_'),
    ),
    lunaCorePath,
  }
}

module.exports = {
  getLlmRuntimeInfo,
  readDotEnv,
  isProvedorLocalUrl,
  resolveLunaCorePath,
}
