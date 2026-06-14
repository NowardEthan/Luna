import { toolRegistry } from '../../core/registry/ToolRegistry'
import { finishTool } from '../../core/tools/toolResult'
import { suggestCategoryId } from '../../features/finances/financesCategorize'
import {
  addGoalContribution,
  addTransfer,
  generateRecurringTransaction,
  getFinancesState,
  payBill,
  piggyDeposit,
  piggyWithdraw,
  removeAccount,
  removeTransaction,
  upsertAccount,
  upsertBill,
  upsertBudget,
  upsertRecurring,
  addInstallmentTransaction,
} from '../../features/finances/financesStore'
import {
  accountBalance,
  billsSummary,
  cardSummary,
  formatMoney,
  monthSummary,
  totalBalance,
} from '../../features/finances/financesSelectors'
import { currentMonthKey, nowIso } from '../../features/finances/financesId'
import type {
  AccountType,
  RecurringFrequency,
  TransactionType,
} from '../../features/finances/types'
import { FINANCES_TOOL_PREFIX } from '../../agent/financesSystemSupplement'

export const TOOL_PREFIX = FINANCES_TOOL_PREFIX

function t(name: string): string {
  return `${TOOL_PREFIX}${name}`
}

/**
 * `finishTool` ganhou um 5º parâmetro `raw`. As tools de finanças não produzem
 * um `raw` estruturado (o `buildAgentStep` só usa `raw` para tools conhecidas,
 * ex.: web_search), então encaminhamos `null` — comportamento preservado.
 */
function finish(
  tool: string,
  ok: boolean,
  content: string,
  args: Record<string, unknown>,
): ReturnType<typeof finishTool> {
  return finishTool(tool, ok, content, args, null)
}

type Handler = (args: Record<string, unknown>) => Promise<ReturnType<typeof finishTool>>

function reg(
  shortName: string,
  description: string,
  parameters: Record<string, unknown>,
  handlerOrRequired: Handler | string[],
  maybeHandler?: Handler,
): void {
  let handler: Handler
  let required: string[] = []
  if (typeof handlerOrRequired === 'function') {
    handler = handlerOrRequired
  } else {
    required = handlerOrRequired
    if (!maybeHandler) {
      throw new Error(`Luna Finanças: handler em falta para ${shortName}`)
    }
    handler = maybeHandler
  }
  const name = t(shortName)
  toolRegistry.register({
    name,
    family: 'plugin',
    schema: {
      type: 'function',
      function: { name, description, parameters: { type: 'object', properties: parameters, required, additionalProperties: false } },
    },
    uiLabel: 'Luna Finanças',
    handler: async ({ args }) => handler(args as Record<string, unknown>),
  })
}

const ACCOUNT_TYPES = [
  'checking',
  'savings',
  'credit',
  'cash',
  'investment',
  'other',
] as const

export function registerAllFinancesTools(): void {
  unregisterAllFinancesTools()

  reg(
    'list_accounts',
    'Lista CONTAS BANCÁRIAS/carteiras (onde o dinheiro fica). Não é receita nem recorrente.',
    {},
    async () => {
      const s = getFinancesState()
      const typePt: Record<AccountType, string> = {
        checking: 'corrente',
        savings: 'poupança',
        credit: 'cartão',
        cash: 'dinheiro',
        investment: 'investimento',
        other: 'outro',
      }
      const lines = s.accounts
        .filter((a) => !a.archived)
        .map(
          (a) =>
            `- ${a.name} (${typePt[a.type]}) [${a.id}]: ${formatMoney(accountBalance(a, s.transactions), a.currency)}`,
        )
      return finish(t('list_accounts'), true, lines.join('\n') || 'Sem contas.', {})
    },
  )

  reg(
    'list_categories',
    'Lista categorias de receita ou despesa (para transações e recorrentes).',
    { kind: { type: 'string', enum: ['income', 'expense'] } },
    async (args) => {
      const s = getFinancesState()
      const kind = args.kind === 'income' ? 'income' : args.kind === 'expense' ? 'expense' : null
      let cats = s.categories
      if (kind) cats = cats.filter((c) => c.kind === kind)
      const lines = cats.map((c) => `- ${c.name} (${c.kind}) [${c.id}]`)
      return finish(t('list_categories'), true, lines.join('\n') || 'Sem categorias.', args)
    },
  )

  reg(
    'upsert_account',
    'Cria ou actualiza uma conta bancária/carteira (corrente, poupança, dinheiro, etc.).',
    {
      name: { type: 'string', description: 'Nome da conta, ex.: Inter, Nubank' },
      type: {
        type: 'string',
        enum: [...ACCOUNT_TYPES],
        description: 'checking=corrente, savings=poupança, cash=dinheiro',
      },
      initialBalance: { type: 'number', description: 'Saldo inicial (pode ser negativo)' },
      currency: { type: 'string' },
      color: { type: 'string' },
      id: { type: 'string', description: 'ID existente para editar' },
    },
    ['name', 'type'],
    async (args) => {
      const name = String(args.name ?? '').trim()
      if (!name) {
        return finish(t('upsert_account'), false, 'Nome da conta é obrigatório.', args)
      }
      const rawType = String(args.type ?? 'checking')
      const type = (ACCOUNT_TYPES as readonly string[]).includes(rawType)
        ? (rawType as AccountType)
        : 'checking'
      const state = getFinancesState()
      const account = upsertAccount({
        id: typeof args.id === 'string' && args.id.trim() ? args.id.trim() : undefined,
        name,
        type,
        currency:
          typeof args.currency === 'string' && args.currency.trim()
            ? args.currency.trim()
            : state.meta.defaultCurrency,
        initialBalance: Number.isFinite(Number(args.initialBalance))
          ? Number(args.initialBalance)
          : 0,
        color: typeof args.color === 'string' ? args.color : undefined,
      })
      return finish(
        t('upsert_account'),
        true,
        `Conta «${account.name}» [${account.id}] tipo ${account.type}, saldo inicial ${formatMoney(account.initialBalance, account.currency)}`,
        args,
      )
    },
  )

  reg(
    'remove_account',
    'Remove uma conta e transacções associadas.',
    { accountId: { type: 'string' } },
    ['accountId'],
    async (args) => {
      const accountId = String(args.accountId ?? '').trim()
      if (!accountId) {
        return finish(t('remove_account'), false, 'accountId obrigatório.', args)
      }
      const exists = getFinancesState().accounts.some((a) => a.id === accountId)
      if (!exists) {
        return finish(t('remove_account'), false, 'Conta não encontrada.', args)
      }
      removeAccount(accountId)
      return finish(t('remove_account'), true, 'Conta removida.', args)
    },
  )

  const summaryHandler: Handler = async (args) => {
    const s = getFinancesState()
    const month = typeof args.month === 'string' && args.month.trim() ? args.month.trim() : currentMonthKey()
    const summary = monthSummary(s, month)
    const text = [
      `Mês ${month}: receitas ${formatMoney(summary.income)}, despesas ${formatMoney(summary.expense)}, líquido ${formatMoney(summary.net)}`,
      `Saldo total: ${formatMoney(totalBalance(s))}`,
    ].join('\n')
    return finish(t('get_summary'), true, text, args)
  }
  reg('get_summary', 'Resumo do mês e saldo total.', { month: { type: 'string' } }, summaryHandler)
  reg('get_balance', 'Saldo consolidado e resumo do mês.', { month: { type: 'string' } }, summaryHandler)

  reg(
    'list_transactions',
    'Lista transações recentes.',
    {
      month: { type: 'string' },
      accountId: { type: 'string' },
      limit: { type: 'number' },
    },
    async (args) => {
      const s = getFinancesState()
      const month = typeof args.month === 'string' ? args.month : currentMonthKey()
      const limit = typeof args.limit === 'number' ? args.limit : 20
      let list = s.transactions.filter((tx) => tx.date.startsWith(month))
      if (typeof args.accountId === 'string') list = list.filter((tx) => tx.accountId === args.accountId)
      list = list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
      const lines = list.map((tx) => {
        const cat = s.categories.find((c) => c.id === tx.categoryId)?.name ?? ''
        return `- ${tx.date} ${tx.type} ${formatMoney(tx.amount)} ${tx.description} ${cat} [${tx.id}]`
      })
      return finish(t('list_transactions'), true, lines.join('\n') || 'Sem transações.', args)
    },
  )

  reg(
    'add_transaction',
    'Lançamento PONTUAL já ocorrido (recebeu/gastou numa data). Suporta parcelamentos (para dividir compras).',
    {
      accountId: { type: 'string' },
      amount: { type: 'number', description: 'Valor total da compra' },
      type: { type: 'string', enum: ['income', 'expense', 'investment'] },
      description: { type: 'string' },
      date: { type: 'string' },
      categoryId: { type: 'string' },
      installments: { type: 'number', description: 'Opcional. Quantidade de parcelas (ex: 3).' },
    },
    ['accountId', 'amount', 'type', 'description'],
    async (args) => {
      const accountId = String(args.accountId ?? '')
      const amount = Number(args.amount)
      const type = String(args.type ?? 'expense') as TransactionType
      const description = String(args.description ?? '').trim()
      const installments = Number(args.installments) > 0 ? Number(args.installments) : 1

      if (!accountId || !description || !Number.isFinite(amount) || amount <= 0) {
        return finish(t('add_transaction'), false, 'Parâmetros inválidos.', args)
      }
      if (!['income', 'expense', 'investment'].includes(type)) {
        return finish(t('add_transaction'), false, 'type inválido.', args)
      }
      
      const txs = addInstallmentTransaction({
        accountId,
        amount,
        type,
        description,
        date: typeof args.date === 'string' ? args.date : nowIso().slice(0, 10),
        categoryId: typeof args.categoryId === 'string' ? args.categoryId : undefined,
        installments,
      })
      
      const ids = txs.map((tx) => tx.id).join(', ')
      return finish(t('add_transaction'), true, `OK. ${txs.length} transações criadas. IDs: ${ids}`, args)
    },
  )

  reg(
    'add_transfer',
    'Transferência entre contas.',
    {
      fromAccountId: { type: 'string' },
      toAccountId: { type: 'string' },
      amount: { type: 'number' },
      description: { type: 'string' },
      date: { type: 'string' },
    },
    ['fromAccountId', 'toAccountId', 'amount', 'description'],
    async (args) => {
      const from = String(args.fromAccountId ?? '')
      const to = String(args.toAccountId ?? '')
      const amount = Number(args.amount)
      const description = String(args.description ?? '').trim()
      if (!from || !to || from === to || amount <= 0) {
        return finish(t('add_transfer'), false, 'Contas ou valor inválidos.', args)
      }
      addTransfer({
        fromAccountId: from,
        toAccountId: to,
        amount,
        description,
        date: typeof args.date === 'string' ? args.date : nowIso().slice(0, 10),
      })
      return finish(t('add_transfer'), true, 'Transferência registada.', args)
    },
  )

  reg('list_budgets', 'Orçamentos do mês.', { month: { type: 'string' } }, async (args) => {
    const s = getFinancesState()
    const month = typeof args.month === 'string' ? args.month : currentMonthKey()
    const lines = s.budgets
      .filter((b) => b.month === month)
      .map((b) => {
        const cat = s.categories.find((c) => c.id === b.categoryId)?.name
        return `- ${cat}: limite ${formatMoney(b.limitAmount)} [${b.id}]`
      })
    return finish(t('list_budgets'), true, lines.join('\n') || 'Sem orçamentos.', args)
  })

  reg(
    'upsert_budget',
    'Define orçamento de categoria no mês.',
    { categoryId: { type: 'string' }, month: { type: 'string' }, limitAmount: { type: 'number' } },
    ['categoryId', 'limitAmount'],
    async (args) => {
      const b = upsertBudget({
        categoryId: String(args.categoryId),
        month: typeof args.month === 'string' ? args.month : currentMonthKey(),
        limitAmount: Number(args.limitAmount),
      })
      return finish(t('upsert_budget'), true, `Orçamento ${b.id}`, args)
    },
  )

  reg('list_goals', 'Metas financeiras.', {}, async () => {
    const goals = getFinancesState().goals
    const lines = goals.map(
      (g) => `- ${g.name}: ${formatMoney(g.currentAmount)}/${formatMoney(g.targetAmount)} [${g.id}]`,
    )
    return finish(t('list_goals'), true, lines.join('\n') || 'Sem metas.', {})
  })

  reg(
    'add_goal_contribution',
    'Contribui para uma meta.',
    { goalId: { type: 'string' }, amount: { type: 'number' } },
    ['goalId', 'amount'],
    async (args) => {
      const goalId = String(args.goalId)
      const amount = Number(args.amount)
      if (!goalId || amount <= 0) return finish(t('add_goal_contribution'), false, 'Inválido.', args)
      addGoalContribution(goalId, amount)
      return finish(t('add_goal_contribution'), true, 'Contribuição registada.', args)
    },
  )

  reg('list_bills', 'Contas a pagar.', { status: { type: 'string' } }, async (args) => {
    const s = getFinancesState()
    let bills = s.bills
    if (args.status === 'pending') bills = bills.filter((b) => b.status === 'pending')
    const lines = bills.map((b) => `- ${b.description} ${formatMoney(b.amount)} vence ${b.dueDate} [${b.id}]`)
    return finish(t('list_bills'), true, lines.join('\n') || 'Sem contas.', args)
  })

  reg(
    'add_bill',
    'Regista conta a pagar.',
    {
      description: { type: 'string' },
      amount: { type: 'number' },
      dueDate: { type: 'string' },
      categoryId: { type: 'string' },
    },
    ['description', 'amount', 'dueDate'],
    async (args) => {
      const bill = upsertBill({
        description: String(args.description),
        amount: Number(args.amount),
        dueDate: String(args.dueDate),
        categoryId: typeof args.categoryId === 'string' ? args.categoryId : undefined,
      })
      return finish(t('add_bill'), true, `Conta ${bill.id}`, args)
    },
  )

  reg(
    'pay_bill',
    'Marca conta como paga (cria despesa).',
    { billId: { type: 'string' }, accountId: { type: 'string' } },
    ['billId', 'accountId'],
    async (args) => {
      const tx = payBill(String(args.billId), String(args.accountId))
      if (!tx) return finish(t('pay_bill'), false, 'Conta não encontrada ou já paga.', args)
      return finish(t('pay_bill'), true, `Paga. Transação ${tx.id}`, args)
    },
  )

  reg('get_bills_summary', 'Resumo de contas pendentes.', {}, async () => {
    const b = billsSummary(getFinancesState())
    return finish(
      t('get_bills_summary'),
      true,
      `Pendentes: ${b.pendingCount} (${formatMoney(b.pendingTotal)}), atraso: ${b.overdueCount}`,
      {},
    )
  })

  reg('list_cards', 'Cartões de crédito.', {}, async () => {
    const s = getFinancesState()
    const lines = s.creditCards.map((c) => {
      const sum = cardSummary(s, c)
      return `- ${c.name} fatura ${formatMoney(sum.currentBill)} limite ${formatMoney(c.limit)} [${c.id}]`
    })
    return finish(t('list_cards'), true, lines.join('\n') || 'Sem cartões.', {})
  })

  reg('list_recurring', 'Lista REGRAS de receita/despesa recorrente (não são transações únicas).', {}, async () => {
    const s = getFinancesState()
    const lines = s.recurring.map((r) => {
      const acc = s.accounts.find((a) => a.id === r.accountId)?.name ?? r.accountId
      const cat = s.categories.find((c) => c.id === r.categoryId)?.name ?? ''
      return `- ${r.description}: ${formatMoney(r.amount)} ${r.type} ${r.frequency} conta=${acc} cat=${cat} próx=${r.nextDueDate} activo=${r.active} [${r.id}]`
    })
    return finish(t('list_recurring'), true, lines.join('\n') || 'Sem recorrentes.', {})
  })

  reg(
    'upsert_recurring',
    'Cria ou actualiza RECEITA/DESPESA RECORRENTE (ex.: salário todo mês dia 5). Não cria transação; não cria conta bancária.',
    {
      accountId: { type: 'string', description: 'Conta onde cai ou sai o dinheiro' },
      categoryId: { type: 'string' },
      amount: { type: 'number' },
      type: { type: 'string', enum: ['income', 'expense'] },
      frequency: { type: 'string', enum: ['weekly', 'monthly', 'yearly'] },
      nextDueDate: { type: 'string', description: 'Próxima ocorrência YYYY-MM-DD' },
      description: { type: 'string' },
      active: { type: 'boolean' },
      id: { type: 'string' },
    },
    ['accountId', 'categoryId', 'amount', 'type', 'frequency', 'nextDueDate', 'description'],
    async (args) => {
      const accountId = String(args.accountId ?? '').trim()
      const categoryId = String(args.categoryId ?? '').trim()
      const description = String(args.description ?? '').trim()
      const amount = Number(args.amount)
      const rawType = String(args.type ?? 'expense')
      const type = rawType === 'income' ? 'income' : 'expense'
      const freqRaw = String(args.frequency ?? 'monthly')
      const frequency = (['weekly', 'monthly', 'yearly'] as const).includes(
        freqRaw as RecurringFrequency,
      )
        ? (freqRaw as RecurringFrequency)
        : 'monthly'
      if (!accountId || !categoryId || !description || !Number.isFinite(amount) || amount <= 0) {
        return finish(t('upsert_recurring'), false, 'Parâmetros inválidos.', args)
      }
      const item = upsertRecurring({
        id: typeof args.id === 'string' && args.id.trim() ? args.id.trim() : undefined,
        accountId,
        categoryId,
        amount,
        type,
        frequency,
        nextDueDate:
          typeof args.nextDueDate === 'string' && args.nextDueDate.trim()
            ? args.nextDueDate.trim()
            : nowIso().slice(0, 10),
        active: args.active !== false,
        description,
      })
      return finish(
        t('upsert_recurring'),
        true,
        `Recorrente «${item.description}» [${item.id}] ${item.type} ${formatMoney(item.amount)} ${item.frequency}`,
        args,
      )
    },
  )

  reg(
    'remove_transaction',
    'Remove uma transação pontual (ex.: criada por engano).',
    { transactionId: { type: 'string' } },
    ['transactionId'],
    async (args) => {
      const id = String(args.transactionId ?? '').trim()
      if (!id) return finish(t('remove_transaction'), false, 'transactionId obrigatório.', args)
      const exists = getFinancesState().transactions.some((x) => x.id === id)
      if (!exists) {
        return finish(t('remove_transaction'), false, 'Transação não encontrada.', args)
      }
      removeTransaction(id)
      return finish(t('remove_transaction'), true, 'Transação removida.', args)
    },
  )

  reg('generate_recurring', 'Gera UMA transação pontual a partir de um recorrente (quando o dia chegou).', { recurringId: { type: 'string' } }, ['recurringId'], async (args) => {
    const tx = generateRecurringTransaction(String(args.recurringId))
    if (!tx) return finish(t('generate_recurring'), false, 'Recorrente inválido.', args)
    return finish(t('generate_recurring'), true, `Transação ${tx.id}`, args)
  })

  reg('list_piggy_banks', 'Caixinhas.', {}, async () => {
    const lines = getFinancesState().piggyBanks.map(
      (p) => `- ${p.name}: ${formatMoney(p.currentAmount)} [${p.id}]`,
    )
    return finish(t('list_piggy_banks'), true, lines.join('\n') || 'Sem caixinhas.', {})
  })

  reg(
    'piggy_deposit',
    'Depósito em caixinha.',
    { piggyBankId: { type: 'string' }, amount: { type: 'number' } },
    ['piggyBankId', 'amount'],
    async (args) => {
      piggyDeposit(String(args.piggyBankId), Number(args.amount))
      return finish(t('piggy_deposit'), true, 'Depósito feito.', args)
    },
  )

  reg(
    'piggy_withdraw',
    'Levantamento de caixinha.',
    { piggyBankId: { type: 'string' }, amount: { type: 'number' } },
    ['piggyBankId', 'amount'],
    async (args) => {
      piggyWithdraw(String(args.piggyBankId), Number(args.amount))
      return finish(t('piggy_withdraw'), true, 'Levantamento feito.', args)
    },
  )

  reg(
    'categorize_transaction',
    'Sugere categoria por descrição.',
    { description: { type: 'string' }, type: { type: 'string', enum: ['income', 'expense', 'investment'] } },
    ['description'],
    async (args) => {
      const s = getFinancesState()
      const txType = (args.type as TransactionType) || 'expense'
      const r = suggestCategoryId(String(args.description), txType, s.transactions, s.categories)
      return finish(
        t('categorize_transaction'),
        true,
        `${r.categoryName} (${Math.round(r.confidence * 100)}%) id=${r.categoryId ?? 'n/a'}`,
        args,
      )
    },
  )
}

export function unregisterAllFinancesTools(): void {
  toolRegistry.unregisterByPrefix(TOOL_PREFIX)
}
