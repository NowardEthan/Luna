/**
 * Lista ficheiros em marketplace/ no bucket Firebase Storage.
 * Uso: npm run firebase:list-storage
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.resolve(__dirname, '..')
const CHAVES_DIR = path.join(ROOT, 'chaves')
const ENV_PATH = path.join(ROOT, '.env')

function readEnv(name) {
  if (!fs.existsSync(ENV_PATH)) return null
  const line = fs
    .readFileSync(ENV_PATH, 'utf8')
    .split('\n')
    .find((l) => l.startsWith(`${name}=`))
  if (!line) return null
  return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '') || null
}

function findServiceAccount() {
  const files = fs
    .readdirSync(CHAVES_DIR)
    .filter((f) => f.endsWith('.json') && f.includes('firebase-adminsdk'))
  if (files.length === 0) throw new Error('Sem firebase-adminsdk em chaves/')
  return JSON.parse(fs.readFileSync(path.join(CHAVES_DIR, files[0]), 'utf8'))
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/devstorage.read_only',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )
  const signInput = `${header}.${claim}`
  const sign = crypto
    .createSign('RSA-SHA256')
    .update(signInput)
    .sign(serviceAccount.private_key, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  const jwt = `${signInput}.${sign}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(JSON.stringify(data))
  return data.access_token
}

async function listPrefix(bucket, prefix, token) {
  const url = new URL('https://storage.googleapis.com/storage/v1/b/' + bucket + '/o')
  url.searchParams.set('prefix', prefix)
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || res.status)
  return data.items || []
}

async function main() {
  const bucket = readEnv('VITE_FIREBASE_STORAGE_BUCKET')
  if (!bucket) throw new Error('VITE_FIREBASE_STORAGE_BUCKET em falta no .env')

  console.log('Bucket:', bucket)
  console.log('(Isto é Firebase STORAGE — não Firestore.)\n')

  const token = await getAccessToken(findServiceAccount())
  const items = await listPrefix(bucket, 'marketplace/', token)

  if (items.length === 0) {
    console.log('Nenhum ficheiro em marketplace/ — corre: npm run addon:upload-ide')
    return
  }

  for (const item of items) {
    const kb = ((item.size || 0) / 1024).toFixed(1)
    console.log(`  ${item.name}  (${kb} KB)`)
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
