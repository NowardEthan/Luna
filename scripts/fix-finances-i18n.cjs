/**
 * Fix finances panel i18n: ensure useTranslation hook + replace PT literals with t().
 */
const fs = require('fs')
const path = require('path')

const en = require('./i18n-data/finances.en.json')
const pt = require('./i18n-data/finances.pt.json')

function flatten(obj, prefix = '') {
  const out = []
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatten(v, key))
    else out.push([`finances.${key}`, String(v)])
  }
  return out
}

const pairs = flatten(pt)
  .map(([i18nKey, ptText]) => [ptText, i18nKey])
  .filter(([, key]) => key.startsWith('finances.'))
  .sort((a, b) => b[0].length - a[0].length)

const dir = path.join(__dirname, '../src/features/finances/components')
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.tsx') && f !== 'FinancesIcons.tsx')

for (const file of files) {
  if (file === 'FinanceFormFields.tsx') continue
  const fp = path.join(dir, file)
  let s = fs.readFileSync(fp, 'utf8')

  if (!s.includes("from 'react-i18next'")) {
    s = `import { useTranslation } from 'react-i18next'\n${s}`
  }

  if (!s.includes('const { t } = useTranslation()')) {
    s = s.replace(
      /export function (\w+)\([^)]*\) \{\n(\s*)(const |function |if |return)/,
      (m, fn, sp, next) => {
        if (m.includes('useTranslation()')) return m
        return `export function ${fn}(${m.match(/\([^)]*\)/)[0].slice(1, -1) ? m.slice(m.indexOf('('), m.indexOf(')') + 1) : ''}) {\n${sp}const { t } = useTranslation()\n${sp}${next}`
      },
    )
    // simpler: after export function X() {
    s = s.replace(
      /(export function \w+\([^)]*\) \{\n)(\s*)(const state)/,
      '$1$2const { t } = useTranslation()\n$2$3',
    )
    s = s.replace(
      /(export function \w+\([^)]*\) \{\n)(\s*)(const \[)/,
      (m, head, sp, rest) =>
        m.includes('useTranslation()') ? m : `${head}${sp}const { t } = useTranslation()\n${sp}${rest}`,
    )
  }

  // Fix broken migration artifacts
  s = s.replace(/return \{t\('/g, "return t('")
  s = s.replace(/\{t\('finances\.dashboard\.cardClosed'\)/g, "{t('finances.dashboard.cardClosed')}")

  for (const [ptText, i18nKey] of pairs) {
    if (!ptText || ptText.length < 4) continue
    const esc = ptText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    s = s.replace(new RegExp(`>${esc}<`, 'g'), `>{t('${i18nKey}')}<`)
    s = s.replace(new RegExp(`title="${esc}"`, 'g'), `title={t('${i18nKey}')}`)
    s = s.replace(new RegExp(`placeholder="${esc}"`, 'g'), `placeholder={t('${i18nKey}')}`)
    s = s.replace(
      new RegExp(`<FieldLabel>${esc}</FieldLabel>`, 'g'),
      `<FieldLabel>{t('${i18nKey}')}</FieldLabel>`,
    )
    // bare text nodes
    s = s.replace(
      new RegExp(`(\n\\s+)${esc}(\n)`, 'g'),
      `$1{t('${i18nKey}')}$2`,
    )
  }

  // Variable shadowing in TransactionsPanel
  s = s.replace(
    /\(\['expense', 'income', 'transfer'\] as const\)\.map\(t =>/g,
    "(['expense', 'income', 'transfer'] as const).map((txType) =>",
  )
  s = s.replace(
    /type === t \?/g,
    'type === txType ?',
  )
  s = s.replace(
    /onClick=\{\(\) => setType\(t\)\}/g,
    'onClick={() => setType(txType)}',
  )
  s = s.replace(
    /\$\{type === t \?/g,
    '${type === txType ?',
  )

  // GoalsPanel: local variable t shadows hook
  s = s.replace(
    /const t = Number\(target\)/g,
    'const targetNum = Number(target)',
  )
  s = s.replace(
    /!Number\.isFinite\(t\) \|\| t <= 0/g,
    '!Number.isFinite(targetNum) || targetNum <= 0',
  )
  s = s.replace(
    /targetAmount: t,/g,
    'targetAmount: targetNum,',
  )

  // currency in FieldLabel - common pattern
  s = s.replace(/Valor \(R\$\)/g, "{t('finances.common.amount', { currency: 'R$' })}")
  s = s.replace(/Valor Total \(R\$\)/g, "{t('finances.transactions.amount', { currency: 'R$' })}")
  s = s.replace(/Limite Total \(R\$\)/g, "{t('finances.cards.limit', { currency: 'R$' })}")
  s = s.replace(/Limite Estipulado \(R\$\)/g, "{t('finances.budgets.limit', { currency: 'R$' })}")
  s = s.replace(/Valor Alvo \(R\$\)/g, "{t('finances.goals.target', { currency: 'R$' })}")
  s = s.replace(/Meta Opcional \(R\$\)/g, "{t('finances.piggy.optionalTarget', { currency: 'R$' })}")

  fs.writeFileSync(fp, s)
  console.log('fixed', file)
}
