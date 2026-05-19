/**
 * Lê a conta de serviço em chaves/*.json, obtém a config Web via Firebase Management API
 * e actualiza a secção Firebase no .env (VITE_* + FIREBASE_SERVICE_ACCOUNT_PATH).
 *
 * Uso: npm run firebase:sync-env
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.resolve(__dirname, '..')
const CHAVES_DIR = path.join(ROOT, 'chaves')
const ENV_PATH = path.join(ROOT, '.env')

function findServiceAccount() {
  if (!fs.existsSync(CHAVES_DIR)) {
    throw new Error('Pasta chaves/ não encontrada.')
  }
  const files = fs
    .readdirSync(CHAVES_DIR)
    .filter((f) => f.endsWith('.json') && f.includes('firebase-adminsdk'))
  if (files.length === 0) {
    throw new Error('Nenhum JSON firebase-adminsdk em chaves/.')
  }
  return path.join(CHAVES_DIR, files[0])
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
      scope: 'https://www.googleapis.com/auth/firebase.readonly',
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
  if (!data.access_token) {
    throw new Error(`Token OAuth falhou: ${JSON.stringify(data)}`)
  }
  return data.access_token
}

async function fetchWebConfig(projectId, token) {
  const listRes = await fetch(
    `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const list = await listRes.json()
  const appId = list.apps?.[0]?.appId
  if (!appId) {
    throw new Error(
      `Nenhuma app Web em ${projectId}. Cria uma em Firebase Console.`,
    )
  }
  const cfgRes = await fetch(
    `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps/${appId}/config`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!cfgRes.ok) {
    throw new Error(`Config Web: ${cfgRes.status} ${await cfgRes.text()}`)
  }
  return cfgRes.json()
}

function upsertEnv(lines, key, value) {
  const prefix = `${key}=`
  const idx = lines.findIndex((l) => l.startsWith(prefix))
  const row = `${key}=${value}`
  if (idx >= 0) lines[idx] = row
  else lines.push(row)
}

function updateEnvFile(cfg, serviceAccountRel) {
  let content = fs.existsSync(ENV_PATH)
    ? fs.readFileSync(ENV_PATH, 'utf8')
    : ''
  const lines = content.split(/\r?\n/)

  upsertEnv(lines, 'VITE_FIREBASE_API_KEY', cfg.apiKey)
  upsertEnv(lines, 'VITE_FIREBASE_PROJECT_ID', cfg.projectId)
  upsertEnv(lines, 'VITE_FIREBASE_APP_ID', cfg.appId)
  upsertEnv(lines, 'VITE_FIREBASE_AUTH_DOMAIN', cfg.authDomain)
  upsertEnv(lines, 'VITE_FIREBASE_STORAGE_BUCKET', cfg.storageBucket)
  if (cfg.messagingSenderId) {
    upsertEnv(lines, 'VITE_FIREBASE_MESSAGING_SENDER_ID', cfg.messagingSenderId)
  } else if (cfg.projectNumber) {
    upsertEnv(lines, 'VITE_FIREBASE_MESSAGING_SENDER_ID', cfg.projectNumber)
  }
  if (cfg.measurementId) {
    upsertEnv(lines, 'VITE_FIREBASE_MEASUREMENT_ID', cfg.measurementId)
  }
  upsertEnv(
    lines,
    'FIREBASE_SERVICE_ACCOUNT_PATH',
    serviceAccountRel.replace(/\\/g, '/'),
  )

  fs.writeFileSync(ENV_PATH, lines.join('\n'))
}

async function main() {
  const saPath = findServiceAccount()
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'))
  const rel = path.relative(ROOT, saPath)
  const token = await getAccessToken(sa)
  const cfg = await fetchWebConfig(sa.project_id, token)
  updateEnvFile(cfg, rel)

  const firebaserc = path.join(ROOT, '.firebaserc')
  fs.writeFileSync(
    firebaserc,
    JSON.stringify({ projects: { default: cfg.projectId } }, null, 2) + '\n',
  )

  console.log(`[Luna] Firebase sincronizado: projeto ${cfg.projectId}`)
  console.log(`[Luna] .env actualizado; .firebaserc → ${cfg.projectId}`)

  try {
    require('./write-firebase-hosting-init.cjs')
  } catch (err) {
    console.warn('[Luna] init.json Hosting:', err.message || err)
  }
}

main().catch((err) => {
  console.error('[Luna]', err.message || err)
  process.exit(1)
})
