/**
 * Detecta padrões de UI legados fora do design system Luna.
 * Uso: node scripts/find-legacy-ui.cjs [--strict]
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'src')
const STRICT = process.argv.includes('--strict')

const EXT = new Set(['.tsx', '.ts', '.css'])
const SKIP_DIRS = new Set(['node_modules', '_archive'])
const ALLOWLIST_FILES = new Set([
  'features/marketplace/MarketplaceListingArt.tsx',
  'features/marketplace/marketplaceCover.ts',
  'features/marketplace/MarketplaceDetailModal.tsx',
  'index.css',
])

const RULES = [
  {
    id: 'backdrop-blur',
    re: /backdrop-blur(?!.*luna-overlay-scrim)/,
    hint: 'Use superfícies sólidas; blur só em .luna-overlay-scrim',
  },
  {
    id: 'bg-gradient',
    re: /bg-gradient-to-/,
    hint: 'Use luna-card-vivid ou lunaVividShellClass; excepção: capas marketplace',
  },
  {
    id: 'cta-adhoc',
    re: /rounded-full\s+bg-accent\s+px-/,
    hint: 'Use luna-btn-primary',
  },
  {
    id: 'modal-shadow',
    re: /shadow-2xl/,
    hint: 'Use luna-dialog (shadow-overlay)',
  },
]

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = path.join(dir, name)
    const rel = path.relative(path.join(__dirname, '..'), full).replace(/\\/g, '/')
    const st = fs.statSync(full)
    if (st.isDirectory()) walk(full, files)
    else if (EXT.has(path.extname(name))) files.push({ full, rel })
  }
  return files
}

const hits = []

for (const { full, rel } of walk(ROOT)) {
  const short = rel.replace(/^src\//, '')
  if (ALLOWLIST_FILES.has(short)) continue
  const text = fs.readFileSync(full, 'utf8')
  const lines = text.split('\n')
  for (const rule of RULES) {
    if (rule.id === 'bg-gradient' && short.includes('marketplace')) continue
    lines.forEach((line, i) => {
      if (line.includes('find-legacy-ui')) return
      if (rule.re.test(line)) {
        hits.push({ file: short, line: i + 1, rule: rule.id, hint: rule.hint, snippet: line.trim().slice(0, 100) })
      }
    })
  }
}

if (hits.length === 0) {
  console.log('OK: nenhum padrão legado detectado.')
  process.exit(0)
}

console.log(`Encontrados ${hits.length} avisos de UI legada:\n`)
for (const h of hits.slice(0, 80)) {
  console.log(`  ${h.file}:${h.line} [${h.rule}] ${h.snippet}`)
}
if (hits.length > 80) console.log(`  … e mais ${hits.length - 80}`)

process.exit(STRICT ? 1 : 0)
