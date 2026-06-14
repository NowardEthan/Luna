import { getFinancesActiveTab } from './financesUiState'
import {
  accountBalance,
  billsSummary,
  formatMoney,
  monthSummary,
  spendingByCategory,
  totalBalance,
} from '../features/finances/financesSelectors'
import { getFinancesState } from '../features/finances/financesStore'
import type { AccountType, FinanceAccount } from '../features/finances/types'
import { currentMonthKey } from '../features/finances/financesId'

const MAX_CHARS = 3200

const ACCOUNT_TYPE_PT: Record<AccountType, string> = {
  checking: 'corrente',
  savings: 'poupança',
  credit: 'cartão',
  cash: 'dinheiro',
  investment: 'investimento',
  other: 'outro',
}

function formatAccountLine(a: FinanceAccount, balance: number): string {
  return `${a.name} (${ACCOUNT_TYPE_PT[a.type]}) [${a.id}] saldo ${formatMoney(balance, a.currency)}`
}

export function compileFinancesContextBlock(): string {
  const state = getFinancesState()
  const month = currentMonthKey()
  const summary = monthSummary(state, month)
  const total = totalBalance(state)
  const top = spendingByCategory(state, month).slice(0, 5)
  const bills = billsSummary(state)
  const tab = getFinancesActiveTab()
  const unread = state.notifications.filter((n) => !n.read).length

  const lines = [
    '## Contexto financeiro (Luna Finanças)',
    `Aba activa na UI: ${tab}`,
    `Saldo total: ${formatMoney(total)}`,
    `Mês ${month}: receitas ${formatMoney(summary.income)}, despesas ${formatMoney(summary.expense)}, líquido ${formatMoney(summary.net)}`,
    `Transações já lançadas neste mês: ${summary.count}`,
    '',
    '### Contas (onde o dinheiro fica — não confundir com receita)',
  ]

  const accounts = state.accounts.filter((a) => !a.archived)
  if (accounts.length === 0) {
    lines.push('- (nenhuma conta)')
  } else {
    for (const a of accounts.slice(0, 10)) {
      lines.push(`- ${formatAccountLine(a, accountBalance(a, state.transactions))}`)
    }
  }

  const incomeCats = state.categories.filter((c) => c.kind === 'income').slice(0, 6)
  const expenseCats = state.categories.filter((c) => c.kind === 'expense').slice(0, 6)
  lines.push('', '### Categorias (para transações e recorrentes)')
  if (incomeCats.length) {
    lines.push(
      'Receita: ' + incomeCats.map((c) => `${c.name}[${c.id}]`).join(', '),
    )
  }
  if (expenseCats.length) {
    lines.push(
      'Despesa: ' + expenseCats.map((c) => `${c.name}[${c.id}]`).join(', '),
    )
  }

  const activeRecurring = state.recurring.filter((r) => r.active)
  lines.push('', '### Recorrentes (regras — não são transações isoladas)')
  if (activeRecurring.length === 0) {
    lines.push('- (nenhum)')
  } else {
    for (const r of activeRecurring.slice(0, 8)) {
      const acc = accounts.find((a) => a.id === r.accountId)?.name ?? r.accountId
      const cat = state.categories.find((c) => c.id === r.categoryId)?.name ?? ''
      lines.push(
        `- ${r.description}: ${formatMoney(r.amount)} ${r.type} ${r.frequency} conta=${acc} cat=${cat} próx=${r.nextDueDate} [${r.id}]`,
      )
    }
  }

  if (bills.pendingCount > 0) {
    lines.push(
      '',
      `Contas a pagar pendentes: ${bills.pendingCount} (${formatMoney(bills.pendingTotal)}), ${bills.overdueCount} em atraso`,
    )
  }
  if (state.goals.length) {
    const g = state.goals[0]!
    lines.push(
      `Meta: ${g.name} ${formatMoney(g.currentAmount)}/${formatMoney(g.targetAmount)}`,
    )
  }
  if (top.length) {
    lines.push('Top despesas mês: ' + top.map((c) => `${c.name} ${formatMoney(c.total)}`).join('; '))
  }
  if (unread) lines.push(`Alertas não lidos: ${unread}`)

  let block = lines.join('\n')
  if (block.length > MAX_CHARS) block = block.slice(0, MAX_CHARS) + '\n…[truncado]'
  return block
}
