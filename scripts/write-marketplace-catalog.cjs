/**

 * Gera public/marketplace-catalog.json com URLs do Luna IDE.

 * Perfis em src/data/marketplace-listings/<pluginId>.profile.json

 *

 * Uso: node scripts/write-marketplace-catalog.cjs

 */

const fs = require('fs')

const path = require('path')



const ROOT = path.resolve(__dirname, '..')

const ENV_PATH = path.join(ROOT, '.env')

const OUT_PATH = path.join(ROOT, 'public', 'marketplace-catalog.json')

const PROFILES_DIR = path.join(ROOT, 'src', 'data', 'marketplace-listings')



function readEnv(name) {

  if (!fs.existsSync(ENV_PATH)) return null

  const line = fs

    .readFileSync(ENV_PATH, 'utf8')

    .split('\n')

    .find((l) => l.startsWith(`${name}=`))

  if (!line) return null

  return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '') || null

}



function storageDownloadUrl(bucket, objectPath) {

  const encoded = encodeURIComponent(objectPath)

  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media`

}



function readProfile(pluginId) {

  const profilePath = path.join(PROFILES_DIR, `${pluginId}.profile.json`)

  if (!fs.existsSync(profilePath)) return undefined

  return JSON.parse(fs.readFileSync(profilePath, 'utf8'))

}



const projectId = readEnv('VITE_FIREBASE_PROJECT_ID')

const storageBucket =

  readEnv('VITE_FIREBASE_STORAGE_BUCKET') ||

  (projectId ? `${projectId}.appspot.com` : null)



if (!storageBucket) {

  console.error(

    'Defina VITE_FIREBASE_STORAGE_BUCKET ou VITE_FIREBASE_PROJECT_ID no .env',

  )

  process.exit(1)

}



const version = '1.0.0'

const pluginId = 'luna-ide'

const zipPath = `marketplace/plugins/${pluginId}/${pluginId}-${version}.zip`

const hostingBase = projectId

  ? `https://${projectId}.web.app`

  : null

const bannerUrl = hostingBase

  ? `${hostingBase}/marketplace/${pluginId}-banner.png?v=${version}-wide`

  : undefined



let profile = readProfile(pluginId)
if (profile && hostingBase) {
  const resolveUrls = (obj) => {
    if (typeof obj === 'string') {
      return obj.replaceAll('__HOSTING__', hostingBase)
    }
    if (Array.isArray(obj)) return obj.map(resolveUrls)
    if (obj && typeof obj === 'object') {
      const out = {}
      for (const [k, v] of Object.entries(obj)) out[k] = resolveUrls(v)
      return out
    }
    return obj
  }
  profile = resolveUrls(profile)
}



const catalog = {

  version: 2,

  updatedAt: new Date().toISOString().slice(0, 10),

  items: [

    {

      id: pluginId,

      pluginId,

      name: 'Luna IDE',

      description:

        'Editor de código, explorador de arquivos, terminal integrado e agente com ferramentas de workspace (ler, editar e aplicar patches em arquivos).',

      version,

      author: 'Luna',

      category: 'productivity',

      tags: ['ide', 'editor', 'terminal', 'código', 'workspace', 'agente'],

      featured: true,

      ...(bannerUrl ? { bannerUrl, iconUrl: bannerUrl } : {}),

      install: {

        type: 'url',

        url: storageDownloadUrl(storageBucket, zipPath),

      },

      permissions: ['tools', 'commands', 'hooks', 'storage', 'settings'],

      trusted: true,

      ...(profile ? { profile } : {}),

    },

  ],

}



fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })

fs.writeFileSync(OUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')

console.log(`Catálogo escrito em ${OUT_PATH}`)

console.log(`Pacote no Storage: ${zipPath}`)

if (profile) console.log(`Perfil: ${pluginId}.profile.json`)


