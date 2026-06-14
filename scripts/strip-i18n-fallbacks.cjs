/**
 * Remove segundo argumento de t('key', 'fallback') em src/.
 */
const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'src')

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, files)
    else if (/\.(tsx?|jsx?)$/.test(name)) files.push(p)
  }
  return files
}

// t('key', 'string') or t("key", "string") or t(`key`, `...`) with optional { vars } as 3rd arg
const RE =
  /\bt\(\s*(['"`])([^'"`]+)\1\s*,\s*(?:['"`][^'"`]*['"`]|`[^`]*`)(?:\s*,\s*(\{[^}]+\}))?\s*\)/g

function strip(content) {
  return content.replace(RE, (_, quote, key, vars) => {
    if (vars) return `t(${quote}${key}${quote}, ${vars})`
    return `t(${quote}${key}${quote})`
  })
}

let changed = 0
for (const file of walk(SRC)) {
  const raw = fs.readFileSync(file, 'utf8')
  const next = strip(raw)
  if (next !== raw) {
    fs.writeFileSync(file, next)
    changed++
    console.log('updated:', path.relative(SRC, file))
  }
}
console.log(`\n${changed} ficheiro(s) actualizados`)
