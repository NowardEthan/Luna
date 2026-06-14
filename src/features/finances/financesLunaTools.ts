import type { RegisteredTool } from '../../core/registry/types'
import { finishTool } from '../../core/tools/toolResult'
import { getFinancesState, upsertTransaction, upsertRecurring, upsertBill, upsertBudget, upsertCategory } from './financesStore'
import { monthSummary, spendingByCategory, totalBalance } from './financesSelectors'
import { currentMonthKey } from './financesId'

// ======= FERRAMENTAS DE LEITURA E ALGORITMO ======= //

export const financesListAccountsTool: RegisteredTool = {
  name: 'luna-finances__list_accounts',
  family: 'finances',
  uiLabel: 'Ler Contas Bancárias',
  uiMeta: { label: 'Ler Contas', badgeClass: 'bg-indigo-500/20 text-indigo-400' },
  schema: {
    type: 'function',
    function: {
      name: 'luna-finances__list_accounts',
      description: 'Lê todas as contas bancárias configuradas, com saldo atual exato e IDs reais.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  handler: async ({ args }) => {
    const state = getFinancesState()
    const accounts = state.accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))
    return finishTool('luna-finances__list_accounts', true, JSON.stringify({ totalBalance: totalBalance(state), accounts }), args, null)
  },
}

export const financesListCategoriesTool: RegisteredTool = {
  name: 'luna-finances__list_categories',
  family: 'finances',
  uiLabel: 'Ler Categorias Financeiras',
  uiMeta: { label: 'Ler Categorias', badgeClass: 'bg-indigo-500/20 text-indigo-400' },
  schema: {
    type: 'function',
    function: {
      name: 'luna-finances__list_categories',
      description: 'Retorna a lista de categorias separadas por despesa (expense) ou receita (income), para usar nas ferramentas.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  handler: async ({ args }) => {
    return finishTool('luna-finances__list_categories', true, JSON.stringify(getFinancesState().categories), args, null)
  },
}

export const financesGetAnalyticsTool: RegisteredTool = {
  name: 'luna-finances__get_analytics',
  family: 'finances',
  uiLabel: 'Motor Analítico (Cálculos Mês/Semestre)',
  uiMeta: { label: 'Consultar Algoritmo', badgeClass: 'bg-purple-500/20 text-purple-400' },
  schema: {
    type: 'function',
    function: {
      name: 'luna-finances__get_analytics',
      description: 'Solicita ao algoritmo nativo o resumo matemático, lucros, despesas e status de orçamentos para não errar nas somas.',
      parameters: { type: 'object', properties: { month: { type: 'string', description: 'Mês YYYY-MM' } } },
    },
  },
  handler: async ({ args }) => {
    const month = (args.month as string) || currentMonthKey()
    const state = getFinancesState()
    return finishTool('luna-finances__get_analytics', true, JSON.stringify({
      month,
      summary: monthSummary(state, month),
      spendingByCategory: spendingByCategory(state, month),
      budgets: state.budgets.filter(b => b.month === month)
    }), args, null)
  },
}

// ======= FERRAMENTAS DE OPERAÇÃO E ESCRITA (AUTOMAÇÃO) ======= //

export const financesAddTransactionTool: RegisteredTool = {
  name: 'luna-finances__add_transaction',
  family: 'finances',
  uiLabel: 'Adicionar Transação Manual',
  uiMeta: { label: 'Lançar Transação', badgeClass: 'bg-emerald-500/20 text-emerald-400' },
  schema: {
    type: 'function',
    function: {
      name: 'luna-finances__add_transaction',
      description: 'Lança uma nova despesa ou receita pontual/já ocorrida. Precisa dos IDs de conta e categoria. Usa YYYY-MM-DD.',
      parameters: {
        type: 'object',
        properties: {
          accountId: { type: 'string' },
          categoryId: { type: 'string' },
          amount: { type: 'number' },
          date: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['income', 'expense'] }
        },
        required: ['accountId', 'categoryId', 'amount', 'date', 'description', 'type'],
      },
    },
  },
  handler: async ({ args }) => {
    try {
      upsertTransaction(args as any)
      return finishTool('luna-finances__add_transaction', true, '{"ok":true,"message":"Transação lançada com sucesso"}', args, null)
    } catch (e: any) {
      return finishTool('luna-finances__add_transaction', false, JSON.stringify({ error: e.message }), args, null)
    }
  },
}

export const financesUpsertRecurringTool: RegisteredTool = {
  name: 'luna-finances__upsert_recurring',
  family: 'finances',
  uiLabel: 'Regra de Recorrência Mensal/Anual',
  uiMeta: { label: 'Criar Regra Recorrente', badgeClass: 'bg-emerald-500/20 text-emerald-400' },
  schema: {
    type: 'function',
    function: {
      name: 'luna-finances__upsert_recurring',
      description: 'Cria uma regra de recebimento ou cobrança que se repete periodicamente (ex: Spotify Mensal, Salário).',
      parameters: {
        type: 'object',
        properties: {
          accountId: { type: 'string' },
          categoryId: { type: 'string' },
          amount: { type: 'number' },
          type: { type: 'string', enum: ['income', 'expense'] },
          frequency: { type: 'string', enum: ['weekly', 'monthly', 'yearly'] },
          nextDueDate: { type: 'string', description: 'YYYY-MM-DD' },
          description: { type: 'string' }
        },
        required: ['accountId', 'categoryId', 'amount', 'type', 'frequency', 'nextDueDate', 'description'],
      },
    },
  },
  handler: async ({ args }) => {
    try {
      upsertRecurring({ ...args, active: true } as any)
      return finishTool('luna-finances__upsert_recurring', true, '{"ok":true,"message":"Regra de recorrência criada."}', args, null)
    } catch (e: any) {
      return finishTool('luna-finances__upsert_recurring', false, JSON.stringify({ error: e.message }), args, null)
    }
  },
}

export const financesAddBillTool: RegisteredTool = {
  name: 'luna-finances__add_bill',
  family: 'finances',
  uiLabel: 'Lançar Fatura Pendente',
  uiMeta: { label: 'Agendar Pagamento', badgeClass: 'bg-amber-500/20 text-amber-400' },
  schema: {
    type: 'function',
    function: {
      name: 'luna-finances__add_bill',
      description: 'Lança um boleto, fatura ou obrigação futura que AINDA NÃO FOI PAGA. Status inicia como pending.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          dueDate: { type: 'string', description: 'YYYY-MM-DD' },
          description: { type: 'string' }
        },
        required: ['amount', 'dueDate', 'description'],
      },
    },
  },
  handler: async ({ args }) => {
    try {
      upsertBill(args as any)
      return finishTool('luna-finances__add_bill', true, '{"ok":true,"message":"Fatura agendada."}', args, null)
    } catch (e: any) {
      return finishTool('luna-finances__add_bill', false, JSON.stringify({ error: e.message }), args, null)
    }
  },
}

export const financesUpsertBudgetTool: RegisteredTool = {
  name: 'luna-finances__upsert_budget',
  family: 'finances',
  uiLabel: 'Ajustar Limite do Orçamento',
  uiMeta: { label: 'Definir Limite', badgeClass: 'bg-emerald-500/20 text-emerald-400' },
  schema: {
    type: 'function',
    function: {
      name: 'luna-finances__upsert_budget',
      description: 'Define um teto de gastos/limite de orçamento para uma categoria específica num determinado mês.',
      parameters: {
        type: 'object',
        properties: {
          categoryId: { type: 'string' },
          month: { type: 'string', description: 'YYYY-MM' },
          limitAmount: { type: 'number' }
        },
        required: ['categoryId', 'month', 'limitAmount'],
      },
    },
  },
  handler: async ({ args }) => {
    try {
      upsertBudget(args as any)
      return finishTool('luna-finances__upsert_budget', true, '{"ok":true,"message":"Orçamento ajustado."}', args, null)
    } catch (e: any) {
      return finishTool('luna-finances__upsert_budget', false, JSON.stringify({ error: e.message }), args, null)
    }
  },
}

export const financesUpsertCategoryTool: RegisteredTool = {
  name: 'luna-finances__upsert_category',
  family: 'finances',
  uiLabel: 'Criar Categoria Dinâmica (Tag)',
  uiMeta: { label: 'Criar Categoria', badgeClass: 'bg-emerald-500/20 text-emerald-400' },
  schema: {
    type: 'function',
    function: {
      name: 'luna-finances__upsert_category',
      description: 'Cria uma nova categoria dinamicamente caso a que o usuário pediu não exista. Retorna o ID criado.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome da categoria (Ex: Cinema)' },
          kind: { type: 'string', enum: ['income', 'expense'] },
          icon: { type: 'string', description: 'Um único emoji representativo.' }
        },
        required: ['name', 'kind', 'icon'],
      },
    },
  },
  handler: async ({ args }) => {
    try {
      const id = crypto.randomUUID()
      upsertCategory({ id, ...args } as any)
      return finishTool('luna-finances__upsert_category', true, JSON.stringify({ ok: true, id, message: 'Categoria criada' }), args, null)
    } catch (e: any) {
      return finishTool('luna-finances__upsert_category', false, JSON.stringify({ error: e.message }), args, null)
    }
  },
}

export const lunaFinancesTools: RegisteredTool[] = [
  financesListAccountsTool,
  financesListCategoriesTool,
  financesGetAnalyticsTool,
  financesAddTransactionTool,
  financesUpsertRecurringTool,
  financesAddBillTool,
  financesUpsertBudgetTool,
  financesUpsertCategoryTool
]
