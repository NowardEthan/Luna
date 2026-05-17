/**
 * Instala dependências do servidor Python.
 * Não recria o venv se já existir (evita Errno 13 no Windows quando o servidor está a correr).
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const backend = path.join(root, 'backend')
const venvDir = path.join(backend, '.venv')
const venvPython =
  process.platform === 'win32'
    ? path.join(venvDir, 'Scripts', 'python.exe')
    : path.join(venvDir, 'bin', 'python')
const requirements = path.join(backend, 'requirements.txt')

function findSystemPython() {
  const fromEnv = process.env.LUNA_PYTHON?.trim()
  if (fromEnv) return { cmd: fromEnv, args: [] }
  if (process.platform === 'win32') {
    return { cmd: 'py', args: ['-3'] }
  }
  return { cmd: 'python3', args: [] }
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: opts.cwd || root,
    env: process.env,
    shell: false,
  })
  if (r.status !== 0) {
    process.exit(r.status ?? 1)
  }
}

function killServerOnPort() {
  if (process.platform !== 'win32') return
  spawnSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `$p=(Get-NetTCPConnection -LocalPort 39281 -ErrorAction SilentlyContinue).OwningProcess|Select-Object -First 1; if($p){Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Write-Host '[install] Servidor na porta 39281 encerrado.'}`,
    ],
    { stdio: 'inherit' },
  )
}

console.log('[install] Servidor Luna — dependências Python\n')

killServerOnPort()

if (!fs.existsSync(venvPython)) {
  console.log('[install] A criar ambiente virtual em backend/.venv …')
  const { cmd, args } = findSystemPython()
  run(cmd, [...args, '-m', 'venv', venvDir], { cwd: backend })
} else {
  console.log('[install] Ambiente backend/.venv já existe — a saltar criação do venv.')
  console.log(
    '[install] (Se precisares de recriar: npm run server:kill, apaga backend\\.venv, corre outra vez server:install)',
  )
}

if (!fs.existsSync(requirements)) {
  console.error('[install] Falta backend/requirements.txt')
  process.exit(1)
}

console.log('[install] A instalar pacotes com pip …')
run(venvPython, ['-m', 'pip', 'install', '-r', requirements])

console.log('\n[install] Concluído. Arranca com: npm run server  ou  npm run dev')
