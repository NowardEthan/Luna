import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { removeCreditCard, upsertCreditCard, useFinancesState } from '../financesStore'
import { cardSummary, formatMoney } from '../financesSelectors'
import { FieldLabel, TextInput } from './FinanceFormFields'
import { CloseIcon } from './FinancesIcons'

export function CreditCardsPanel() {
  const { t } = useTranslation()
  const state = useFinancesState()
  const [name, setName] = useState('')
  const [limit, setLimit] = useState('')
  const [dueDay, setDueDay] = useState('10')
  const [closingDay, setClosingDay] = useState('3')
  const [isAdding, setIsAdding] = useState(false)

  function save() {
    const lim = Number(limit)
    const day = Number(dueDay)
    const cDay = Number(closingDay)
    if (
      !name.trim() ||
      !Number.isFinite(lim) ||
      lim <= 0 ||
      day < 1 ||
      day > 31 ||
      cDay < 1 ||
      cDay > 31
    )
      return
    upsertCreditCard({
      name: name.trim(),
      limit: lim,
      dueDay: day,
      closingDay: cDay,
      brand: 'other',
      status: 'active',
      color: 'from-violet-600 to-indigo-600',
    })
    setName('')
    setLimit('')
    setIsAdding(false)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-fg">{t('finances.cards.title')}</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="luna-btn-primary rounded-full px-4 py-2 text-xs"
        >
          {t('finances.cards.add')}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 grid gap-6 md:grid-cols-2">
          {state.creditCards.length === 0 && !isAdding && (
            <div className="luna-empty col-span-full">
              {t('finances.cards.empty')}
            </div>
          )}
          {state.creditCards.map((c) => {
            const s = cardSummary(state, c)
            const percent = Math.min(100, (s.currentBill / c.limit) * 100)

            return (
              <div
                key={c.id}
                className="luna-card-vivid group relative flex flex-col justify-between overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold tracking-widest opacity-90">{c.name.toUpperCase()}</p>
                    <div className="mt-4 h-6 w-10 rounded bg-white/25" />
                  </div>
                  <button
                    type="button"
                    className="opacity-0 transition-opacity group-hover:opacity-100 rounded-full bg-black/20 p-1.5 hover:bg-danger/80"
                    onClick={() => removeCreditCard(c.id)}
                    title={t('finances.common.delete')}
                  >
                    🗑️
                  </button>
                </div>

                <div className="mt-8">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider opacity-70">
                        {t('finances.cards.currentStatement')}
                      </p>
                      <p className="text-xl font-bold tracking-tight">{formatMoney(s.currentBill)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider opacity-70">
                        {t('finances.cards.totalLimit')}
                      </p>
                      <p className="text-sm font-semibold">{formatMoney(c.limit)}</p>
                    </div>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/20">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${percent > 90 ? 'bg-red-400' : 'bg-white'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="mt-3 flex justify-between text-[10px] font-medium opacity-80">
                    <p>
                      {t('finances.cards.dueDay', { day: c.dueDay })}
                      <span className="mx-2">•</span>
                      {s.isClosed ? (
                        <span className="text-orange-200">{t('finances.cards.closed')}</span>
                      ) : (
                        <span>{t('finances.cards.closesDay', { day: c.closingDay })}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {isAdding && (
          <div className="luna-card h-fit animate-in slide-in-from-right-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg">{t('finances.cards.addForm')}</h3>
              <button onClick={() => setIsAdding(false)} className="text-fg-muted hover:text-fg">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <FieldLabel>{t('finances.cards.nickname')}</FieldLabel>
                <TextInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('finances.cards.nicknamePlaceholder')}
                />
              </div>
              <div>
                <FieldLabel>
                  {t('finances.cards.limit', { currency: state.meta.defaultCurrency })}
                </FieldLabel>
                <TextInput
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder={t('finances.cards.limitPlaceholder')}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>{t('finances.cards.closingDay')}</FieldLabel>
                  <TextInput
                    type="number"
                    min={1}
                    max={31}
                    value={closingDay}
                    onChange={(e) => setClosingDay(e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>{t('finances.cards.dueDayLabel')}</FieldLabel>
                  <TextInput
                    type="number"
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="button"
                className="luna-btn-primary mt-2 w-full text-xs"
                onClick={save}
              >
                {t('finances.cards.save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
