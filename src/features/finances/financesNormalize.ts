import { createDefaultFinancesState } from './financesDefaults'
import { dedupeFinanceAccounts } from './financesDedup'
import { FINANCES_SCHEMA_VERSION, type FinancesState } from './types'

/** Garante arrays v2 e schemaVersion ao carregar localStorage antigo. */
export function normalizeFinancesState(raw: unknown): FinancesState {
  const base = createDefaultFinancesState()
  if (!raw || typeof raw !== 'object') return base
  const p = raw as Partial<FinancesState>
  if (!Array.isArray(p.accounts) || !Array.isArray(p.categories)) return base
  return {
    meta: {
      ...base.meta,
      ...(p.meta ?? {}),
      schemaVersion: FINANCES_SCHEMA_VERSION,
    },
    accounts: dedupeFinanceAccounts(p.accounts),
    categories: p.categories,
    transactions: Array.isArray(p.transactions) ? p.transactions : [],
    budgets: Array.isArray(p.budgets) ? p.budgets : [],
    goals: Array.isArray(p.goals) ? p.goals : [],
    recurring: Array.isArray(p.recurring) ? p.recurring : [],
    bills: Array.isArray(p.bills) ? p.bills : [],
    creditCards: Array.isArray(p.creditCards) ? p.creditCards : [],
    piggyBanks: Array.isArray(p.piggyBanks) ? p.piggyBanks : [],
    piggyBankTx: Array.isArray(p.piggyBankTx) ? p.piggyBankTx : [],
    tags: Array.isArray(p.tags) ? p.tags : [],
    notifications: Array.isArray(p.notifications) ? p.notifications : [],
  }
}
