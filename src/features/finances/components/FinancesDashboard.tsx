import { useTranslation } from 'react-i18next'
import { useFinancesState } from '../financesStore'
import {
  budgetProgress,
  cardSummary,
  formatMoney,
  goalProgress,
  monthSummary,
  spendingByCategory,
  totalBalance,
} from '../financesSelectors'
import { currentMonthKey } from '../financesId'
import { TargetAvatarIcon, CardsIcon, ReceiptIcon, PiggyAvatarIcon } from './FinancesIcons'

export function FinancesDashboard() {
  const { t } = useTranslation()
  const state = useFinancesState()
  const month = currentMonthKey()
  const summary = monthSummary(state, month)
  const total = totalBalance(state)
  const topCats = spendingByCategory(state, month).slice(0, 5)
  const monthBudgets = state.budgets.filter((b) => b.month === month)
  const pendingBills = state.bills.filter(b => b.status === 'pending').slice(0, 4)

  // Gráfico de Pizza com conic-gradient
  let conicStops = ''
  let currentDegree = 0
  const colors = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6']
  const totalExpense = topCats.reduce((s, c) => s + c.total, 0) || 1
  
  if (topCats.length > 0) {
    conicStops = topCats.map((c, i) => {
      const percentage = (c.total / totalExpense) * 100
      const degrees = (percentage / 100) * 360
      const stop = `${colors[i % colors.length]} ${currentDegree}deg ${currentDegree + degrees}deg`
      currentDegree += degrees
      return stop
    }).join(', ')
  } else {
    conicStops = '#e5e7eb 0deg 360deg' // Cor vazia
  }

  return (
    <div className="space-y-4 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-500 md:space-y-6">
      {/* Top Cards - Premium Gradients & Shadows */}
      <div className="grid gap-3 sm:grid-cols-3 md:gap-4">
        <div className="luna-card-vivid">
          <p className="text-[10px] font-medium uppercase tracking-widest text-white/85 md:text-[11px]">{t('finances.dashboard.consolidatedBalance')}</p>
          <p className="mt-2 truncate text-xl font-bold tracking-tight text-white md:text-3xl" title={formatMoney(total)}>{formatMoney(total)}</p>
        </div>

        <StatCard
          label={t('finances.dashboard.monthIncome')}
          value={formatMoney(summary.income)}
          colorClass="text-success"
          icon="↓"
        />
        <StatCard
          label={t('finances.dashboard.monthExpense')}
          value={formatMoney(summary.expense)}
          colorClass="text-danger"
          icon="↑"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          
          {/* Gráfico de Pizza Premium */}
          <div className="luna-card luna-card--hover">
            <h3 className="mb-4 text-sm font-semibold text-fg">{t('finances.dashboard.spendingTitle')}</h3>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center md:h-32 md:w-32">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: `conic-gradient(${conicStops})` }}
                />
                <div className="absolute inset-2 rounded-full bg-surface" />
                <div className="z-10 text-center">
                  <span className="block text-[9px] text-fg-muted uppercase md:text-[10px]">{t('finances.dashboard.totalSpent')}</span>
                  <span className="block text-xs font-bold text-fg md:text-sm">{formatMoney(totalExpense)}</span>
                </div>
              </div>
              <ul className="w-full flex-1 space-y-3">
                {topCats.map((c, i) => (
                  <li key={c.categoryId} className="flex items-center gap-3 text-xs">
                    <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                    <span className="flex-1 truncate text-fg-dim font-medium">{c.name}</span>
                    <span className="font-semibold text-fg">{formatMoney(c.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Faturas de Cartão e Contas a Pagar */}
          <div className="luna-card">
            <h3 className="mb-4 text-sm font-semibold text-fg">{t('finances.dashboard.upcoming')}</h3>
            <div className="space-y-3">
              {pendingBills.length === 0 && state.creditCards.length === 0 && (
                <p className="text-xs text-fg-muted">{t('finances.dashboard.allClear')}</p>
              )}
              {state.creditCards.map(c => {
                const s = cardSummary(state, c)
                return (
                  <div key={c.id} className="group flex items-center justify-between rounded-lg border border-line/50 p-3 hover:border-accent/50 hover:bg-accent/5 transition-all">
                    <div>
                      <p className="text-xs font-semibold text-fg flex items-center gap-2">
                        <CardsIcon className="h-4 w-4 text-fg-muted" /> {t('finances.dashboard.cardBill', { name: c.name })}
                        {s.isClosed && <span className="rounded bg-danger/10 px-1 py-0.5 text-[8px] text-danger uppercase tracking-wider">{t('finances.dashboard.cardClosed')}</span>}
                      </p>
                      <p className="text-[10px] text-fg-muted">{t('finances.dashboard.dueInDays', { days: s.daysUntilDue })}</p>
                    </div>
                    <span className="text-sm font-bold text-fg">{formatMoney(s.currentBill)}</span>
                  </div>
                )
              })}
              {pendingBills.map(b => (
                <div key={b.id} className="group flex items-center justify-between rounded-lg border border-line/50 p-3 hover:border-danger/50 hover:bg-danger/5 transition-all">
                  <div>
                    <p className="text-xs font-semibold text-fg flex items-center gap-1"><ReceiptIcon className="h-3 w-3" /> {b.description}</p>
                    <p className="text-[10px] text-fg-muted">{t('finances.dashboard.billDueDay', { date: b.dueDate.split('-').reverse().join('/') })}</p>
                  </div>
                  <span className="text-sm font-bold text-danger">{formatMoney(b.amount)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Orçamentos */}
          {monthBudgets.length > 0 && (
            <div className="luna-card">
              <h3 className="mb-4 text-sm font-semibold text-fg flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                {t('finances.dashboard.budgetHealth')}
              </h3>
              <ul className="space-y-4">
                {monthBudgets.map((b) => {
                  const p = budgetProgress(state, b)
                  const cat = state.categories.find((c) => c.id === b.categoryId)
                  const over = p.spent > p.limit
                  return (
                    <li key={b.id} className="text-xs group">
                      <div className="flex justify-between text-fg-dim font-medium mb-1.5">
                        <span>{cat?.name ?? t('finances.dashboard.categoryFallback')}</span>
                        <span className={over ? 'text-danger font-bold' : 'text-fg'}>
                          {formatMoney(p.spent)} <span className="text-fg-muted font-normal">/ {formatMoney(p.limit)}</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-line/50">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${over ? 'bg-danger' : p.percent > 80 ? 'bg-warning' : 'bg-accent'}`}
                          style={{ width: `${Math.min(100, p.percent)}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Metas e Caixinhas */}
          {(state.goals.length > 0 || state.piggyBanks.length > 0) && (
            <div className="luna-card">
              <h3 className="mb-4 text-sm font-semibold text-fg">{t('finances.dashboard.goalsAndJars')}</h3>
              <ul className="space-y-4">
                {state.piggyBanks.map(p => (
                  <li key={p.id} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                      <PiggyAvatarIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-fg">{p.name}</p>
                      <p className="text-[10px] text-fg-muted">{t('finances.dashboard.reserveSaved')}</p>
                    </div>
                    <span className="text-sm font-bold text-success">{formatMoney(p.currentAmount)}</span>
                  </li>
                ))}
                {state.goals.map((g) => (
                  <li key={g.id} className="text-xs">
                    <div className="flex justify-between text-fg-dim font-medium mb-1.5">
                      <span className="flex items-center gap-1"><TargetAvatarIcon className="h-3 w-3" /> {g.name}</span>
                      <span>{Math.round(goalProgress(g))}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-line/50">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-1000"
                        style={{ width: `${goalProgress(g)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, colorClass = 'text-fg', icon }: { label: string; value: string; colorClass?: string; icon?: string }) {
  return (
    <div className="luna-card luna-card--hover">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[10px] font-medium uppercase tracking-widest text-fg-muted md:text-[11px]">{label}</p>
        {icon && <span className={`text-xs font-bold ${colorClass} bg-current/10 px-1.5 py-0.5 rounded`}>{icon}</span>}
      </div>
      <p className={`mt-2 truncate text-lg font-bold tracking-tight md:text-2xl ${colorClass}`} title={value}>
        {value}
      </p>
    </div>
  )
}
