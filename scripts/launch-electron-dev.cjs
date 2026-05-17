/**
 * Aguarda servidor + Vite e abre o Electron (usado por npm run dev / dev.bat).
 */
const { spawn } = require('child_process')
const http = require('http')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const DEADLINE_MS = 120_000
const POLL_MS = 500

const TARGETS = [
  { url: 'http://127.0.0.1:39281/health', label: 'servidor (:39281)' },
  { url: 'http://127.0.0.1:5173/', label: 'Vite (:5173)' },
]

function probe(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 2500 }, (res) => {
      res.resume()
      resolve(res.statusCode >= 200 && res.statusCode < 500)
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

async function waitForDeps() {
  const start = Date.now()
  let lastLog = 0

  console.log('[electron] A aguardar servidor e Vite...')

  while (Date.now() - start < DEADLINE_MS) {
    const checks = await Promise.all(
      TARGETS.map(async (t) => ({ ...t, ok: await probe(t.url) })),
    )
    if (checks.every((c) => c.ok)) {
      console.log('[electron] Servidor e Vite prontos.')
      return true
    }

    const now = Date.now()
    if (now - lastLog > 8000) {
      const pending = checks.filter((c) => !c.ok).map((c) => c.label)
      console.log(`[electron] Ainda a aguardar: ${pending.join(', ')}`)
      lastLog = now
    }

    await new Promise((r) => setTimeout(r, POLL_MS))
  }

  return false
}

function runElectron() {
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    LUNA_USE_SERVER: '1',
  }

  // require('electron') devolve o caminho do .exe — evita spawn de .cmd no Windows (EINVAL)
  const electronExe = require('electron')

  console.log('[electron] A abrir janela nativa...')

  const child = spawn(electronExe, ['.'], {
    cwd: ROOT,
    env,
    stdio: 'inherit',
    windowsHide: false,
  })

  child.on('error', (err) => {
    console.error('[electron] Falha ao arrancar:', err.message)
    process.exit(1)
  })

  child.on('exit', (code, signal) => {
    if (signal) process.exit(1)
    process.exit(code ?? 0)
  })
}

async function main() {
  const ready = await waitForDeps()
  if (!ready) {
    console.error(
      '[electron] Timeout — confirma que o Vite usa host 127.0.0.1 (porta 5173) e o servidor :39281.',
    )
    process.exit(1)
  }
  runElectron()
}

main().catch((err) => {
  console.error('[electron]', err)
  process.exit(1)
})
