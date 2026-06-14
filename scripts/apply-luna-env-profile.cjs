#!/usr/bin/env node
/**
 * Aplica perfil de ambiente local/cloud ao luna-core/.env e merge no Orbit/.env
 *
 * Uso:
 *   node scripts/apply-luna-env-profile.cjs local
 *   node scripts/apply-luna-env-profile.cjs cloud-groq
 */
const fs = require('fs')
const path = require('path')

const profile = process.argv[2]
const VALID = ['local', 'cloud-groq']

if (!profile || !VALID.includes(profile)) {
  console.error(`Perfil inválido. Use: ${VALID.join(' | ')}`)
  process.exit(1)
}

const orbitRoot = path.join(__dirname, '..')
const coreRoot = path.resolve(
  orbitRoot,
  process.env.LUNA_CORE_PATH ||
    path.join('..', '..', 'Core', 'Luna', 'src', 'luna-core'),
)

const coreProfile = path.join(coreRoot, 'env.profiles', `${profile}.env`)
const orbitProfile = path.join(orbitRoot, 'env.profiles', `${profile}.env`)
const coreTarget = path.join(coreRoot, '.env')
const orbitTarget = path.join(orbitRoot, '.env')

function readProfile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Perfil não encontrado: ${filePath}`)
  }
  return fs.readFileSync(filePath, 'utf8')
}

const PLACEHOLDER_KEY = 'COLOCA_TUA_GROQ_KEY_AQUI'

/** Merge KEY=VAL do perfil sobre .env existente (preserva chaves reais vs placeholder). */
function mergeEnv(existingRaw, profileRaw) {
  /** @type {Record<string, string>} */
  const map = {}
  for (const line of existingRaw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    map[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1)
  }
  for (const line of profileRaw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1)
    if (
      val === PLACEHOLDER_KEY &&
      map[key] &&
      map[key] !== PLACEHOLDER_KEY &&
      !map[key].includes('COLOCA_')
    ) {
      continue
    }
    map[key] = val
  }
  return Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
    .concat('\n')
}

try {
  const coreContent = readProfile(coreProfile)
  const existingCore = fs.existsSync(coreTarget)
    ? fs.readFileSync(coreTarget, 'utf8')
    : ''
  fs.writeFileSync(coreTarget, mergeEnv(existingCore, coreContent), 'utf8')
  console.log(`✓ luna-core/.env (merge) ← ${profile}`)

  const orbitContent = readProfile(orbitProfile)
  const existingOrbit = fs.existsSync(orbitTarget)
    ? fs.readFileSync(orbitTarget, 'utf8')
    : ''
  fs.writeFileSync(orbitTarget, mergeEnv(existingOrbit, orbitContent), 'utf8')
  console.log(`✓ Orbit/.env (merge LLM) ← ${profile}`)

  if (profile === 'cloud-groq') {
    const needsKey =
      /COLOCA_TUA_GROQ_KEY_AQUI/.test(coreContent) ||
      /COLOCA_TUA_GROQ_KEY_AQUI/.test(orbitContent)
    if (needsKey) {
      console.log('')
      console.log('⚠ Coloca a tua GROQ_API_KEY / LUNA_API_KEY se ainda não estiver no .env:')
      console.log(`  ${coreTarget}`)
      console.log(`  ${orbitTarget}`)
    }
  }

  console.log('')
  console.log('Reinicia o Orbit (npm run dev) e, se mudaste TypeScript no Core:')
  console.log('  npm run luna-core:build')
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}
