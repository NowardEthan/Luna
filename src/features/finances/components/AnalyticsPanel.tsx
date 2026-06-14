import { useTranslation } from 'react-i18next'
import { useFinancesState } from '../financesStore'
import { cashflowByMonth, formatMoney, lastSixMonths, spendingByCategory } from '../financesSelectors'
import { currentMonthKey } from '../financesId'
import { AnalyticsIcon, TagIcon } from './FinancesIcons'

export function AnalyticsPanel() {
  const { t } = useTranslation()
  const state = useFinancesState()
  const month = currentMonthKey()
  const months = lastSixMonths()
  const flow = cashflowByMonth(state, months)
  const cats = spendingByCategory(state, month)
  const max = cats[0]?.total ?? 1

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <AnalyticsIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-fg">{t('finances.analytics.title')}</h2>
          <p className="text-[11px] text-fg-muted">{t('finances.analytics.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de Cashflow */}
        <div className="luna-card luna-card--hover p-6">
          <h3 className="mb-6 text-sm font-semibold text-fg flex items-center gap-2">
            {t('finances.analytics.cashflow')}
          </h3>
          <ul className="space-y-5">
            {flow.map((f) => (
              <li key={f.month} className="group">
                <div className="mb-2 flex justify-between items-end">
                  <span className="text-xs font-bold text-fg">{f.month}</span>
                  <span className={`text-sm font-extrabold ${f.net >= 0 ? 'text-success' : 'text-danger'}`}>
                    {f.net > 0 ? '+' : ''}{formatMoney(f.net)}
                  </span>
                </div>
                
                {/* Linha indicadora de magnitude */}
                <div className="h-1.5 w-full rounded-full bg-line/40 overflow-hidden relative">
                   <div 
                     className={`absolute top-0 h-full rounded-full transition-all duration-1000 ${f.net >= 0 ? 'bg-success left-1/2 origin-left' : 'bg-danger right-1/2 origin-right'}`}
                     style={{ width: `${Math.min(50, (Math.abs(f.net) / 5000) * 50)}%` }}
                   />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Despesas por Categoria (Mesmo de Reports, mas fixo no mês atual) */}
        <div className="luna-card luna-card--hover p-6">
          <h3 className="mb-6 text-sm font-semibold text-fg flex items-center gap-2">
            {t('finances.analytics.monthExpenses', { month })}
          </h3>
          {cats.length === 0 ? (
            <div className="py-10 text-center">
               <TagIcon className="mx-auto h-8 w-8 text-fg-muted opacity-30 mb-2" />
               <p className="text-xs text-fg-muted">{t('finances.analytics.noExpenses')}</p>
            </div>
          ) : (
            <ul className="space-y-5">
              {cats.map((c, index) => {
                const colors = ['bg-indigo-500', 'bg-teal-500', 'bg-amber-500', 'bg-pink-500', 'bg-purple-500']
                const color = colors[index % colors.length]
                
                return (
                  <li key={c.categoryId} className="group">
                    <div className="flex justify-between text-[11px] mb-2 font-medium">
                      <span className="text-fg flex items-center gap-1.5"><TagIcon className="h-3 w-3 text-fg-muted"/> {c.name}</span>
                      <span className="text-fg font-bold">{formatMoney(c.total)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-line/50">
                      <div className={`h-full rounded-full transition-all duration-1000 ${color}`} style={{ width: `${(c.total / max) * 100}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
