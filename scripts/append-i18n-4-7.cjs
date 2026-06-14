const fs = require('fs')
const path = require('path')
const dir = path.join(__dirname, 'i18n-data')
const localesDir = path.join(__dirname, '../src/i18n/locales')

for (const locale of ['en', 'pt']) {
  const main = JSON.parse(fs.readFileSync(path.join(localesDir, `${locale}.json`), 'utf8'))
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(`.${locale}.json`))) {
    const ns = file.replace(`.${locale}.json`, '')
    const chunk = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    main[ns] = { ...(main[ns] || {}), ...chunk }
  }
  fs.writeFileSync(path.join(localesDir, `${locale}.json`), JSON.stringify(main, null, 2) + '\n')
}
console.log('Appended namespaces from scripts/i18n-data/*.en.json and *.pt.json')
