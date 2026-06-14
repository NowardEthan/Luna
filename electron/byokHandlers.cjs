/**
 * IPC BYOK — testar, guardar e resolver config para o Luna Core.
 */
const vault = require('./byokVault.cjs')

/** @type {Record<string, { baseUrl: string, defaultModelMenor: string, defaultModelMaior: string, optionalKey?: boolean }>} */
const PROVIDERS = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModelMenor: 'gpt-4o-mini',
    defaultModelMaior: 'gpt-4o',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModelMenor: 'llama-3.1-8b-instant',
    defaultModelMaior: 'openai/gpt-oss-120b',
  },
  together: {
    baseUrl: 'https://api.together.xyz/v1',
    defaultModelMenor: 'meta-llama/Llama-3.2-3B-Instruct-Turbo',
    defaultModelMaior: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    defaultModelMenor: 'gemini-2.0-flash-lite',
    defaultModelMaior: 'gemini-2.0-flash',
  },
  claude: {
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModelMenor: 'anthropic/claude-3-haiku',
    defaultModelMaior: 'anthropic/claude-sonnet-4',
  },
  lmstudio: {
    baseUrl: 'http://127.0.0.1:1234/v1',
    defaultModelMenor: 'local',
    defaultModelMaior: 'local',
    optionalKey: true,
  },
  ollama: {
    baseUrl: 'http://127.0.0.1:11434/v1',
    defaultModelMenor: 'llama3.2',
    defaultModelMaior: 'llama3.2',
    optionalKey: true,
  },
}

function normalizeBaseUrl(url) {
  const t = (url || '').trim()
  if (!t) return ''
  return t.endsWith('/') ? t.slice(0, -1) : t
}

/**
 * @param {{ providerId: string, apiKey?: string, baseUrl?: string, modelMenor?: string, modelMaior?: string }} input
 */
function buildConfigLuna(input) {
  const def = PROVIDERS[input.providerId]
  if (!def) return null

  const apiKey = (input.apiKey || '').trim() || (def.optionalKey ? 'local' : '')
  if (!apiKey && !def.optionalKey) return null

  const baseUrl = normalizeBaseUrl(input.baseUrl) || def.baseUrl
  const modeloMenor = (input.modelMenor || '').trim() || def.defaultModelMenor
  const modeloMaior = (input.modelMaior || '').trim() || def.defaultModelMaior

  return {
    apiKey,
    baseUrl,
    modeloMenor,
    modeloMaior,
    temperaturaMenor: 0,
    temperaturaMaior: 0.85,
  }
}

async function testProviderConnection(input) {
  const config = buildConfigLuna(input)
  if (!config) {
    return { ok: false, error: 'Provedor ou chave inválidos.' }
  }

  const url = `${config.baseUrl}/models`
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    })
    if (res.ok) {
      return { ok: true }
    }
    const text = await res.text()
    return {
      ok: false,
      error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

/**
 * Resolve config ativa para pipeline (main process — chave nunca vai ao renderer).
 * @param {string} uid
 * @param {{ activeProviderId?: string, providers?: Record<string, object> }} meta
 */
function resolvePipelineConfig(uid, meta) {
  const providerId = meta?.activeProviderId
  if (!providerId) return null

  const row = meta?.providers?.[providerId]
  if (!row) return null

  const apiKey = vault.getProviderKey(uid, providerId)
  if (!apiKey && !PROVIDERS[providerId]?.optionalKey) return null

  return buildConfigLuna({
    providerId,
    apiKey: apiKey || 'local',
    baseUrl: row.baseUrl,
    modelMenor: row.modelMenor,
    modelMaior: row.modelMaior,
  })
}

function registerByokHandlers(ipcMain) {
  ipcMain.handle('byok:canEncrypt', () => ({ ok: true, available: vault.canEncrypt() }))

  ipcMain.handle('byok:saveKey', (_e, payload) => {
    const uid = String(payload?.uid || '')
    const providerId = String(payload?.providerId || '')
    const apiKey = String(payload?.apiKey || '')
    if (!uid || !providerId) {
      return { ok: false, error: 'uid e providerId obrigatórios.' }
    }
    const def = PROVIDERS[providerId]
    if (!def) return { ok: false, error: 'Provedor desconhecido.' }
    if (!apiKey.trim() && !def.optionalKey) {
      return { ok: false, error: 'Informe a chave API.' }
    }
    return vault.saveProviderKey(uid, providerId, apiKey.trim() || 'local')
  })

  ipcMain.handle('byok:deleteKey', (_e, payload) => {
    const uid = String(payload?.uid || '')
    const providerId = String(payload?.providerId || '')
    if (!uid || !providerId) return { ok: false, error: 'uid e providerId obrigatórios.' }
    return vault.deleteProviderKey(uid, providerId)
  })

  ipcMain.handle('byok:listKeyHints', (_e, uid) => {
    if (!uid) return { ok: false, error: 'uid obrigatório.' }
    return { ok: true, hints: vault.listKeyHints(String(uid)) }
  })

  ipcMain.handle('byok:test', async (_e, payload) => {
    return testProviderConnection(payload || {})
  })
}

module.exports = {
  registerByokHandlers,
  resolvePipelineConfig,
  buildConfigLuna,
}
