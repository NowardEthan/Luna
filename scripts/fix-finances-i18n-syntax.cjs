const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, '../src/features/finances/components')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.tsx') && f !== 'FinancesIcons.tsx')

for (const file of files) {
  let s = fs.readFileSync(path.join(dir, file), 'utf8')
  s = s.replace(/\? \{t\(/g, '? t(')
  s = s.replace(/: \{t\(/g, ': t(')
  s = s.replace(/\?\? \{t\(/g, '?? t(')
  s = s.replace(/, \{t\(/g, ', t(')
  fs.writeFileSync(path.join(dir, file), s)
  console.log('fixed', file)
}
