/**
 * Copia addons/luna-ide/ para a pasta de plugins do utilizador (app desktop).
 * Uso: npm run addon:install-ide-dev
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'addons', 'luna-ide')

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
  console.error('addons/luna-ide/ não encontrado.')
  process.exit(1)
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(SRC, 'plugin.json'), 'utf8'),
)
const dest = path.join(userPluginsDir(), manifest.id)
fs.mkdirSync(path.dirname(dest), { recursive: true })
if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true })
copyDirRecursive(SRC, dest)

console.log(`Add-on copiado para: ${dest}`)
console.log('Reinicie a Luna e active «Luna IDE» em Definições → Add-ons.')
