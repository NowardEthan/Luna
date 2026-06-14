/**
 * Prepara recursos extra para electron-builder (luna-core + backend Python).
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const root = path.join(__dirname, '..')
const packDir = path.join(root, 'build-pack')
const lunaCoreSrc = path.resolve(
  process.env.LUNA_CORE_PATH ||
    path.join('C:', 'Users', 'ethan', 'Documents', 'Core', 'Luna', 'src', 'luna-core'),
)
const lunaCoreDest = path.join(packDir, 'luna-core')
const backendSrc = path.join(root, 'backend')
const backendDest = path.join(packDir, 'backend')

function rimraf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function copyFile(src, dest) {
  mkdirp(path.dirname(dest))
  fs.copyFileSync(src, dest)
}

function copyDir(src, dest, filter) {
  if (!fs.existsSync(src)) {
    throw new Error(`Origem não encontrada: ${src}`)
  }
  mkdirp(dest)
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name)
    const to = path.join(dest, entry.name)
    if (filter && !filter(from, entry)) continue
    if (entry.isDirectory()) {
      copyDir(from, to, filter)
    } else if (entry.isFile()) {
      copyFile(from, to)
    }
  }
}

function shouldSkipBackend(relPath) {
  const norm = relPath.replace(/\\/g, '/')
  if (norm.includes('__pycache__')) return true
  if (norm.endsWith('.pyc')) return true
  if (norm.includes('/.pytest_cache/')) return true
  return false
}

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd,
    shell: process.platform === 'win32',
  })
  if (r.status !== 0) {
    throw new Error(`Comando falhou: ${cmd} ${args.join(' ')}`)
  }
}

function main() {
  console.log('[pack] A preparar recursos…')

  const lunaCoreEntry = path.join(lunaCoreSrc, 'dist', 'entry-desktop.js')
  if (!fs.existsSync(lunaCoreEntry)) {
    console.log('[pack] Luna Core não compilado — a correr luna-core:build')
    run('npm', ['run', 'luna-core:build'], root)
  }

  console.log('[pack] A reconstruir better-sqlite3 para Electron…')
  run('npm', ['run', 'luna-core:rebuild-electron'], root)

  rimraf(packDir)
  mkdirp(packDir)

  console.log('[pack] A copiar luna-core de', lunaCoreSrc)
  copyDir(path.join(lunaCoreSrc, 'dist'), path.join(lunaCoreDest, 'dist'))
  copyFile(
    path.join(lunaCoreSrc, 'package.json'),
    path.join(lunaCoreDest, 'package.json'),
  )
  copyDir(
    path.join(lunaCoreSrc, 'node_modules'),
    path.join(lunaCoreDest, 'node_modules'),
    (from, entry) => {
      if (entry.isDirectory() && entry.name === '.cache') return false
      return true
    },
  )

  const lunaCoreEnv = path.join(lunaCoreSrc, '.env')
  if (fs.existsSync(lunaCoreEnv)) {
    copyFile(lunaCoreEnv, path.join(lunaCoreDest, '.env'))
    console.log('[pack] Incluído luna-core/.env (chaves API do Core)')
  } else {
    const example = path.join(lunaCoreSrc, '.env.example')
    if (fs.existsSync(example)) {
      copyFile(example, path.join(lunaCoreDest, '.env'))
      console.log('[pack] Incluído luna-core/.env.example como .env')
    }
  }

  const dotenvPath = path.join(lunaCoreDest, 'node_modules', 'dotenv')
  if (!fs.existsSync(dotenvPath)) {
    throw new Error(
      'luna-core/node_modules/dotenv em falta — corre npm install em luna-core',
    )
  }
  console.log('[pack] luna-core node_modules OK (dotenv presente)')

  const orbitEnv = path.join(root, '.env')
  if (fs.existsSync(orbitEnv)) {
    copyFile(orbitEnv, path.join(backendDest, '.env'))
    console.log('[pack] Incluído backend/.env (chaves API do servidor)')
  }

  console.log('[pack] A copiar backend Python…')
  copyDir(backendSrc, backendDest, (from, entry) => {
    const rel = path.relative(backendSrc, from)
    if (shouldSkipBackend(rel)) return false
    if (entry.isDirectory() && entry.name === '__pycache__') return false
    return true
  })

  const venvPython = path.join(backendDest, '.venv', 'Scripts', 'python.exe')
  if (!fs.existsSync(venvPython)) {
    throw new Error(
      'backend/.venv não encontrado. Corre: npm run server:install',
    )
  }

  console.log('[pack] Recursos prontos em build-pack/')
}

main()
