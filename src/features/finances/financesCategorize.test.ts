import { describe, expect, it } from 'vitest'
import { suggestCategoryId } from './financesCategorize'
import type { FinanceCategory, FinanceTransaction } from './types'

const categories: FinanceCategory[] = [
  { id: 'c1', name: 'Transporte', kind: 'expense', updatedAt: '2026-01-01' },
  { id: 'c2', name: 'Salário', kind: 'income', updatedAt: '2026-01-01' },
]

describe('suggestCategoryId', () => {
  it('sugere por histórico exacto', () => {
    const transactions: FinanceTransaction[] = [
      {
        id: 't1',
        accountId: 'a',
        categoryId: 'c1',
        amount: 50,
        type: 'expense',
        date: '2026-05-01',
        description: 'Uber viagem',
        updatedAt: '2026-05-01',
      },
    ]
    const r = suggestCategoryId('Uber viagem', 'expense', transactions, categories)
    expect(r.categoryId).toBe('c1')
    expect(r.confidence).toBeGreaterThan(0.9)
  })

  it('sugere transporte por palavra-chave', () => {
    const r = suggestCategoryId('corrida uber', 'expense', [], categories)
    expect(r.categoryName.toLowerCase()).toContain('transporte')
  })
})
