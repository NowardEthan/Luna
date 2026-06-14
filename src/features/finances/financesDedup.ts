import type { FinanceAccount } from './types'

/** Remove duplicados óbvios (ex.: duas «Conta principal» do seed + sync). */
export function dedupeFinanceAccounts(accounts: FinanceAccount[]): FinanceAccount[] {
  const byKey = new Map<string, FinanceAccount>()
  for (const a of accounts) {
    const key = `${a.name.trim().toLowerCase()}\0${a.type}`
    const prev = byKey.get(key)
    if (!prev || a.updatedAt >= prev.updatedAt) {
      byKey.set(key, a)
    }
  }
  return [...byKey.values()]
}
