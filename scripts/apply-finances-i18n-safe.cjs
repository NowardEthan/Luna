/**
 * Safe PT → t() replacements for finances panels (exact matches only).
 */
const fs = require('fs')
const path = require('path')

const REPLACEMENTS = [
  // bills
  ['>Contas a Pagar<', ">{t('finances.bills.title')}<"],
  ["'+ Nova Conta'", "t('finances.bills.newBill')"],
  ['>Nenhuma conta a pagar encontrada.<', ">{t('finances.bills.empty')}<"],
  ["'Atrasada'", "t('finances.bills.overdue')"],
  ['`Vence ${dateParts[2]}/${dateParts[1]}`', "t('finances.bills.dueOn', { date: `${dateParts[2]}/${dateParts[1]}` })"],
  ['>Marcar Pago<', ">{t('finances.bills.markPaid')}<"],
  ['title="Perguntar à Luna sobre como quitar esta dívida"', "title={t('finances.bills.askLunaTitle')}"],
  ['> Lançar Despesa<', ">{t('finances.bills.addExpense')}<"],
  ['>Lançar Despesa<', ">{t('finances.bills.addExpense')}<"],
  ['<FieldLabel>Descrição da Conta</FieldLabel>', "<FieldLabel>{t('finances.bills.description')}</FieldLabel>"],
  ['placeholder="Ex: Conta de Luz"', "placeholder={t('finances.bills.descriptionPlaceholder')}"],
  ['<FieldLabel>Data de Vencimento</FieldLabel>', "<FieldLabel>{t('finances.bills.dueDate')}</FieldLabel>"],
  ['>Adicionar Conta<', ">{t('finances.bills.add')}<"],
  // budgets
  ["'+ Novo Orçamento'", "t('finances.budgets.new')"],
  ['>Nenhum limite de orçamento definido para este mês.<', ">{t('finances.budgets.empty')}<"],
  ["'Limite Estourado!'", "t('finances.budgets.overLimit')"],
  ["'Atenção, quase no limite!'", "t('finances.budgets.nearLimit')"],
  ['title="Apagar Orçamento"', "title={t('finances.common.delete')}"],
  ['>de {formatMoney(p.limit)}<', ">{t('finances.budgets.of')} {formatMoney(p.limit)}<"],
  ['title="Pedir conselho à Luna sobre este orçamento"', "title={t('finances.budgets.askLunaTitle')}"],
  ["'Ajudar'", "t('finances.budgets.help')"],
  ['>Definir Orçamento<', ">{t('finances.budgets.setBudget')}<"],
  ['<FieldLabel>Categoria de Gasto</FieldLabel>', "<FieldLabel>{t('finances.budgets.spendingCategory')}</FieldLabel>"],
  ['>Ativar Orçamento<', ">{t('finances.budgets.activate')}<"],
  // transactions
  ['>Mês Ref.<', ">{t('finances.transactions.refMonth')}<"],
  ['>Filtrar Conta<', ">{t('finances.transactions.filterAccount')}<"],
  ['>+ Adicionar Lançamento<', ">{t('finances.transactions.add')}<"],
  ['>Nenhum lançamento encontrado para este período.<', ">{t('finances.transactions.empty')}<"],
  ['>Novo Lançamento<', ">{t('finances.transactions.newEntry')}<"],
  ['title="Deixe a Luna inferir a categoria e tipo automaticamente"', "title={t('finances.transactions.categorizeAiTitle')}"],
  ['> Categorizar via IA<', ">{t('finances.transactions.categorizeAi')}<"],
  ['>Categorizar via IA<', ">{t('finances.transactions.categorizeAi')}<"],
  ['<FieldLabel>Conta Principal</FieldLabel>', "<FieldLabel>{t('finances.transactions.mainAccount')}</FieldLabel>"],
  ['<FieldLabel>Para conta (Destino)</FieldLabel>', "<FieldLabel>{t('finances.transactions.toAccount')}</FieldLabel>"],
  ['<FieldLabel>Categoria (Tag Livre)</FieldLabel>', "<FieldLabel>{t('finances.transactions.categoryTag')}</FieldLabel>"],
  ['<FieldLabel>Valor Total (R$)</FieldLabel>', "<FieldLabel>{t('finances.transactions.amount', { currency: state.meta.defaultCurrency })}</FieldLabel>"],
  ['<FieldLabel>Descrição do Gasto</FieldLabel>', "<FieldLabel>{t('finances.transactions.description')}</FieldLabel>"],
  ['placeholder="Ex: Ifood, Netflix..."', "placeholder={t('finances.transactions.descriptionPlaceholder')}"],
  ['<FieldLabel>Parcelas (1 = à vista)</FieldLabel>', "<FieldLabel>{t('finances.transactions.installments')}</FieldLabel>"],
  ['>Salvar Transação<', ">{t('finances.transactions.save')}<"],
  ['> IA<', ">{t('finances.transactions.aiShort')}<"],
  // cards
  ['>Meus Cartões<', ">{t('finances.cards.title')}<"],
  ['>+ Adicionar Cartão<', ">{t('finances.cards.add')}<"],
  ['>Nenhum cartão cadastrado ainda.<', ">{t('finances.cards.empty')}<"],
  ['title="Excluir"', "title={t('finances.common.delete')}"],
  ['>Fatura Atual<', ">{t('finances.cards.currentStatement')}<"],
  ['>Limite Total<', ">{t('finances.cards.totalLimit')}<"],
  ['Vence dia {c.dueDay}', "{t('finances.cards.dueDay', { day: c.dueDay })}"],
  ['Fecha dia {c.closingDay}', "{t('finances.cards.closesDay', { day: c.closingDay })}"],
  ['>Adicionar Cartão<', ">{t('finances.cards.addForm')}<"],
  ['<FieldLabel>Nome ou Apelido</FieldLabel>', "<FieldLabel>{t('finances.cards.nickname')}</FieldLabel>"],
  ['placeholder="Ex: Nubank, Inter..."', "placeholder={t('finances.cards.nicknamePlaceholder')}"],
  ['placeholder="Ex: 5000"', "placeholder={t('finances.cards.limitPlaceholder')}"],
  ['<FieldLabel>Dia de Fechamento</FieldLabel>', "<FieldLabel>{t('finances.cards.closingDay')}</FieldLabel>"],
  ['<FieldLabel>Dia de Vencimento</FieldLabel>', "<FieldLabel>{t('finances.cards.dueDayLabel')}</FieldLabel>"],
  ['>Salvar Cartão<', ">{t('finances.cards.save')}<"],
  // goals
  ['>Meus Objetivos & Metas<', ">{t('finances.goals.title')}<"],
  ["'↓ Guardar Dinheiro'", "t('finances.goals.contribute')"],
  ["'+ Nova Meta'", "t('finances.goals.new')"],
  ['>Você ainda não criou nenhuma meta de economia.<', ">{t('finances.goals.empty')}<"],
  ["'Concluído!'", "t('finances.goals.completed')"],
  ["'Em Progresso'", "t('finances.goals.inProgress')"],
  ['title="Excluir Meta"', "title={t('finances.common.delete')}"],
  ['>de {formatMoney(g.targetAmount)}<', ">{t('finances.goals.of')} {formatMoney(g.targetAmount)}<"],
  ['{Math.floor(p)}% alcançado', "t('finances.goals.percentReached', { percent: Math.floor(p) })"],
  ['>✨ Nova Meta<', ">{t('finances.goals.newGoal')}<"],
  ['<FieldLabel>Nome da Meta</FieldLabel>', "<FieldLabel>{t('finances.goals.name')}</FieldLabel>"],
  ['placeholder="Ex: Viagem Japão 2027"', "placeholder={t('finances.goals.namePlaceholder')}"],
  ['>Criar Meta<', ">{t('finances.goals.create')}<"],
  ['>💰 Guardar Dinheiro<', ">{t('finances.goals.saveMoney')}<"],
  ['>Confirmar Aporte<', ">{t('finances.goals.confirmContribution')}"],
  // piggy
  ['>Minhas Caixinhas<', ">{t('finances.piggy.title')}<"],
  ["'⇄ Movimentar'", "t('finances.piggy.move')"],
  ["'+ Nova Caixinha'", "t('finances.piggy.new')"],
  ['>Total Guardado<', ">{t('finances.piggy.totalSaved')}<"],
  ['<FieldLabel>Nome da Caixinha</FieldLabel>', "<FieldLabel>{t('finances.piggy.jarName')}</FieldLabel>"],
  ['placeholder="Ex: Reserva de Emergência"', "placeholder={t('finances.piggy.jarPlaceholder')}"],
  ['placeholder="Ex: 10000"', "placeholder={t('finances.piggy.targetPlaceholder')}"],
  ['<FieldLabel>Caixinha de Destino/Origem</FieldLabel>', "<FieldLabel>{t('finances.piggy.jarSelect')}</FieldLabel>"],
  ['>Selecione a caixinha...<', ">{t('finances.piggy.selectJar')}<"],
  // recurring
  ['>Despesas e Receitas Recorrentes<', ">{t('finances.recurring.title')}<"],
  ["'+ Nova Recorrente'", "t('finances.recurring.new')"],
  ['>Próxima {dateParts[2]}/{dateParts[1]}<', ">{t('finances.recurring.nextOn', { date: `${dateParts[2]}/${dateParts[1]}` })}<"],
  ['>Nova Recorrência<', ">{t('finances.recurring.newForm')}<"],
  ['placeholder="Ex: Netflix, Salário..."', "placeholder={t('finances.recurring.descriptionPlaceholder')}"],
  ['<FieldLabel>Conta Vinculada</FieldLabel>', "<FieldLabel>{t('finances.recurring.linkedAccount')}</FieldLabel>"],
  ['<FieldLabel>Próxima Data</FieldLabel>', "<FieldLabel>{t('finances.recurring.nextDate')}</FieldLabel>"],
  // reports
  ['>Relatório de Resultados<', ">{t('finances.reports.title')}<"],
  ['>Saldo Líquido<', ">{t('finances.reports.netBalance')}<"],
  ['>Sem despesas registradas neste mês.<', ">{t('finances.reports.noExpenses')}<"],
  ['>Impacto por Categoria<', ">{t('finances.reports.byCategory')}<"],
  ['{percent.toFixed(1)}% das despesas', "t('finances.reports.percentOfExpenses', { percent: percent.toFixed(1) })"],
  ['>Evolução (Últimos 6 meses)<', ">{t('finances.reports.evolution')}<"],
  ['title={`Receitas ${formatMoney(e.income)}`}', "title={t('finances.reports.incomeTitle', { amount: formatMoney(e.income) })}"],
  ['title={`Despesas ${formatMoney(e.expense)}`}', "title={t('finances.reports.expenseTitle', { amount: formatMoney(e.expense) })}"],
  // analytics
  ['>Analytics de Caixa<', ">{t('finances.analytics.title')}<"],
  ['>Desempenho e comportamento do último semestre.<', ">{t('finances.analytics.subtitle')}<"],
  ['>Cashflow Consolidado (6 meses)<', ">{t('finances.analytics.cashflow')}<"],
  ['>Despesas do Mês Atual ({month})<', ">{t('finances.analytics.monthExpenses', { month })}<"],
  // notifications
  ['>Central de Alertas<', ">{t('finances.notifications.title')}<"],
  ['>Marcar todas lidas<', ">{t('finances.notifications.markAllRead')}<"],
  ['>Você não tem nenhum alerta no momento.<', ">{t('finances.notifications.noAlerts')}<"],
  ['>Lida<', ">{t('finances.notifications.read')}<"],
  ['>Ver Detalhes →<', ">{t('finances.notifications.viewDetails')}<"],
  // dashboard
  ['>Saldo Consolidado<', ">{t('finances.dashboard.consolidatedBalance')}<"],
  ['>Receitas do Mês<', ">{t('finances.dashboard.monthIncome')}<"],
  ['>Despesas do Mês<', ">{t('finances.dashboard.monthExpense')}<"],
  ['>Onde foi o seu dinheiro?<', ">{t('finances.dashboard.spendingTitle')}<"],
  ['>Total Gasto<', ">{t('finances.dashboard.totalSpent')}<"],
  ['>Próximos Vencimentos<', ">{t('finances.dashboard.upcoming')}<"],
  ['>Saúde dos Orçamentos<', ">{t('finances.dashboard.budgetHealth')}<"],
  ['>Metas & Reservas<', ">{t('finances.dashboard.goalsAndJars')}<"],
  ['>Reserva guardada<', ">{t('finances.dashboard.reserveSaved')}<"],
  ['>Tudo limpo por aqui!<', ">{t('finances.dashboard.allClear')}<"],
  // form select
  ['>Selecionar…<', ">{t('finances.form.select')}<"],
  ['<option value="">Selecionar…</option>', '<option value="">{t(\'finances.form.select\')}</option>'],
  ['<option value="">Selecione a meta...</option>', '<option value="">{t(\'finances.goals.selectGoal\')}</option>'],
]

const dir = path.join(__dirname, '../src/features/finances/components')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.tsx') && f !== 'FinancesIcons.tsx')

for (const file of files) {
  const fp = path.join(dir, file)
  let s = fs.readFileSync(fp, 'utf8')

  if (s.includes('useTranslation') && !s.includes('const { t }')) {
    s = s.replace(
      /export function (\w+)\([^)]*\) \{\n(\s*)const state/,
      "export function $1() {\n$2const { t } = useTranslation()\n$2const state",
    )
    s = s.replace(
      /export function (\w+)\(\{([^}]+)\}: Props\) \{\n(\s*)const state/,
      "export function $1({$2}: Props) {\n$3const { t } = useTranslation()\n$3const state",
    )
    s = s.replace(
      /export function (\w+)\(\) \{\n(\s*)const state/,
      (m, fn, sp) =>
        m.includes('useTranslation()') ? m : `export function ${fn}() {\n${sp}const { t } = useTranslation()\n${sp}const state`,
    )
    s = s.replace(
      /export function FinancesDashboard\(\) \{\n(\s*)const state/,
      "export function FinancesDashboard() {\n$1const { t } = useTranslation()\n$1const state",
    )
  }

  for (const [from, to] of REPLACEMENTS) {
    if (s.includes(from)) s = s.split(from).join(to)
  }

  fs.writeFileSync(fp, s)
  console.log('applied', file)
}
