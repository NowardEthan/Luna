/**
 * Envia addons/dist/luna-ide-<version>.zip para Firebase Storage.
 * Requer conta de serviço em chaves/*firebase-adminsdk*.json
 *
 * Uso: npm run addon:upload-ide
 *      npm run addon:publish-ide  (pack + upload + catálogo)
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.resolve(__dirname, '..')
const CHAVES_DIR = path.join(ROOT, 'chaves')
const ENV_PATH = path.join(ROOT, '.env')
const DIST_DIR = path.join(ROOT, 'addons', 'dist')

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
  if (!fs.existsSync(CHAVES_DIR)) {
    throw new Error('Pasta chaves/ não encontrada.')
  }
  const files = fs
    .readdirSync(CHAVES_DIR)
    .filter((f) => f.endsWith('.json') && f.includes('firebase-adminsdk'))
  if (files.length === 0) {
    throw new Error('Nenhum JSON firebase-adminsdk em chaves/.')
  }
  return JSON.parse(fs.readFileSync(path.join(CHAVES_DIR, files[0]), 'utf8'))
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function getAccessToken(serviceAccount, scope) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope,
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

async function uploadToStorage(bucket, objectPath, filePath, token) {
  const mediaUrl = new URL(
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o`,
  )
  mediaUrl.searchParams.set('uploadType', 'media')
  mediaUrl.searchParams.set('name', objectPath)

  const body = fs.readFileSync(filePath)
  const res = await fetch(mediaUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/zip',
      'Content-Length': String(body.length),
    },
    body,
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Upload Storage HTTP ${res.status}: ${text.slice(0, 400)}`)
  }
  return JSON.parse(text)
}

async function main() {
  const pluginId = 'luna-ide'
  const version =
    process.argv.find((a) => a.startsWith('--version='))?.split('=')[1] ??
    '1.0.0'
  const zipName = `${pluginId}-${version}.zip`
  const zipPath = path.join(DIST_DIR, zipName)

  if (!fs.existsSync(zipPath)) {
    console.error(`Pacote não encontrado: ${zipPath}`)
    console.error('Corre primeiro: npm run addon:pack-ide')
    process.exit(1)
  }

  const projectId =
    readEnv('VITE_FIREBASE_PROJECT_ID') || process.env.GCLOUD_PROJECT
  const bucket =
    readEnv('VITE_FIREBASE_STORAGE_BUCKET') ||
    (projectId ? `${projectId}.appspot.com` : null)

  if (!bucket) {
    console.error('Defina VITE_FIREBASE_STORAGE_BUCKET ou VITE_FIREBASE_PROJECT_ID no .env')
    process.exit(1)
  }

  const objectPath = `marketplace/plugins/${pluginId}/${zipName}`
  const serviceAccount = findServiceAccount()
  const token = await getAccessToken(
    serviceAccount,
    'https://www.googleapis.com/auth/devstorage.read_write',
  )

  console.log(`A enviar ${zipPath}`)
  console.log(`  → gs://${bucket}/${objectPath}`)

  const result = await uploadToStorage(bucket, objectPath, zipPath, token)
  console.log('Upload concluído:', result.name)

  const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`
  console.log('\nURL de download (catálogo):')
  console.log(downloadUrl)

  const head = await fetch(downloadUrl, { method: 'HEAD' })
  console.log(`Verificação pública: HTTP ${head.status}`)
  if (head.status !== 200) {
    console.warn(
      'Aviso: leitura pública falhou — confirma storage.rules e publica de novo.',
    )
  }
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
