import { getFinancesState } from './financesStore'

export function exportFinancesJson(): string {
  return JSON.stringify(getFinancesState(), null, 2)
}

export function exportFinancesCsv(): string {
  const s = getFinancesState()
  const header = 'date,type,amount,description,accountId,categoryId'
  const rows = s.transactions.map(
    (tx) =>
      `${tx.date},${tx.type},${tx.amount},"${tx.description.replace(/"/g, '""')}",${tx.accountId},${tx.categoryId ?? ''}`,
  )
  return [header, ...rows].join('\n')
}

export function downloadFinancesExport(format: 'json' | 'csv'): void {
  const content = format === 'json' ? exportFinancesJson() : exportFinancesCsv()
  const blob = new Blob([content], {
    type: format === 'json' ? 'application/json' : 'text/csv',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `luna-finances-${new Date().toISOString().slice(0, 10)}.${format}`
  a.click()
  URL.revokeObjectURL(url)
}
