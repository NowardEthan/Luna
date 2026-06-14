import { useSyncExternalStore } from 'react'
import { createDefaultFinancesState } from './financesDefaults'
import { currentMonthKey, newFinanceId, nowIso } from './financesId'
import { normalizeFinancesState } from './financesNormalize'
import { refreshFinanceNotifications } from './financesNotifications'
import { scheduleFinancesCloudSync } from './financesCloudSync'
import {
  clearFinanceTombstone,
  markFinanceTombstone,
  type FinanceTombstoneCollection,
} from './financesTombstones'
import { FINANCES_SCHEMA_VERSION } from './types'
import type {
  FinanceAccount,
  FinanceBill,
  FinanceBudget,
  FinanceCategory,
  FinanceCreditCard,
  FinanceGoal,
  FinancePiggyBank,
  FinancePiggyBankTx,
  FinanceRecurring,
  FinanceTag,
  FinanceTransaction,
  FinancesState,
} from './types'

const STORAGE_KEY = 'luna-finances-v1'

type Listener = () => void
const listeners = new Set<Listener>()

let state: FinancesState = loadState()
let persistTimer: ReturnType<typeof setTimeout> | null = null

function loadState(): FinancesState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultFinancesState()
    const parsed = JSON.parse(raw) as unknown
    return normalizeFinancesState(parsed)
  } catch {
    return createDefaultFinancesState()
  }
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* quota */
    }
  }, 200)
}

function commit(next: FinancesState) {
  state = refreshFinanceNotifications({
    ...next,
    meta: { ...next.meta, schemaVersion: FINANCES_SCHEMA_VERSION },
  })
  schedulePersist()
  scheduleFinancesCloudSync()
  for (const l of listeners) l()
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getFinancesState(): FinancesState {
  return state
}

export function replaceFinancesState(next: FinancesState): void {
  commit(next)
}

export function useFinancesState(): FinancesState {
  return useSyncExternalStore(subscribe, getFinancesState, getFinancesState)
}

export function patchMeta(partial: Partial<FinancesState['meta']>): void {
  commit({
    ...state,
    meta: { ...state.meta, ...partial, schemaVersion: FINANCES_SCHEMA_VERSION },
  })
}

function removeWithTombstone(
  collection: FinanceTombstoneCollection,
  id: string,
  patch: Partial<FinancesState>,
): void {
  commit({
    ...state,
    ...patch,
    meta: markFinanceTombstone(state.meta, collection, id, nowIso()),
  })
}

export function upsertAccount(
  input: Omit<FinanceAccount, 'id' | 'updatedAt'> & { id?: string },
): FinanceAccount {
  const t = nowIso()
  const account: FinanceAccount = {
    ...input,
    id: input.id ?? newFinanceId(),
    updatedAt: t,
  }
  const accounts = input.id
    ? state.accounts.map((a) => (a.id === input.id ? account : a))
    : [...state.accounts, account]
  commit({
    ...state,
    accounts,
    meta: clearFinanceTombstone(state.meta, 'accounts', account.id),
  })
  return account
}

export function removeAccount(id: string): void {
  removeWithTombstone('accounts', id, {
    accounts: state.accounts.filter((a) => a.id !== id),
    transactions: state.transactions.filter(
      (tx) => tx.accountId !== id && tx.transferPairId !== id,
    ),
  })
}

export function upsertCategory(
  input: Omit<FinanceCategory, 'id' | 'updatedAt'> & { id?: string },
): FinanceCategory {
  const t = nowIso()
  const category: FinanceCategory = {
    ...input,
    id: input.id ?? newFinanceId(),
    updatedAt: t,
  }
  const categories = input.id
    ? state.categories.map((c) => (c.id === input.id ? category : c))
    : [...state.categories, category]
  commit({
    ...state,
    categories,
    meta: clearFinanceTombstone(state.meta, 'categories', category.id),
  })
  return category
}

export function removeCategory(id: string): void {
  removeWithTombstone('categories', id, {
    categories: state.categories.filter((c) => c.id !== id),
    transactions: state.transactions.map((tx) =>
      tx.categoryId === id ? { ...tx, categoryId: undefined } : tx,
    ),
    budgets: state.budgets.filter((b) => b.categoryId !== id),
  })
}

export function upsertTransaction(
  input: Omit<FinanceTransaction, 'id' | 'updatedAt'> & { id?: string },
): FinanceTransaction {
  const t = nowIso()
  const tx: FinanceTransaction = {
    ...input,
    id: input.id ?? newFinanceId(),
    updatedAt: t,
  }
  const transactions = input.id
    ? state.transactions.map((x) => (x.id === input.id ? tx : x))
    : [...state.transactions, tx]
  commit({
    ...state,
    transactions,
    meta: clearFinanceTombstone(state.meta, 'transactions', tx.id),
  })
  return tx
}

export function addInstallmentTransaction(
  input: Omit<FinanceTransaction, 'id' | 'updatedAt' | 'installmentCurrent' | 'installmentTotal' | 'installmentGroupId'> & {
    installments: number
  }
): FinanceTransaction[] {
  const { installments, amount, date, ...rest } = input
  if (installments <= 1) {
    return [upsertTransaction({ ...rest, amount, date })]
  }

  const groupId = newFinanceId()
  const installmentAmount = amount / installments
  const created: FinanceTransaction[] = []

  const baseDate = new Date(date)
  for (let i = 1; i <= installments; i++) {
    const txDate = new Date(baseDate)
    txDate.setMonth(txDate.getMonth() + (i - 1))

    created.push(upsertTransaction({
      ...rest,
      amount: installmentAmount,
      date: txDate.toISOString().slice(0, 10),
      installmentTotal: installments,
      installmentCurrent: i,
      installmentGroupId: groupId,
    }))
  }
  return created
}

export function addTransfer(input: {
  fromAccountId: string
  toAccountId: string
  amount: number
  date: string
  description: string
  categoryId?: string
}): void {
  const pairId = newFinanceId()
  const t = nowIso()
  const out: FinanceTransaction = {
    id: newFinanceId(),
    accountId: input.fromAccountId,
    categoryId: input.categoryId,
    amount: input.amount,
    type: 'transfer',
    date: input.date,
    description: input.description,
    transferPairId: pairId,
    updatedAt: t,
  }
  const inn: FinanceTransaction = {
    id: pairId,
    accountId: input.toAccountId,
    categoryId: input.categoryId,
    amount: input.amount,
    type: 'transfer',
    date: input.date,
    description: input.description,
    transferPairId: out.id,
    updatedAt: t,
  }
  commit({ ...state, transactions: [...state.transactions, out, inn] })
}

export function removeTransaction(id: string): void {
  const tx = state.transactions.find((x) => x.id === id)
  let transactions = state.transactions.filter((x) => x.id !== id)
  const removedIds = [id]
  if (tx?.transferPairId) {
    transactions = transactions.filter((x) => x.id !== tx.transferPairId)
    removedIds.push(tx.transferPairId)
  }
  let meta = state.meta
  for (const rid of removedIds) {
    meta = markFinanceTombstone(meta, 'transactions', rid, nowIso())
  }
  commit({ ...state, transactions, meta })
}

export function upsertBudget(
  input: Omit<FinanceBudget, 'id' | 'updatedAt'> & { id?: string },
): FinanceBudget {
  const t = nowIso()
  const budget: FinanceBudget = {
    ...input,
    id: input.id ?? newFinanceId(),
    updatedAt: t,
  }
  const budgets = input.id
    ? state.budgets.map((b) => (b.id === input.id ? budget : b))
    : [...state.budgets, budget]
  commit({
    ...state,
    budgets,
    meta: clearFinanceTombstone(state.meta, 'budgets', budget.id),
  })
  return budget
}

export function removeBudget(id: string): void {
  removeWithTombstone('budgets', id, {
    budgets: state.budgets.filter((b) => b.id !== id),
  })
}

export function upsertGoal(
  input: Omit<FinanceGoal, 'id' | 'updatedAt'> & { id?: string },
): FinanceGoal {
  const t = nowIso()
  const goal: FinanceGoal = {
    ...input,
    id: input.id ?? newFinanceId(),
    updatedAt: t,
  }
  const goals = input.id
    ? state.goals.map((g) => (g.id === input.id ? goal : g))
    : [...state.goals, goal]
  commit({
    ...state,
    goals,
    meta: clearFinanceTombstone(state.meta, 'goals', goal.id),
  })
  return goal
}

export function addGoalContribution(goalId: string, amount: number): void {
  const goals = state.goals.map((g) =>
    g.id === goalId
      ? {
          ...g,
          currentAmount: g.currentAmount + amount,
          updatedAt: nowIso(),
        }
      : g,
  )
  commit({ ...state, goals })
}

export function removeGoal(id: string): void {
  removeWithTombstone('goals', id, {
    goals: state.goals.filter((g) => g.id !== id),
  })
}

export function upsertRecurring(
  input: Omit<FinanceRecurring, 'id' | 'updatedAt'> & { id?: string },
): FinanceRecurring {
  const t = nowIso()
  const item: FinanceRecurring = {
    ...input,
    id: input.id ?? newFinanceId(),
    updatedAt: t,
  }
  const recurring = input.id
    ? state.recurring.map((r) => (r.id === input.id ? item : r))
    : [...state.recurring, item]
  commit({
    ...state,
    recurring,
    meta: clearFinanceTombstone(state.meta, 'recurring', item.id),
  })
  return item
}

export function removeRecurring(id: string): void {
  removeWithTombstone('recurring', id, {
    recurring: state.recurring.filter((r) => r.id !== id),
  })
}

function advanceDueDate(dateIso: string, frequency: FinanceRecurring['frequency']): string {
  const d = new Date(dateIso)
  if (frequency === 'weekly') d.setDate(d.getDate() + 7)
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1)
  else d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export function generateRecurringTransaction(id: string): FinanceTransaction | null {
  const item = state.recurring.find((r) => r.id === id)
  if (!item || !item.active) return null
  const tx = upsertTransaction({
    accountId: item.accountId,
    categoryId: item.categoryId,
    amount: item.amount,
    type: item.type === 'transfer' ? 'expense' : item.type,
    date: item.nextDueDate,
    description: item.description,
    recurringId: item.id,
  })
  upsertRecurring({
    ...item,
    nextDueDate: advanceDueDate(item.nextDueDate, item.frequency),
  })
  return tx
}

export function defaultBudgetMonth(): string {
  return currentMonthKey()
}

export function upsertBill(
  input: Omit<FinanceBill, 'id' | 'updatedAt' | 'status'> & {
    id?: string
    status?: FinanceBill['status']
  },
): FinanceBill {
  const t = nowIso()
  const bill: FinanceBill = {
    ...input,
    status: input.status ?? 'pending',
    id: input.id ?? newFinanceId(),
    updatedAt: t,
  }
  const bills = input.id
    ? state.bills.map((b) => (b.id === input.id ? bill : b))
    : [...state.bills, bill]
  commit({
    ...state,
    bills,
    meta: clearFinanceTombstone(state.meta, 'bills', bill.id),
  })
  return bill
}

export function payBill(
  billId: string,
  accountId: string,
): FinanceTransaction | null {
  const bill = state.bills.find((b) => b.id === billId)
  if (!bill || bill.status === 'paid') return null
  const t = nowIso()
  const tx: FinanceTransaction = {
    id: newFinanceId(),
    accountId,
    categoryId: bill.categoryId,
    amount: bill.amount,
    type: 'expense',
    date: t.slice(0, 10),
    description: bill.description,
    updatedAt: t,
  }
  const bills = state.bills.map((b) =>
    b.id === billId
      ? {
          ...b,
          status: 'paid' as const,
          paidAt: t,
          transactionId: tx.id,
          updatedAt: t,
        }
      : b,
  )
  commit({ ...state, transactions: [...state.transactions, tx], bills })
  return tx
}

export function removeBill(id: string): void {
  removeWithTombstone('bills', id, {
    bills: state.bills.filter((b) => b.id !== id),
  })
}

export function upsertCreditCard(
  input: Omit<FinanceCreditCard, 'id' | 'updatedAt'> & { id?: string },
): FinanceCreditCard {
  const t = nowIso()
  const card: FinanceCreditCard = {
    ...input,
    id: input.id ?? newFinanceId(),
    updatedAt: t,
  }
  const creditCards = input.id
    ? state.creditCards.map((c) => (c.id === input.id ? card : c))
    : [...state.creditCards, card]
  commit({
    ...state,
    creditCards,
    meta: clearFinanceTombstone(state.meta, 'creditCards', card.id),
  })
  return card
}

export function removeCreditCard(id: string): void {
  removeWithTombstone('creditCards', id, {
    creditCards: state.creditCards.filter((c) => c.id !== id),
    transactions: state.transactions.map((tx) =>
      tx.creditCardId === id ? { ...tx, creditCardId: undefined } : tx,
    ),
  })
}

export function upsertPiggyBank(
  input: Omit<FinancePiggyBank, 'id' | 'updatedAt' | 'currentAmount'> & {
    id?: string
    currentAmount?: number
  },
): FinancePiggyBank {
  const t = nowIso()
  const bank: FinancePiggyBank = {
    currentAmount: input.currentAmount ?? 0,
    ...input,
    id: input.id ?? newFinanceId(),
    updatedAt: t,
  }
  const piggyBanks = input.id
    ? state.piggyBanks.map((p) => (p.id === input.id ? bank : p))
    : [...state.piggyBanks, bank]
  commit({
    ...state,
    piggyBanks,
    meta: clearFinanceTombstone(state.meta, 'piggyBanks', bank.id),
  })
  return bank
}

export function piggyDeposit(piggyBankId: string, amount: number, description?: string): void {
  if (amount <= 0) return
  const t = nowIso()
  const tx: FinancePiggyBankTx = {
    id: newFinanceId(),
    piggyBankId,
    amount,
    type: 'deposit',
    description,
    date: t.slice(0, 10),
    updatedAt: t,
  }
  const piggyBanks = state.piggyBanks.map((p) =>
    p.id === piggyBankId
      ? { ...p, currentAmount: p.currentAmount + amount, updatedAt: t }
      : p,
  )
  commit({ ...state, piggyBanks, piggyBankTx: [...state.piggyBankTx, tx] })
}

export function piggyWithdraw(piggyBankId: string, amount: number, description?: string): void {
  const bank = state.piggyBanks.find((p) => p.id === piggyBankId)
  if (!bank || amount <= 0 || amount > bank.currentAmount) return
  const t = nowIso()
  const tx: FinancePiggyBankTx = {
    id: newFinanceId(),
    piggyBankId,
    amount,
    type: 'withdrawal',
    description,
    date: t.slice(0, 10),
    updatedAt: t,
  }
  const piggyBanks = state.piggyBanks.map((p) =>
    p.id === piggyBankId
      ? { ...p, currentAmount: p.currentAmount - amount, updatedAt: t }
      : p,
  )
  commit({ ...state, piggyBanks, piggyBankTx: [...state.piggyBankTx, tx] })
}

export function removePiggyBank(id: string): void {
  removeWithTombstone('piggyBanks', id, {
    piggyBanks: state.piggyBanks.filter((p) => p.id !== id),
    piggyBankTx: state.piggyBankTx.filter((t) => t.piggyBankId !== id),
  })
}

export function upsertTag(
  input: Omit<FinanceTag, 'id' | 'updatedAt'> & { id?: string },
): FinanceTag {
  const t = nowIso()
  const tag: FinanceTag = {
    ...input,
    id: input.id ?? newFinanceId(),
    updatedAt: t,
  }
  const tags = input.id
    ? state.tags.map((x) => (x.id === input.id ? tag : x))
    : [...state.tags, tag]
  commit({
    ...state,
    tags,
    meta: clearFinanceTombstone(state.meta, 'tags', tag.id),
  })
  return tag
}

export function removeTag(id: string): void {
  removeWithTombstone('tags', id, {
    tags: state.tags.filter((t) => t.id !== id),
  })
}

export function markNotificationRead(id: string): void {
  const notifications = state.notifications.map((n) =>
    n.id === id ? { ...n, read: true, updatedAt: nowIso() } : n,
  )
  commit({ ...state, notifications })
}

export function markAllNotificationsRead(): void {
  const t = nowIso()
  commit({
    ...state,
    notifications: state.notifications.map((n) => ({ ...n, read: true, updatedAt: t })),
  })
}
