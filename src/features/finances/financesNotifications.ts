import i18n from '../../i18n'
import { currentMonthKey, nowIso } from './financesId'
import {
  billsSummary,
  budgetProgress,
  cardSummary,
  totalBalance,
} from './financesSelectors'
import type { FinanceNotification, FinancesState } from './types'

function todayIso(): string {
  return nowIso().slice(0, 10)
}

export function computeFinanceNotifications(state: FinancesState): FinanceNotification[] {
  const t = nowIso()
  const today = todayIso()
  const month = currentMonthKey()
  const out: FinanceNotification[] = []

  for (const b of state.budgets.filter((x) => x.month === month)) {
    const p = budgetProgress(state, b)
    if (p.limit > 0 && p.spent > p.limit) {
      const cat = state.categories.find((c) => c.id === b.categoryId)
      out.push({
        id: `budget-${b.id}`,
        type: 'budget_limit',
        priority: 'warning',
        title: i18n.t('finances.notify.budgetExceededTitle'),
        message: i18n.t('finances.notify.budgetExceededMessage', {
          category: cat?.name ?? i18n.t('finances.notify.categoryFallback'),
          spent: p.spent.toFixed(2),
          limit: p.limit.toFixed(2),
        }),
        date: t,
        read: false,
        linkTab: 'budgets',
        updatedAt: t,
      })
    }
  }

  for (const bill of state.bills.filter((b) => b.status === 'pending')) {
    if (bill.dueDate < today) {
      out.push({
        id: `bill-${bill.id}`,
        type: 'overdue_bill',
        priority: 'critical',
        title: i18n.t('finances.notify.billOverdueTitle'),
        message: i18n.t('finances.notify.billOverdueMessage', {
          description: bill.description,
          dueDate: bill.dueDate,
        }),
        date: t,
        read: false,
        linkTab: 'bills',
        updatedAt: t,
      })
    } else if (bill.dueDate <= addDays(today, 3)) {
      out.push({
        id: `bill-soon-${bill.id}`,
        type: 'overdue_bill',
        priority: 'info',
        title: i18n.t('finances.notify.billDueSoonTitle'),
        message: i18n.t('finances.notify.billDueSoonMessage', {
          description: bill.description,
          dueDate: bill.dueDate,
        }),
        date: t,
        read: false,
        linkTab: 'bills',
        updatedAt: t,
      })
    }
  }

  const bs = billsSummary(state)
  if (bs.pendingTotal > 0 && bs.overdueCount > 0) {
    /* individual bill notifications already cover */
  }

  for (const card of state.creditCards.filter((c) => c.status === 'active')) {
    const s = cardSummary(state, card)
    if (s.daysUntilDue >= 0 && s.daysUntilDue <= 5 && s.currentBill > 0) {
      out.push({
        id: `card-${card.id}`,
        type: 'card_due',
        priority: 'warning',
        title: i18n.t('finances.notify.cardDueTitle'),
        message: i18n.t('finances.notify.cardDueMessage', {
          name: card.name,
          days: s.daysUntilDue,
          amount: s.currentBill.toFixed(2),
        }),
        date: t,
        read: false,
        linkTab: 'cards',
        updatedAt: t,
      })
    }
  }

  const total = totalBalance(state)
  if (total < 0) {
    out.push({
      id: 'low-balance',
      type: 'low_balance',
      priority: 'critical',
      title: i18n.t('finances.notify.lowBalanceTitle'),
      message: i18n.t('finances.notify.lowBalanceMessage', {
        total: total.toFixed(2),
      }),
      date: t,
      read: false,
      linkTab: 'dashboard',
      updatedAt: t,
    })
  }

  for (const r of state.recurring.filter((x) => x.active && x.nextDueDate <= today)) {
    out.push({
      id: `recurring-${r.id}`,
      type: 'recurring_pending',
      priority: 'info',
      title: i18n.t('finances.notify.recurringPendingTitle'),
      message: i18n.t('finances.notify.recurringPendingMessage', {
        description: r.description,
        dueDate: r.nextDueDate,
      }),
      date: t,
      read: false,
      linkTab: 'recurring',
      updatedAt: t,
    })
  }

  return out
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function mergeNotifications(
  prev: FinanceNotification[],
  computed: FinanceNotification[],
): FinanceNotification[] {
  const readMap = new Map(prev.map((n) => [n.id, n.read]))
  return computed.map((n) => ({
    ...n,
    read: readMap.get(n.id) ?? false,
    updatedAt: nowIso(),
  }))
}

export function refreshFinanceNotifications(state: FinancesState): FinancesState {
  const computed = computeFinanceNotifications(state)
  return {
    ...state,
    notifications: mergeNotifications(state.notifications, computed),
  }
}
