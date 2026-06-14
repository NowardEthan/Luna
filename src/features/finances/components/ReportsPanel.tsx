import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { useFinancesState } from '../financesStore'
import {
  formatMoney,
  lastSixMonths,
  monthSummary,
  spendingByCategory,
} from '../financesSelectors'
import { currentMonthKey } from '../financesId'
import { ArrowDownIcon, ArrowUpIcon, AnalyticsIcon, TagIcon } from './FinancesIcons'

export function ReportsPanel() {
  const { t } = useTranslation()
  const state = useFinancesState()
  const [month, setMonth] = useState(currentMonthKey())
  const summary = monthSummary(state, month)
  const byCategory = spendingByCategory(state, month)
  const maxCat = byCategory[0]?.total ?? 1

  const evolution = useMemo(() => {
    return lastSixMonths().map((m) => ({
      month: m,
      ...monthSummary(state, m),
    }))
  }, [state])

  const maxNet = Math.max(
    1,
    ...evolution.map((e) => Math.max(Math.abs(e.income), Math.abs(e.expense))),
  )

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 className="text-lg font-bold text-fg">{t('finances.reports.title')}</h2>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-xs text-fg-muted font-medium uppercase tracking-wider">{t('finances.reports.period')}</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-fg focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all cursor-pointer shadow-sm"
            />
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="luna-card luna-card--hover group relative overflow-hidden hover:border-success/30">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-widest text-fg-muted">{t('finances.reports.income')}</p>
            <div className="flex h-6 w-6 items-center justify-center rounded bg-success/10 text-success">
              <ArrowDownIcon className="h-3 w-3" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-success">{formatMoney(summary.income)}</p>
        </div>
        
        <div className="luna-card luna-card--hover group relative overflow-hidden hover:border-danger/30">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-widest text-fg-muted">{t('finances.reports.expenses')}</p>
            <div className="flex h-6 w-6 items-center justify-center rounded bg-danger/10 text-danger">
              <ArrowUpIcon className="h-3 w-3" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-danger">{formatMoney(summary.expense)}</p>
        </div>
        
        <div className="luna-card-vivid">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-widest text-white/85">{t('finances.reports.netBalance')}</p>
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 text-white">
              <AnalyticsIcon className="h-3 w-3" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white">{formatMoney(summary.net)}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de Despesas */}
        <div className="luna-card luna-card--hover p-6">
          <h3 className="mb-6 text-sm font-semibold text-fg flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
            {t('finances.reports.byCategory')}
          </h3>
          
          {byCategory.length === 0 ? (
            <div className="py-10 text-center">
              <TagIcon className="mx-auto h-8 w-8 text-fg-muted opacity-30 mb-2" />
              <p className="text-xs text-fg-muted">{t('finances.reports.noExpenses')}</p>
            </div>
          ) : (
            <ul className="space-y-5">
              {byCategory.map((row, index) => {
                const colors = ['bg-indigo-500', 'bg-teal-500', 'bg-amber-500', 'bg-pink-500', 'bg-purple-500']
                const color = colors[index % colors.length]
                const percent = (row.total / summary.expense) * 100
                
                return (
                  <li key={row.categoryId} className="group">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-semibold text-fg flex items-center gap-1.5"><TagIcon className="h-3 w-3 text-fg-muted" /> {row.name}</span>
                      <div className="text-right">
                        <span className="block text-xs font-bold text-fg">{formatMoney(row.total)}</span>
                        <span className="block text-[10px] text-fg-muted font-medium">{t('finances.reports.percentOfExpenses', { percent: percent.toFixed(1) })}</span>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-line/50">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${color}`}
                        style={{ width: `${(row.total / maxCat) * 100}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Evolução nos Últimos 6 meses */}
        <div className="luna-card luna-card--hover p-6">
          <h3 className="mb-6 text-sm font-semibold text-fg flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            {t('finances.reports.evolution')}
          </h3>
          
          <ul className="space-y-5">
            {evolution.map((e) => {
              const inWidth = (e.income / maxNet) * 100
              const outWidth = (e.expense / maxNet) * 100
              
              return (
                <li key={e.month} className="group">
                  <div className="mb-2 flex items-end justify-between">
                    <span className="text-xs font-bold text-fg">{e.month}</span>
                    <div className="text-right flex flex-col items-end">
                      <span className={`text-xs font-bold ${e.net >= 0 ? 'text-success' : 'text-danger'}`}>{e.net > 0 ? '+' : ''}{formatMoney(e.net)}</span>
                    </div>
                  </div>
                  
                  {/* Gráfico de Barras Empilhadas / Bidirecionais */}
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-line/30 flex gap-0.5">
                    <div
                      className="bg-success transition-all duration-1000 h-full rounded-l-full group-hover:brightness-110"
                      style={{ width: `${inWidth}%` }}
                      title={t('finances.reports.incomeTitle', { amount: formatMoney(e.income) })}
                    />
                    <div
                      className="bg-danger transition-all duration-1000 h-full rounded-r-full group-hover:brightness-110"
                      style={{ width: `${outWidth}%` }}
                      title={t('finances.reports.expenseTitle', { amount: formatMoney(e.expense) })}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
