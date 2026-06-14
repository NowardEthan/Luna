import { describe, expect, it } from 'vitest'
import { billsSummary, monthSummary, totalBalance } from './financesSelectors'
import type { FinancesState } from './types'

const base: FinancesState = {
  meta: { defaultCurrency: 'BRL', schemaVersion: 2 },
  accounts: [
    {
      id: 'a1',
      name: 'Principal',
      type: 'checking',
      currency: 'BRL',
      initialBalance: 100,
      updatedAt: '2026-01-01',
    },
  ],
  categories: [],
  transactions: [
    {
      id: 't1',
      accountId: 'a1',
      amount: 50,
      type: 'expense',
      date: '2026-05-10',
      description: 'Test',
      updatedAt: '2026-01-01',
    },
    {
      id: 't2',
      accountId: 'a1',
      amount: 200,
      type: 'income',
      date: '2026-05-12',
      description: 'Sal',
      updatedAt: '2026-01-01',
    },
  ],
  budgets: [],
  goals: [],
  recurring: [],
  bills: [
    {
      id: 'b1',
      description: 'Aluguel',
      amount: 800,
      dueDate: '2026-04-01',
      status: 'pending',
      updatedAt: '2026-01-01',
    },
  ],
  creditCards: [],
  piggyBanks: [],
  piggyBankTx: [],
  tags: [],
  notifications: [],
}

describe('financesSelectors', () => {
  it('calcula saldo e resumo do mês', () => {
    expect(totalBalance(base)).toBe(250)
    const m = monthSummary(base, '2026-05')
    expect(m.income).toBe(200)
    expect(m.expense).toBe(50)
    expect(m.net).toBe(150)
  })

  it('resume contas pendentes', () => {
    const b = billsSummary(base)
    expect(b.pendingCount).toBe(1)
    expect(b.overdueCount).toBe(1)
  })
})
