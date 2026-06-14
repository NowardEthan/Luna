/**
 * Lista possíveis strings de UI hardcoded em src/ (baseline para migração i18n).
 * Uso: node scripts/find-hardcoded-ui.cjs [--json]
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'src')
const OUT_JSON = process.argv.includes('--json')
const MAX = Number(process.env.I18N_SCAN_MAX || 500)

const EXT = new Set(['.tsx', '.ts'])
const SKIP_DIRS = new Set(['node_modules', 'i18n/locales'])

/** Ficheiros já com useTranslation ou só tipos/testes */
const SKIP_FILES = [
  /\\.test\\.(ts|tsx)$/,
  /\\.d\\.ts$/,
  /electron\\.d\\.ts$/,
]

const ATTR_PATTERNS = [
  { re: /(?:aria-label|title|placeholder)=["']([^{][^"']{2,120})["']/g, kind: 'attr' },
  { re: />\s*([A-Za-zÀ-ú][A-Za-zÀ-ú0-9\s,.…!?«»—–\-]{4,80})\s*</g, kind: 'jsx' },
]

const ALLOW = [
  /^[A-Z0-9_]+$/, // constantes
  /^v\d/,
  /^https?:/,
  /^Ctrl\+/,
  /^@/,
  /^\{/,
  /^\d/,
  /^—$/,
  /^…$/,
]

function shouldSkipFile(rel) {
  if (SKIP_FILES.some((p) => p.test(rel))) return true
  if (rel.includes('i18n/locales')) return true
  return false
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const rel = path.relative(path.join(__dirname, '..'), full).replace(/\\/g, '/')
    if (SKIP_DIRS.has(name)) continue
    const st = fs.statSync(full)
    if (st.isDirectory()) walk(full, files)
    else if (EXT.has(path.extname(name))) files.push({ full, rel })
  }
  return files
}

function isLikelyUi(text) {
  const t = text.trim()
  if (t.length < 3) return false
  if (ALLOW.some((p) => p.test(t))) return false
  if (/^[a-z][a-zA-Z]*$/.test(t) && !t.includes(' ')) return false // camelCase id
  if (/^use[A-Z]/.test(t)) return false
  return /[A-Za-zÀ-ú]{3,}/.test(t)
}

function scanFile({ full, rel }) {
  if (shouldSkipFile(rel)) return []
  const content = fs.readFileSync(full, 'utf8')
  if (content.includes('useTranslation') && !content.match(/(?:aria-label|placeholder|title)=["'][^{]/)) {
    return []
  }
  const lines = content.split('\n')
  const hits = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim().startsWith('//')) continue
    if (line.includes('t(') && line.includes("')")) continue
    for (const { re, kind } of ATTR_PATTERNS) {
      re.lastIndex = 0
      let m
      while ((m = re.exec(line)) !== null) {
        const text = m[1]
        if (!isLikelyUi(text)) continue
        hits.push({ file: rel, line: i + 1, kind, text })
      }
    }
  }
  return hits
}

function main() {
  const files = walk(ROOT)
  let all = []
  for (const f of files) {
    all = all.concat(scanFile(f))
    if (all.length >= MAX) break
  }

  const byFile = {}
  for (const h of all) {
    if (!byFile[h.file]) byFile[h.file] = []
    byFile[h.file].push(h)
  }

  if (OUT_JSON) {
    console.log(JSON.stringify({ total: all.length, hits: all }, null, 2))
    return
  }

  const sorted = Object.keys(byFile).sort()
  console.log(`Possíveis strings hardcoded: ${all.length} (máx ${MAX})\n`)
  for (const file of sorted) {
    console.log(file)
    for (const h of byFile[file].slice(0, 8)) {
      console.log(`  L${h.line} [${h.kind}] ${h.text.slice(0, 70)}`)
    }
    if (byFile[file].length > 8) console.log(`  … +${byFile[file].length - 8} mais`)
  }
}

main()
