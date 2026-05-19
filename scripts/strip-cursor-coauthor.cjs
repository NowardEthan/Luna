/**
 * Remove Co-authored-by do Cursor das mensagens de commit (git filter-branch --msg-filter).
 * Uso: node scripts/strip-cursor-coauthor.cjs < msgfile
 */
const fs = require('fs')
let msg = fs.readFileSync(0, 'utf8')
msg = msg.replace(/^Co-authored-by: Cursor[^\n]*\n?/gm, '')
msg = msg.replace(/\n{3,}/g, '\n\n')
process.stdout.write(msg.replace(/\s+$/, '') + '\n')
