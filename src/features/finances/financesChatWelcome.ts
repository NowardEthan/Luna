import { getStarterIdeasFinances } from '../chat/components/chatStarters'
import type {
  WelcomeStarterItem,
  WelcomeTextPart,
} from '../chat/contextualChatWelcome'
import { getFinancesActiveTab } from '../../lib/financesUiState'
import { currentMonthKey } from './financesId'
import {
  billsSummary,
  formatMoney,
  monthSummary,
  totalBalance,
} from './financesSelectors'
import { getFinancesState } from './financesStore'
import type { FinancesTab } from './types'

const TAB_LABELS: Record<FinancesTab, string> = {
  dashboard: 'Painel',
  accounts: 'Contas',
  transactions: 'Transações',
  budgets: 'Orçamentos',
  goals: 'Metas',
  recurring: 'Recorrentes',
  bills: 'Contas a pagar',
  cards: 'Cartões',
  piggy: 'Caixinhas',
  reports: 'Relatórios',
  analytics: 'Analytics',
  notifications: 'Alertas',
}

function fmtMonth(month: string): string {
  const [y, m] = month.split('-')
  if (!y || !m) return month
  const names = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ]
  const idx = Number(m) - 1
  return `${names[idx] ?? m} ${y}`
}

function pickUniqueStarters(candidates: WelcomeStarterItem[], limit: number): WelcomeStarterItem[] {
  const seen = new Set<string>()
  const out: WelcomeStarterItem[] = []
  for (const item of candidates) {
    const key = item.message.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
    if (out.length >= limit) break
  }
  return out
}

export function buildFinancesWelcomeAssistantParts(): WelcomeTextPart[] {
  const tab = getFinancesActiveTab()
  return [
    {
      type: 'text',
      value:
        'Oi! Sou a Luna Gestora — ajudo com contas, lançamentos, orçamentos e metas. Estás na secção ',
    },
    { type: 'finance', kind: 'tab', label: TAB_LABELS[tab] },
    { type: 'text', value: '; pergunta ou escolhe uma sugestão.' },
  ]
}

/** Sugestões clicáveis com badges (saldo, mês, conta, etc.). */
export function buildFinancesChatStarterItems(): WelcomeStarterItem[] {
  const state = getFinancesState()
  const month = currentMonthKey()
  const monthLabel = fmtMonth(month)
  const summary = monthSummary(state, month)
  const total = totalBalance(state)
  const bills = billsSummary(state)
  const tab = getFinancesActiveTab()
  const candidates: WelcomeStarterItem[] = []

  const balanceMsg = `Qual é o meu saldo (${formatMoney(total)}) e resumo de ${month}?`
  candidates.push({
    id: 'balance-month',
    message: balanceMsg,
    parts: [
      { type: 'text', value: 'Qual é o meu saldo ' },
      { type: 'finance', kind: 'money', label: formatMoney(total) },
      { type: 'text', value: ' e resumo de ' },
      { type: 'finance', kind: 'month', label: monthLabel },
      { type: 'text', value: '?' },
    ],
  })

  if (state.accounts.length === 0) {
    candidates.push({
      id: 'first-account',
      message: 'Ajuda-me a criar a minha primeira conta.',
      parts: [{ type: 'text', value: 'Ajuda-me a criar a minha primeira conta.' }],
    })
  } else if (state.accounts.length === 1) {
    const name = state.accounts[0]!.name
    candidates.push({
      id: 'account-summary',
      message: `Resume a conta «${name}».`,
      parts: [
        { type: 'text', value: 'Resume a conta ' },
        { type: 'finance', kind: 'account', label: name },
        { type: 'text', value: '.' },
      ],
    })
  }

  if (summary.count === 0) {
    candidates.push({
      id: 'expense-today',
      message: 'Regista uma despesa de hoje.',
      parts: [{ type: 'text', value: 'Regista uma despesa de hoje.' }],
    })
  } else if (summary.expense > 0) {
    candidates.push({
      id: 'top-spending',
      message: 'Onde gastei mais este mês?',
      parts: [
        { type: 'text', value: 'Onde gastei mais em ' },
        { type: 'finance', kind: 'month', label: monthLabel },
        { type: 'text', value: '?' },
      ],
    })
  }

  if (bills.pendingCount > 0) {
    if (bills.overdueCount > 0) {
      const msg = `Tenho ${bills.overdueCount} conta(s) em atraso — o que pago primeiro?`
      candidates.push({
        id: 'bills-overdue',
        message: msg,
        parts: [
          { type: 'text', value: 'Tenho ' },
          { type: 'finance', kind: 'count', label: String(bills.overdueCount) },
          { type: 'text', value: ' conta(s) em atraso — o que pago primeiro?' },
        ],
      })
    } else {
      const msg = `Quais são as ${bills.pendingCount} contas a pagar pendentes?`
      candidates.push({
        id: 'bills-pending',
        message: msg,
        parts: [
          { type: 'text', value: 'Quais são as ' },
          { type: 'finance', kind: 'count', label: String(bills.pendingCount) },
          { type: 'text', value: ' contas a pagar pendentes?' },
        ],
      })
    }
  }

  if (state.budgets.length > 0) {
    candidates.push({
      id: 'budgets',
      message: 'Como estão os meus orçamentos este mês?',
      parts: [
        { type: 'text', value: 'Como estão os meus orçamentos em ' },
        { type: 'finance', kind: 'month', label: monthLabel },
        { type: 'text', value: '?' },
      ],
    })
  }

  if (state.goals.length > 0) {
    const g = state.goals[0]!
    candidates.push({
      id: 'goal',
      message: `Como vai a meta «${g.name}»?`,
      parts: [
        { type: 'text', value: 'Como vai a meta ' },
        { type: 'finance', kind: 'goal', label: g.name },
        { type: 'text', value: '?' },
      ],
    })
  }

  if (tab === 'transactions') {
    candidates.push({
      id: 'transfer',
      message: 'Quero lançar uma transferência entre contas.',
      parts: [{ type: 'text', value: 'Quero lançar uma transferência entre contas.' }],
    })
  } else if (tab === 'bills') {
    candidates.push({
      id: 'add-bill',
      message: 'Adiciona uma conta a pagar para este mês.',
      parts: [
        { type: 'text', value: 'Adiciona uma conta a pagar para ' },
        { type: 'finance', kind: 'month', label: monthLabel },
        { type: 'text', value: '.' },
      ],
    })
  } else if (tab === 'piggy') {
    candidates.push({
      id: 'piggy',
      message: 'Quanto tenho nas caixinhas?',
      parts: [{ type: 'text', value: 'Quanto tenho nas caixinhas?' }],
    })
  } else {
    candidates.push({
      id: 'tab-hint',
      message: `Estou na secção ${TAB_LABELS[tab]} — o que posso fazer aqui?`,
      parts: [
        { type: 'text', value: 'Estou na secção ' },
        { type: 'finance', kind: 'tab', label: TAB_LABELS[tab] },
        { type: 'text', value: ' — o que posso fazer aqui?' },
      ],
    })
  }

  const unread = state.notifications.filter((n) => !n.read).length
  if (unread > 0) {
    const msg = `Explica os ${unread} alerta(s) financeiro(s).`
    candidates.push({
      id: 'alerts',
      message: msg,
      parts: [
        { type: 'text', value: 'Explica os ' },
        { type: 'finance', kind: 'count', label: String(unread) },
        { type: 'text', value: ' alerta(s) financeiro(s).' },
      ],
    })
  }

  for (const [i, text] of getStarterIdeasFinances().entries()) {
    candidates.push({
      id: `fallback-${i}`,
      message: text,
      parts: [{ type: 'text', value: text }],
    })
  }

  return pickUniqueStarters(candidates, 3)
}

export function financesWelcomePanelHint(): string {
  return 'Toque numa sugestão sobre as suas finanças ou descreva o que quer registar ou consultar.'
}
