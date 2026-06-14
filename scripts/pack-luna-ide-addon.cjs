/**
 * Empacota addons/luna-ide/ → addons/dist/luna-ide-<version>.zip
 * Uso: npm run addon:pack-ide
 */
const fs = require('fs')
const path = require('path')

let AdmZip
try {
  AdmZip = require('adm-zip')
} catch {
  console.error('Instale adm-zip: npm install adm-zip')
  process.exit(1)
}

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'addons', 'luna-ide')
const MANIFEST = path.join(SRC, 'plugin.json')

if (!fs.existsSync(MANIFEST)) {
  console.error('addons/luna-ide/plugin.json não encontrado.')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
const version = manifest.version || '1.0.0'
const pluginId = manifest.id || 'luna-ide'
const OUT_DIR = path.join(ROOT, 'addons', 'dist')
const OUT_ZIP = path.join(OUT_DIR, `${pluginId}-${version}.zip`)

fs.mkdirSync(OUT_DIR, { recursive: true })

const zip = new AdmZip()
zip.addLocalFolder(SRC)
zip.writeZip(OUT_ZIP)

console.log(`Pacote: ${OUT_ZIP}`)
console.log(
  `Publique no Firebase Storage: marketplace/plugins/${pluginId}/${pluginId}-${version}.zip`,
)
