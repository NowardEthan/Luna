const fs = require('fs')
const file = process.argv[2]
if (!file) process.exit(0)
let msg = fs.readFileSync(file, 'utf8')
const next = msg.replace(/^Co-authored-by: Cursor[^\n]*\n?/gm, '')
if (next !== msg) fs.writeFileSync(file, next)
