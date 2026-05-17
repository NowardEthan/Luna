/**
 * Usado pelo `npm run dev`: só arranca o servidor Python se /health ainda não responder.
 */
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
})

const PORT = Number(process.env.LUNA_SERVER_PORT || 39281)
const HOST = process.env.LUNA_SERVER_HOST || '127.0.0.1'
const BASE = `http://${HOST}:${PORT}`

function findPython() {
  const candidates = process.env.LUNA_PYTHON
    ? [process.env.LUNA_PYTHON]
  : process.platform === 'win32'
      ? ['py', 'python', 'python3']
      : ['python3', 'python']
  return candidates
}

async function isHealthy() {
  try {
    const res = await fetch(`${BASE}/health`, {
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) return false
    const data = await res.json()
    return data?.ok === true
  } catch {
    return false
  }
}

function spawnPythonServer(pythonCmd, args) {
  const root = path.join(__dirname, '..')
  const runScript = path.join(root, 'backend', 'run_server.py')
  const child = spawn(pythonCmd, [...args, runScript], {
    stdio: 'inherit',
    env: process.env,
    cwd: root,
  })
  child.on('error', (err) => {
    console.error('[server] Falha ao arrancar Python:', err.message)
    process.exit(1)
  })
  child.on('exit', (code, signal) => {
    if (signal) process.exit(1)
    process.exit(code ?? 0)
  })
}

async function main() {
  if (await isHealthy()) {
    console.log(
      `\x1b[32m[server]\x1b[0m Luna já activo em ${BASE} — a reutilizar.`,
    )
    // Manter vivo: `concurrently -k` mata os outros se este processo terminar.
    await new Promise(() => {})
    return
  }

  const venvPython =
    process.platform === 'win32'
      ? path.join(__dirname, '..', 'backend', '.venv', 'Scripts', 'python.exe')
      : path.join(__dirname, '..', 'backend', '.venv', 'bin', 'python')

  if (fs.existsSync(venvPython)) {
    console.log(`\x1b[35m[server]\x1b[0m A iniciar Luna (Python venv) em ${BASE}…`)
    spawnPythonServer(venvPython, [])
    return
  }

  for (const cmd of findPython()) {
    const extra = cmd === 'py' ? ['-3'] : []
    console.log(`\x1b[35m[server]\x1b[0m A iniciar Luna (${cmd}) em ${BASE}…`)
    try {
      spawnPythonServer(cmd, extra)
      return
    } catch {
      /* try next */
    }
  }

  console.error(
    '[server] Python não encontrado. Cria venv: cd backend && python -m venv .venv && .venv\\Scripts\\pip install -r requirements.txt',
  )
  process.exit(1)
}

main().catch((err) => {
  console.error('[server]', err)
  process.exit(1)
})
