import { describe, expect, it } from 'vitest'
import { dedupeFinanceAccounts } from './financesDedup'
import type { FinanceAccount } from './types'

describe('dedupeFinanceAccounts', () => {
  it('mantém só a conta mais recente com mesmo nome e tipo', () => {
    const accounts: FinanceAccount[] = [
      {
        id: 'a',
        name: 'Conta principal',
        type: 'checking',
        currency: 'BRL',
        initialBalance: 0,
        updatedAt: '2026-05-01T00:00:00.000Z',
      },
      {
        id: 'b',
        name: 'Conta principal',
        type: 'checking',
        currency: 'BRL',
        initialBalance: 0,
        updatedAt: '2026-05-02T00:00:00.000Z',
      },
    ]
    const out = dedupeFinanceAccounts(accounts)
    expect(out).toHaveLength(1)
    expect(out[0]?.id).toBe('b')
  })
})
