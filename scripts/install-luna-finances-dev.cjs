/**
 * Copia addons/luna-finances/ para a pasta de plugins do utilizador (app desktop).
 * Uso: npm run addon:install-finances-dev
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'addons', 'luna-finances')
const PROJECT_DEST = path.join(ROOT, '.luna', 'plugins', 'luna-finances')

function userPluginsDir() {
  const appFolder = 'new-app'
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    return path.join(base, appFolder, 'luna', 'plugins')
  }
  if (process.platform === 'darwin') {
    return path.join(
      os.homedir(),
      'Library',
      'Application Support',
      appFolder,
      'luna',
      'plugins',
    )
  }
  return path.join(os.homedir(), '.config', appFolder, 'luna', 'plugins')
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name)
    const d = path.join(dest, ent.name)
    if (ent.isDirectory()) copyDirRecursive(s, d)
    else fs.copyFileSync(s, d)
  }
}

if (!fs.existsSync(SRC)) {
  console.error('addons/luna-finances/ não encontrado.')
  process.exit(1)
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(SRC, 'plugin.json'), 'utf8'),
)

copyDirRecursive(SRC, PROJECT_DEST)
console.log(`Add-on copiado para desenvolvimento: ${PROJECT_DEST}`)

const userDest = path.join(userPluginsDir(), manifest.id)
fs.mkdirSync(path.dirname(userDest), { recursive: true })
if (fs.existsSync(userDest)) fs.rmSync(userDest, { recursive: true, force: true })
copyDirRecursive(SRC, userDest)

console.log(`Add-on copiado para: ${userDest}`)
console.log('Reinicie a Luna e active «Luna Finanças» em Definições → Add-ons.')
