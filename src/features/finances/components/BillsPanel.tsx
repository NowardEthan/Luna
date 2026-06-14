import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { payBill, removeBill, upsertBill, useFinancesState } from '../financesStore'
import { formatMoney } from '../financesSelectors'
import { FieldLabel, TextInput, DateInput } from './FinanceFormFields'
import { TrashIcon, CloseIcon, ReceiptIcon, LunaIcon } from './FinancesIcons'
import { eventBus } from '../../../core/events/EventBus'

export function BillsPanel() {
  const { t } = useTranslation()
  const state = useFinancesState()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [payAccount, setPayAccount] = useState(state.accounts[0]?.id ?? '')
  const [isAdding, setIsAdding] = useState(false)

  function startNew() {
    setDescription('')
    setAmount('')
    setDueDate('')
    setPayAccount(state.accounts[0]?.id ?? '')
    setIsAdding(true)
  }

  function save() {
    const amt = Number(amount)
    if (!description.trim() || !dueDate || !Number.isFinite(amt) || amt <= 0) return
    upsertBill({ description: description.trim(), amount: amt, dueDate })
    setDescription('')
    setAmount('')
    setIsAdding(false)
  }

  const pending = state.bills.filter((b) => b.status === 'pending')

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-fg">{t('finances.bills.title')}</h2>
        <button
          onClick={() => (isAdding ? setIsAdding(false) : startNew())}
          className="luna-btn-primary rounded-full px-4 py-2 text-xs"
        >
          {isAdding ? t('finances.common.back') : t('finances.bills.newBill')}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {pending.length === 0 && !isAdding && (
            <div className="luna-empty">
              <span className="mb-2 flex items-center justify-center text-fg-muted opacity-50">
                <ReceiptIcon className="h-10 w-10" />
              </span>
              {t('finances.bills.empty')}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {pending.map((b) => {
              const dateParts = b.dueDate.split('-')
              const dueLabel = `${dateParts[2]}/${dateParts[1]}`
              const isOverdue =
                new Date(b.dueDate) < new Date(new Date().toISOString().slice(0, 10))

              return (
                <div
                  key={b.id}
                  className={`luna-card luna-card--hover group relative flex flex-col justify-between overflow-hidden ${isOverdue ? 'border-danger/30 bg-danger/5' : ''}`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isOverdue ? 'bg-danger/20 text-danger' : 'bg-accent/10 text-accent'}`}
                      >
                        <ReceiptIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-fg line-clamp-1">{b.description}</p>
                        <p
                          className={`text-[10px] uppercase tracking-wider font-semibold ${isOverdue ? 'text-danger' : 'text-fg-muted'}`}
                        >
                          {isOverdue
                            ? t('finances.bills.overdue')
                            : t('finances.bills.dueOn', { date: dueLabel })}
                        </p>
                      </div>
                    </div>

                    <button
                      className="rounded-full bg-danger/10 text-danger p-2 hover:bg-danger hover:text-white transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                      onClick={() => removeBill(b.id)}
                      title={t('finances.common.delete')}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5 flex items-end justify-between border-t border-line/50 pt-4">
                    <div>
                      <p className="text-[10px] text-fg-muted uppercase tracking-widest">
                        {t('finances.bills.amount')}
                      </p>
                      <p className="text-lg font-extrabold tracking-tight text-fg">
                        {formatMoney(b.amount)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg bg-success px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md shadow-success/20 transition-all hover:-translate-y-0.5 hover:shadow-success/40"
                      onClick={() => payAccount && payBill(b.id, payAccount)}
                    >
                      {t('finances.bills.markPaid')}
                    </button>
                  </div>
                  {isOverdue && (
                    <button
                      className="absolute right-4 top-16 flex items-center gap-1.5 rounded-full bg-danger/10 px-2 py-1 text-[10px] font-bold text-danger transition-all hover:bg-danger hover:text-white"
                      onClick={() => eventBus.emit('luna:chat:open', null)}
                      title={t('finances.bills.askLunaTitle')}
                    >
                      <LunaIcon className="h-3 w-3" /> {t('finances.common.luna')}
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
              <h3 className="text-sm font-semibold text-fg">{t('finances.bills.addExpense')}</h3>
              <button onClick={() => setIsAdding(false)} className="text-fg-muted hover:text-fg">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel>{t('finances.bills.description')}</FieldLabel>
                <TextInput
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('finances.bills.descriptionPlaceholder')}
                />
              </div>

              <div>
                <FieldLabel>
                  {t('finances.common.amount', { currency: state.meta.defaultCurrency })}
                </FieldLabel>
                <TextInput
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t('finances.accounts.amountPlaceholder')}
                />
              </div>

              <div>
                <FieldLabel>{t('finances.bills.dueDate')}</FieldLabel>
                <DateInput value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>

              <button
                type="button"
                className="luna-btn-primary mt-4 w-full text-xs"
                onClick={save}
              >
                {t('finances.bills.add')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
