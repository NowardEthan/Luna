import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { RecurringFrequency, TransactionType } from '../types'
import {
  generateRecurringTransaction,
  removeRecurring,
  upsertRecurring,
  useFinancesState,
} from '../financesStore'
import { formatMoney } from '../financesSelectors'
import { nowIso } from '../financesId'
import { FieldLabel, SelectInput, TextInput, DateInput } from './FinanceFormFields'
import { RecurringIcon, TrashIcon, CloseIcon, BankIcon, TagIcon } from './FinancesIcons'

export function RecurringPanel() {
  const { t } = useTranslation()
  const freqLabel: Record<RecurringFrequency, string> = {
    weekly: t('finances.recurring.freqWeekly'),
    monthly: t('finances.recurring.freqMonthly'),
    yearly: t('finances.recurring.freqYearly'),
  }
  const state = useFinancesState()
  const [accountId, setAccountId] = useState(state.accounts[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [nextDueDate, setNextDueDate] = useState(nowIso().slice(0, 10))
  const [description, setDescription] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const cats = type === 'income'
    ? state.categories.filter((c) => c.kind === 'income')
    : state.categories.filter((c) => c.kind === 'expense')

  function startNew() {
    setAccountId(state.accounts[0]?.id ?? '')
    setCategoryId('')
    setType('expense')
    setAmount('')
    setFrequency('monthly')
    setNextDueDate(nowIso().slice(0, 10))
    setDescription('')
    setIsAdding(true)
  }

  function save() {
    const amt = Number(amount)
    if (!accountId || !categoryId || !description.trim()) return
    if (!Number.isFinite(amt) || amt <= 0) return
    upsertRecurring({
      accountId,
      categoryId,
      amount: amt,
      type,
      frequency,
      nextDueDate,
      active: true,
      description: description.trim(),
    })
    setAmount('')
    setDescription('')
    setIsAdding(false)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-fg">{t('finances.recurring.title')}</h2>
        <button 
          onClick={() => isAdding ? setIsAdding(false) : startNew()}
          className="luna-btn-primary rounded-full px-4 py-2 text-xs"
        >
          {isAdding ? t('finances.common.back') : t('finances.recurring.new')}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Listagem de Recorrentes */}
        <div className="space-y-4">
          {state.recurring.length === 0 && !isAdding && (
            <div className="luna-empty">
              <span className="mb-2 flex items-center justify-center text-fg-muted opacity-50">
                <RecurringIcon className="h-10 w-10"/>
              </span>
              {t('finances.recurring.empty')}
            </div>
          )}
          
          <div className="grid gap-4 sm:grid-cols-2">
            {state.recurring.map((r) => {
              const account = state.accounts.find((a) => a.id === r.accountId)
              const cat = state.categories.find((c) => c.id === r.categoryId)
              const dateParts = r.nextDueDate.split('-')
              const isIncome = r.type === 'income'
              
              return (
                <div key={r.id} className={`luna-card luna-card--hover group relative flex flex-col justify-between overflow-hidden ${!r.active ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isIncome ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                        <RecurringIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-fg line-clamp-1">{r.description}</p>
                        <p className={`text-[10px] font-semibold flex items-center gap-1 ${!r.active ? 'text-fg-muted' : 'text-accent'}`}>
                           {freqLabel[r.frequency]} {r.active ? '' : t('finances.recurring.inactive')}
                        </p>
                      </div>
                    </div>
                    
                    <button 
                      className="rounded-full bg-danger/10 text-danger p-2 hover:bg-danger hover:text-white transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                      onClick={() => removeRecurring(r.id)}
                      title={t('finances.common.delete')}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="mt-4 flex flex-col gap-1">
                     <p className="text-[10px] text-fg-muted flex items-center gap-1"><BankIcon className="h-3 w-3"/> {account?.name}</p>
                     <p className="text-[10px] text-fg-muted flex items-center gap-1"><TagIcon className="h-3 w-3"/> {cat?.name}</p>
                  </div>

                  <div className="mt-4 flex items-end justify-between border-t border-line/50 pt-4">
                    <div>
                      <p className="text-[10px] text-fg-muted uppercase tracking-widest">{t('finances.recurring.nextOn', { date: `${dateParts[2]}/${dateParts[1]}` })}</p>
                      <p className={`text-lg font-extrabold tracking-tight ${isIncome ? 'text-success' : 'text-danger'}`}>{formatMoney(r.amount)}</p>
                    </div>
                    <button
                      type="button"
                      disabled={!r.active}
                      className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md transition-all ${r.active ? 'bg-accent hover:-translate-y-0.5 hover:shadow-accent/40 shadow-accent/20' : 'bg-line text-fg-muted cursor-not-allowed shadow-none'}`}
                      onClick={() => generateRecurringTransaction(r.id)}
                    >
                      {t('finances.recurring.generateNow')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Formulário Lateral Premium */}
        {isAdding && (
          <div className="luna-card h-fit animate-in slide-in-from-right-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg">{t('finances.recurring.newForm')}</h3>
              <button onClick={() => setIsAdding(false)} className="text-fg-muted hover:text-fg">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <FieldLabel>{t('finances.recurring.description')}</FieldLabel>
                <TextInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('finances.recurring.descriptionPlaceholder')} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>{t('finances.common.amount', { currency: state.meta.defaultCurrency })}</FieldLabel>
                  <TextInput type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('finances.accounts.amountPlaceholder')} />
                </div>
                <div>
                  <FieldLabel>{t('finances.common.type')}</FieldLabel>
                  <SelectInput value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
                    <option value="expense">{t('finances.transactions.typeExpense')}</option>
                    <option value="income">{t('finances.transactions.typeIncome')}</option>
                  </SelectInput>
                </div>
              </div>

              <div>
                <FieldLabel>{t('finances.recurring.linkedAccount')}</FieldLabel>
                <SelectInput value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  {state.accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </SelectInput>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>{t('finances.recurring.frequency')}</FieldLabel>
                  <SelectInput value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}>
                    <option value="weekly">{t('finances.recurring.freqWeekly')}</option>
                    <option value="monthly">{t('finances.recurring.freqMonthly')}</option>
                    <option value="yearly">{t('finances.recurring.freqYearly')}</option>
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel>{t('finances.recurring.nextDate')}</FieldLabel>
                  <DateInput value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
                </div>
              </div>

              <div>
                <FieldLabel>{t('finances.recurring.category')}</FieldLabel>
                <SelectInput value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">{t('finances.form.select')}</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </SelectInput>
              </div>

              <button 
                type="button" 
                className="luna-btn-primary mt-4 w-full text-xs"
                onClick={save}
              >
                {t('finances.recurring.activate')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
