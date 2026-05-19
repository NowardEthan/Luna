/**
 * Gera public/__/firebase/init.json para o handler OAuth (signInWithRedirect).
 * Sem este ficheiro no Hosting, https://{project}.firebaseapp.com/__/firebase/init.json → 404.
 *
 * Uso: npm run firebase:write-init
 * Corrido automaticamente antes de firebase:deploy-catalog.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ENV_PATH = path.join(ROOT, '.env')
const OUT_DIR = path.join(ROOT, 'public', '__', 'firebase')
const OUT_FILE = path.join(OUT_DIR, 'init.json')

function readEnvMap() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error('.env não encontrado. Corre npm run firebase:sync-env primeiro.')
  }
  const map = {}
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    map[t.slice(0, i)] = t.slice(i + 1).trim()
  }
  return map
}

function main() {
  const env = readEnvMap()
  const apiKey = env.VITE_FIREBASE_API_KEY
  const projectId = env.VITE_FIREBASE_PROJECT_ID
  const appId = env.VITE_FIREBASE_APP_ID

  if (!apiKey || !projectId || !appId) {
    throw new Error(
      'Faltam VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID ou VITE_FIREBASE_APP_ID no .env.',
    )
  }

  const authDomain =
    env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`
  const storageBucket =
    env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`

  const init = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    appId,
  }

  const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID
  if (messagingSenderId) init.messagingSenderId = messagingSenderId

  const measurementId = env.VITE_FIREBASE_MEASUREMENT_ID
  if (measurementId) init.measurementId = measurementId

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(init, null, 2) + '\n', 'utf8')
  console.log(`[Luna] ${path.relative(ROOT, OUT_FILE)} actualizado (${projectId}).`)
  console.log('[Luna] Publica com: npm run firebase:deploy-catalog')
}

main()
