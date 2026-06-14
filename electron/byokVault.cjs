/**
 * Cofre BYOK — chaves API encriptadas com safeStorage do Electron (OS keychain).
 * Metadados (provedor, modelo) ficam no Firestore; segredos só aqui.
 */
const fs = require('fs')
const path = require('path')
const { app, safeStorage } = require('electron')

const VAULT_FILE = 'byok-vault.json'

function vaultPath() {
  return path.join(app.getPath('userData'), VAULT_FILE)
}

function canEncrypt() {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

function readVault() {
  const file = vaultPath()
  if (!fs.existsSync(file)) return {}
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

function writeVault(data) {
  fs.writeFileSync(vaultPath(), JSON.stringify(data, null, 2), 'utf8')
}

function entryKey(uid, providerId) {
  return `${uid}:${providerId}`
}

function encryptSecret(plain) {
  if (!plain) return ''
  if (canEncrypt()) {
    return safeStorage.encryptString(plain).toString('base64')
  }
  return Buffer.from(plain, 'utf8').toString('base64')
}

function decryptSecret(encoded) {
  if (!encoded) return ''
  try {
    const buf = Buffer.from(encoded, 'base64')
    if (canEncrypt()) {
      return safeStorage.decryptString(buf)
    }
    return buf.toString('utf8')
  } catch {
    return ''
  }
}

function saveProviderKey(uid, providerId, apiKey) {
  const vault = readVault()
  const key = entryKey(uid, providerId)
  vault[key] = {
    enc: encryptSecret(apiKey.trim()),
    updatedAt: new Date().toISOString(),
  }
  writeVault(vault)
  return { ok: true, keyHint: keyHint(apiKey) }
}

function deleteProviderKey(uid, providerId) {
  const vault = readVault()
  delete vault[entryKey(uid, providerId)]
  writeVault(vault)
  return { ok: true }
}

function getProviderKey(uid, providerId) {
  const vault = readVault()
  const row = vault[entryKey(uid, providerId)]
  if (!row?.enc) return null
  const plain = decryptSecret(row.enc)
  return plain || null
}

function listKeyHints(uid) {
  const vault = readVault()
  const prefix = `${uid}:`
  /** @type {Record<string, boolean>} */
  const out = {}
  for (const k of Object.keys(vault)) {
    if (k.startsWith(prefix)) {
      out[k.slice(prefix.length)] = Boolean(vault[k]?.enc)
    }
  }
  return out
}

function keyHint(apiKey) {
  const t = (apiKey || '').trim()
  if (t.length <= 4) return '••••'
  return `••••${t.slice(-4)}`
}

module.exports = {
  canEncrypt,
  saveProviderKey,
  deleteProviderKey,
  getProviderKey,
  listKeyHints,
  keyHint,
}
