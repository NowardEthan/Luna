/**
 * Verifica paridade de chaves entre en.json e pt.json.
 * Exit 1 se houver diferenças.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const EN = path.join(ROOT, 'src/i18n/locales/en.json')
const PT = path.join(ROOT, 'src/i18n/locales/pt.json')

function flattenObject(ob, prefix = '') {
  const out = {}
  for (const key of Object.keys(ob)) {
    const full = prefix ? `${prefix}.${key}` : key
    const val = ob[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(out, flattenObject(val, full))
    } else if (typeof val === 'string') {
      out[full] = val
    }
  }
  return out
}

function loadJson(file) {
  const raw = fs.readFileSync(file, 'utf8')
  return JSON.parse(raw)
}

function main() {
  const en = flattenObject(loadJson(EN))
  const pt = flattenObject(loadJson(PT))
  const enKeys = new Set(Object.keys(en))
  const ptKeys = new Set(Object.keys(pt))

  const onlyEn = [...enKeys].filter((k) => !ptKeys.has(k)).sort()
  const onlyPt = [...ptKeys].filter((k) => !enKeys.has(k)).sort()

  if (onlyEn.length === 0 && onlyPt.length === 0) {
    console.log(`i18n OK: ${enKeys.size} chaves em en e pt`)
    process.exit(0)
  }

  console.error('i18n: en.json e pt.json estão dessincronizados\n')
  if (onlyEn.length) {
    console.error(`Só em en (${onlyEn.length}):`)
    onlyEn.slice(0, 40).forEach((k) => console.error(`  + ${k}`))
    if (onlyEn.length > 40) console.error(`  … e mais ${onlyEn.length - 40}`)
  }
  if (onlyPt.length) {
    console.error(`Só em pt (${onlyPt.length}):`)
    onlyPt.slice(0, 40).forEach((k) => console.error(`  + ${k}`))
    if (onlyPt.length > 40) console.error(`  … e mais ${onlyPt.length - 40}`)
  }
  process.exit(1)
}

main()
