import type { FinancesTab } from '../features/finances/types'

let activeTab: FinancesTab = 'dashboard'
const listeners = new Set<() => void>()

function notify(): void {
  for (const l of listeners) l()
}

export function setFinancesActiveTab(tab: FinancesTab): void {
  if (activeTab === tab) return
  activeTab = tab
  notify()
}

export function getFinancesActiveTab(): FinancesTab {
  return activeTab
}

export function subscribeFinancesActiveTab(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
