import i18n from '../../i18n'
import type {
  FinanceAccount,
  FinanceBudget,
  FinanceCreditCard,
  FinanceGoal,
  FinanceTransaction,
  FinancesState,
} from './types'

export function accountBalance(
  account: FinanceAccount,
  transactions: FinanceTransaction[],
): number {
  let balance = account.initialBalance
  for (const tx of transactions) {
    if (tx.accountId !== account.id) continue
    if (tx.type === 'income') balance += tx.amount
    else if (tx.type === 'expense' || tx.type === 'investment') balance -= tx.amount
    else if (tx.type === 'transfer') balance -= tx.amount
  }
  for (const tx of transactions) {
    if (tx.type !== 'transfer' || !tx.transferPairId) continue
    const pair = transactions.find((p) => p.id === tx.transferPairId)
    if (pair?.accountId === account.id && tx.accountId !== account.id) {
      balance += tx.amount
    }
  }
  return balance
}

export function totalBalance(state: FinancesState): number {
  return state.accounts
    .filter((a) => !a.archived)
    .reduce((sum, a) => sum + accountBalance(a, state.transactions), 0)
}

export function monthTransactions(
  state: FinancesState,
  month: string,
): FinanceTransaction[] {
  return state.transactions.filter((tx) => tx.date.startsWith(month))
}

export function monthSummary(state: FinancesState, month: string) {
  const txs = monthTransactions(state, month)
  let income = 0
  let expense = 0
  for (const tx of txs) {
    if (tx.type === 'income') income += tx.amount
    else if (tx.type === 'expense' || tx.type === 'investment') expense += tx.amount
  }
  return { income, expense, net: income - expense, count: txs.length }
}

export function billsSummary(state: FinancesState) {
  const pending = state.bills.filter((b) => b.status === 'pending')
  const today = new Date().toISOString().slice(0, 10)
  const overdue = pending.filter((b) => b.dueDate < today)
  return {
    pendingCount: pending.length,
    pendingTotal: pending.reduce((s, b) => s + b.amount, 0),
    overdueCount: overdue.length,
    overdueTotal: overdue.reduce((s, b) => s + b.amount, 0),
  }
}

export function cardSummary(state: FinancesState, card: FinanceCreditCard) {
  const today = new Date()
  const closingDay = card.closingDay ?? Math.max(1, card.dueDay - 7)
  const dueDay = card.dueDay
  
  const isClosed = today.getDate() >= closingDay
  let refYear = today.getFullYear()
  let refMonth = today.getMonth()
  
  if (isClosed) {
    refMonth += 1
    if (refMonth > 11) {
      refMonth = 0
      refYear += 1
    }
  }
  
  let prevMonth = refMonth - 1
  let prevYear = refYear
  if (prevMonth < 0) {
    prevMonth = 11
    prevYear -= 1
  }
  
  const startDate = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(closingDay).padStart(2, '0')}`
  const endDate = `${refYear}-${String(refMonth + 1).padStart(2, '0')}-${String(closingDay).padStart(2, '0')}`
  
  const currentBill = state.transactions
    .filter(
      (tx) =>
        tx.creditCardId === card.id &&
        tx.date >= startDate && tx.date < endDate &&
        (tx.type === 'expense' || tx.type === 'investment'),
    )
    .reduce((s, tx) => s + tx.amount, 0)
    
  const available = Math.max(0, card.limit - currentBill)
  
  const dueDateObj = new Date(refYear, refMonth, dueDay)
  const daysUntilDue = Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 3600 * 24))
  
  return { currentBill, available, daysUntilDue, isClosed, closingDate: endDate, startDate }
}

export function cashflowByMonth(state: FinancesState, months: string[]) {
  return months.map((m) => ({ month: m, ...monthSummary(state, m) }))
}

export function spendingByCategory(
  state: FinancesState,
  month: string,
): { categoryId: string; name: string; total: number }[] {
  const map = new Map<string, number>()
  for (const tx of monthTransactions(state, month)) {
    if (tx.type !== 'expense' || !tx.categoryId) continue
    map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount)
  }
  return [...map.entries()]
    .map(([categoryId, total]) => ({
      categoryId,
      name:
        state.categories.find((c) => c.id === categoryId)?.name ??
        i18n.t('finances.dashboard.categoryFallback'),
      total,
    }))
    .sort((a, b) => b.total - a.total)
}

export function budgetProgress(
  state: FinancesState,
  budget: FinanceBudget,
): { spent: number; limit: number; percent: number } {
  const spent = monthTransactions(state, budget.month)
    .filter(
      (tx) => tx.type === 'expense' && tx.categoryId === budget.categoryId,
    )
    .reduce((s, tx) => s + tx.amount, 0)
  const limit = budget.limitAmount
  const percent = limit > 0 ? Math.min(150, (spent / limit) * 100) : 0
  return { spent, limit, percent }
}

export function goalProgress(goal: FinanceGoal): number {
  if (goal.targetAmount <= 0) return 0
  return Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
}

export function lastSixMonths(): string[] {
  const out: string[] = []
  const d = new Date()
  for (let i = 5; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1)
    out.push(
      `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`,
    )
  }
  return out
}

export function formatMoney(amount: number, currency = 'BRL'): string {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}
