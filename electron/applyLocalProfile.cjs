const fs = require('fs')
const path = require('path')
const { resolveLunaCorePath } = require('./llmRuntimeInfo.cjs')

/** @param {string} existingRaw @param {Record<string, string>} patch */
function mergeEnvPatch(existingRaw, patch) {
  /** @type {Record<string, string>} */
  const map = {}
  for (const line of (existingRaw || '').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    map[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1)
  }
  for (const [key, val] of Object.entries(patch)) {
    map[key] = val
  }
  return Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
    .concat('\n')
}

/**
 * Grava perfil local nos .env (Core + Orbit) sem apagar outras chaves.
 * @param {object} profile
 * @param {string} [orbitRoot]
 */
function applyLocalProfileToEnv(profile, orbitRoot = process.cwd()) {
  const baseUrl = String(profile?.baseUrl || 'http://127.0.0.1:1234/v1').replace(/\/$/, '')
  const apiKey = String(profile?.apiKey || 'lm-studio')
  const modeloMenor = String(profile?.modeloMenor || profile?.modeloMaior || '').trim()
  const modeloMaior = String(profile?.modeloMaior || modeloMenor).trim()
  const temperatura =
    typeof profile?.temperaturaMaior === 'number' && !Number.isNaN(profile.temperaturaMaior)
      ? String(profile.temperaturaMaior)
      : '0.85'

  if (!modeloMenor || !modeloMaior) {
    return { ok: false, error: 'Escolhe modelo menor e maior antes de aplicar ao .env.' }
  }

  const lunaCorePath = resolveLunaCorePath(orbitRoot)
  const coreEnvPath = path.join(lunaCorePath, '.env')
  const orbitEnvPath = path.join(orbitRoot, '.env')

  const corePatch = {
    LUNA_API_KEY: apiKey,
    LUNA_API_BASE: baseUrl,
    LUNA_MODELO_MENOR: modeloMenor,
    LUNA_MODELO_MAIOR: modeloMaior,
    LUNA_TEMPERATURA_MAIOR: temperatura,
  }

  const orbitPatch = {
    LLM_PRIMARY: 'ollama',
    LLM_CLOUD_ENABLED: '0',
    OLLAMA_ENABLED: '1',
    OLLAMA_BASE_URL: baseUrl,
    OLLAMA_MODEL: modeloMaior,
  }

  const existingCore = fs.existsSync(coreEnvPath) ? fs.readFileSync(coreEnvPath, 'utf8') : ''
  const existingOrbit = fs.existsSync(orbitEnvPath) ? fs.readFileSync(orbitEnvPath, 'utf8') : ''

  fs.writeFileSync(coreEnvPath, mergeEnvPatch(existingCore, corePatch), 'utf8')
  fs.writeFileSync(orbitEnvPath, mergeEnvPatch(existingOrbit, orbitPatch), 'utf8')

  return {
    ok: true,
    coreEnvPath,
    orbitEnvPath,
  }
}

module.exports = {
  applyLocalProfileToEnv,
  mergeEnvPatch,
}
