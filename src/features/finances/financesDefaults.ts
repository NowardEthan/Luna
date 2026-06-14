import type { FinancesState } from './types'
import { FINANCES_SCHEMA_VERSION } from './types'
import { currentMonthKey, newFinanceId, nowIso } from './financesId'

export function createDefaultFinancesState(): FinancesState {
  const t = nowIso()
  const incomeId = newFinanceId()
  const expenseId = newFinanceId()
  const accountId = newFinanceId()
  return {
    meta: {
      defaultCurrency: 'BRL',
      schemaVersion: FINANCES_SCHEMA_VERSION,
    },
    accounts: [
      {
        id: accountId,
        name: 'Conta principal',
        type: 'checking',
        currency: 'BRL',
        initialBalance: 0,
        color: '#5eb3f6',
        updatedAt: t,
      },
    ],
    categories: [
      {
        id: incomeId,
        name: 'Salário',
        kind: 'income',
        icon: '💼',
        updatedAt: t,
      },
      {
        id: expenseId,
        name: 'Despesas gerais',
        kind: 'expense',
        icon: '🛒',
        updatedAt: t,
      },
      {
        id: newFinanceId(),
        name: 'Moradia',
        kind: 'expense',
        icon: '🏠',
        updatedAt: t,
      },
      {
        id: newFinanceId(),
        name: 'Transporte',
        kind: 'expense',
        icon: '🚗',
        updatedAt: t,
      },
    ],
    transactions: [],
    budgets: [
      {
        id: newFinanceId(),
        categoryId: expenseId,
        month: currentMonthKey(),
        limitAmount: 1500,
        updatedAt: t,
      },
    ],
    goals: [
      {
        id: newFinanceId(),
        name: 'Reserva de emergência',
        targetAmount: 10000,
        currentAmount: 0,
        color: '#34d399',
        updatedAt: t,
      },
    ],
    recurring: [],
    bills: [],
    creditCards: [],
    piggyBanks: [],
    piggyBankTx: [],
    tags: [],
    notifications: [],
  }
}
