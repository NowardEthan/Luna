const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

/** @type {import('child_process').ChildProcess | null} */
let serverProcess = null

function packagedBackendDir() {
  return path.join(process.resourcesPath, 'backend')
}

function venvPythonPath(backendDir) {
  return process.platform === 'win32'
    ? path.join(backendDir, '.venv', 'Scripts', 'python.exe')
    : path.join(backendDir, '.venv', 'bin', 'python')
}

async function waitForHealth(baseUrl, attempts = 40, delayMs = 500) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${baseUrl}/health`, {
        signal: AbortSignal.timeout(2000),
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.ok === true) return true
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, delayMs))
  }
  return false
}

/**
 * Arranca o servidor Python incluído no pacote (Windows/macOS/Linux).
 * @param {{ resourcesPath: string }} opts
 */
async function startPackagedServer(opts) {
  if (process.env.LUNA_USE_SERVER === '0') return { ok: true, skipped: true }

  const backendDir = path.join(opts.resourcesPath, 'backend')
  const python = venvPythonPath(backendDir)
  const runScript = path.join(backendDir, 'run_server.py')

  if (!fs.existsSync(python) || !fs.existsSync(runScript)) {
    console.warn('[serverLauncher] Backend empacotado não encontrado:', backendDir)
    return { ok: false, error: 'Backend Python não incluído no pacote.' }
  }

  if (serverProcess && !serverProcess.killed) {
    return { ok: true, reused: true }
  }

  const port = process.env.LUNA_SERVER_PORT || '39281'
  const host = process.env.LUNA_SERVER_HOST || '127.0.0.1'
  const base = `http://${host}:${port}`

  if (await waitForHealth(base, 2, 200)) {
    return { ok: true, reused: true }
  }

  serverProcess = spawn(python, [runScript], {
    cwd: backendDir,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      LUNA_SERVER_PORT: port,
      LUNA_SERVER_HOST: host,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  serverProcess.stdout?.on('data', (chunk) => {
    console.log('[luna-server]', chunk.toString().trimEnd())
  })
  serverProcess.stderr?.on('data', (chunk) => {
    console.error('[luna-server]', chunk.toString().trimEnd())
  })
  serverProcess.on('exit', (code, signal) => {
    console.warn('[luna-server] terminou', { code, signal })
    serverProcess = null
  })

  const healthy = await waitForHealth(base)
  if (!healthy) {
    return { ok: false, error: `Servidor não respondeu em ${base}` }
  }
  return { ok: true }
}

function stopPackagedServer() {
  if (!serverProcess || serverProcess.killed) return
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t'], {
        stdio: 'ignore',
        windowsHide: true,
      })
    } else {
      serverProcess.kill('SIGTERM')
    }
  } catch {
    /* ignore */
  }
  serverProcess = null
}

module.exports = {
  startPackagedServer,
  stopPackagedServer,
  packagedBackendDir,
}
