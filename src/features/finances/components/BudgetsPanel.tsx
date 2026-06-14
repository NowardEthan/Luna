import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { defaultBudgetMonth, removeBudget, upsertBudget, useFinancesState } from '../financesStore'
import { budgetProgress, formatMoney } from '../financesSelectors'
import { FieldLabel, SelectInput, TextInput } from './FinanceFormFields'
import { BudgetsIcon, CloseIcon, TrashIcon, TagIcon, LunaIcon } from './FinancesIcons'
import { eventBus } from '../../../core/events/EventBus'

export function BudgetsPanel() {
  const { t } = useTranslation()
  const state = useFinancesState()
  const [month, setMonth] = useState(defaultBudgetMonth())
  const [categoryId, setCategoryId] = useState('')
  const [limit, setLimit] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const monthBudgets = state.budgets.filter((b) => b.month === month)
  const expenseCats = state.categories.filter((c) => c.kind === 'expense')

  function startNew() {
    setCategoryId('')
    setLimit('')
    setIsAdding(true)
  }

  function save() {
    if (!categoryId) return
    const lim = Number(limit)
    if (!Number.isFinite(lim) || lim <= 0) return
    upsertBudget({ categoryId, month, limitAmount: lim })
    setLimit('')
    setCategoryId('')
    setIsAdding(false)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-fg">{t('finances.tabs.budgets')}</h2>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-fg-muted font-medium uppercase tracking-wider">
              {t('finances.budgets.month')}
            </span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-fg focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={() => (isAdding ? setIsAdding(false) : startNew())}
          className="luna-btn-primary rounded-full px-4 py-2 text-xs"
        >
          {isAdding ? t('finances.common.back') : t('finances.budgets.new')}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {monthBudgets.length === 0 && !isAdding && (
            <div className="luna-empty">
              <span className="mb-2 flex items-center justify-center text-fg-muted opacity-50">
                <BudgetsIcon className="h-10 w-10" />
              </span>
              {t('finances.budgets.empty')}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {monthBudgets.map((b) => {
              const p = budgetProgress(state, b)
              const cat = state.categories.find((c) => c.id === b.categoryId)
              const isOverdue = p.spent > p.limit
              const isWarning = p.percent > 80 && !isOverdue

              return (
                <div
                  key={b.id}
                  className={`luna-card luna-card--hover group relative flex flex-col justify-between overflow-hidden ${isOverdue ? 'border-danger/30 bg-danger/5' : isWarning ? 'border-warning/30 bg-warning/5' : ''}`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isOverdue ? 'bg-danger/20 text-danger' : isWarning ? 'bg-warning/20 text-warning' : 'bg-accent/10 text-accent'}`}
                      >
                        <TagIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-fg line-clamp-1">
                          {cat?.name ?? t('finances.dashboard.categoryFallback')}
                        </p>
                        <p
                          className={`text-[10px] font-semibold flex items-center gap-1 ${isOverdue ? 'text-danger' : isWarning ? 'text-warning' : 'text-fg-muted'}`}
                        >
                          {isOverdue
                            ? t('finances.budgets.overLimit')
                            : isWarning
                              ? t('finances.budgets.nearLimit')
                              : t('finances.budgets.healthy')}
                        </p>
                      </div>
                    </div>

                    <button
                      className="rounded-full bg-danger/10 text-danger p-2 hover:bg-danger hover:text-white transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                      onClick={() => removeBudget(b.id)}
                      title={t('finances.common.delete')}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5">
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-xs font-bold text-fg">{formatMoney(p.spent)}</p>
                      <p className="text-[10px] text-fg-muted font-medium">
                        {t('finances.budgets.of')} {formatMoney(p.limit)}
                      </p>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-line/50 relative">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${isOverdue ? 'bg-danger' : isWarning ? 'bg-warning' : 'bg-accent'}`}
                        style={{ width: `${Math.min(100, p.percent)}%` }}
                      />
                    </div>
                  </div>
                  {(isOverdue || isWarning) && (
                    <button
                      className={`absolute right-4 top-14 flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold transition-all ${isOverdue ? 'bg-danger/10 text-danger hover:bg-danger hover:text-white' : 'bg-warning/10 text-warning hover:bg-warning hover:text-white'}`}
                      onClick={() => eventBus.emit('luna:chat:open', null)}
                      title={t('finances.budgets.askLunaTitle')}
                    >
                      <LunaIcon className="h-3 w-3" />{' '}
                      {isOverdue ? t('finances.budgets.help') : t('finances.budgets.tip')}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {isAdding && (
          <div className="luna-card h-fit animate-in slide-in-from-right-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg">{t('finances.budgets.setBudget')}</h3>
              <button onClick={() => setIsAdding(false)} className="text-fg-muted hover:text-fg">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel>{t('finances.budgets.spendingCategory')}</FieldLabel>
                <SelectInput value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">{t('finances.form.select')}</option>
                  {expenseCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </SelectInput>
              </div>

              <div>
                <FieldLabel>
                  {t('finances.budgets.limit', { currency: state.meta.defaultCurrency })}
                </FieldLabel>
                <TextInput
                  type="number"
                  step="0.01"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder={t('finances.accounts.amountPlaceholder')}
                />
              </div>

              <button
                type="button"
                className="luna-btn-primary mt-4 w-full text-xs"
                onClick={save}
              >
                {t('finances.budgets.activate')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
