import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import type { TransactionType } from '../types'
import {
  addTransfer,
  removeTransaction,
  useFinancesState,
  addInstallmentTransaction,
} from '../financesStore'
import { formatMoney } from '../financesSelectors'
import { currentMonthKey, nowIso, newFinanceId } from '../financesId'
import { FieldLabel, SelectInput, TextInput, DateInput, CreatableCategorySelect } from './FinanceFormFields'
import { ArrowUpIcon, ArrowDownIcon, TransferIcon, CloseIcon, BulbIcon, TagIcon, BankIcon, ReceiptIcon, LunaIcon } from './FinancesIcons'
import { eventBus } from '../../../core/events/EventBus'
import { upsertCategory } from '../financesStore'
import { suggestCategoryId } from '../financesCategorize'

export function TransactionsPanel() {
  const { t } = useTranslation()
  const state = useFinancesState()
  const [month, setMonth] = useState(currentMonthKey())
  const [accountId, setAccountId] = useState('')
  
  // States do formulário
  const [isAdding, setIsAdding] = useState(false)
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(nowIso().slice(0, 10))
  const [transferTo, setTransferTo] = useState('')
  const [installments, setInstallments] = useState('1')

  const list = useMemo(() => {
    return state.transactions
      .filter((tx) => tx.date.startsWith(month))
      .filter((tx) => !accountId || tx.accountId === accountId)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [state.transactions, month, accountId])

  // Agrupamento por data
  const groupedList = useMemo(() => {
    const groups: Record<string, typeof list> = {}
    for (const tx of list) {
       if (!groups[tx.date]) groups[tx.date] = []
       groups[tx.date].push(tx)
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [list])

  function save() {
    const amt = Number(amount)
    const inst = Number(installments) || 1
    if (!Number.isFinite(amt) || amt <= 0 || !description.trim()) return
    
    if (type === 'transfer') {
      if (!accountId || !transferTo || accountId === transferTo) return
      addTransfer({
        fromAccountId: accountId,
        toAccountId: transferTo,
        amount: amt,
        date,
        description: description.trim(),
        categoryId: categoryId || undefined,
      })
    } else {
      if (!accountId) return
      addInstallmentTransaction({
        accountId,
        categoryId: categoryId || undefined,
        amount: amt,
        type,
        date,
        description: description.trim(),
        installments: inst
      })
    }
    setAmount('')
    setDescription('')
    setIsAdding(false)
  }

  function getHumanDate(dIso: string) {
    const today = nowIso().slice(0,10)
    if (dIso === today) return t('finances.form.today')
    const parts = dIso.split('-')
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Cabeçalho e Filtros */}
      <div className="luna-card mb-6 flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex gap-3 items-center">
          <div className="flex flex-col">
            <span className="mb-1 text-[10px] uppercase tracking-wider text-fg-muted">{t('finances.transactions.refMonth')}</span>
            <TextInput type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto h-9 text-xs" />
          </div>
          <div className="flex flex-col">
            <span className="mb-1 text-[10px] uppercase tracking-wider text-fg-muted">{t('finances.transactions.filterAccount')}</span>
            <SelectInput value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-auto min-w-[12rem] h-9 text-xs">
              <option value="">{t('finances.transactions.allAccounts')}</option>
              {state.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </SelectInput>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="luna-btn-primary rounded-full px-5 py-2.5 text-xs"
        >
          {t('finances.transactions.add')}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Lista Principal de Transações */}
        <div className="xl:col-span-2 space-y-6">
          {groupedList.length === 0 ? (
            <div className="luna-empty">
              <span className="mb-2 flex items-center justify-center text-fg-muted opacity-50"><ReceiptIcon className="h-10 w-10"/></span>
              {t('finances.transactions.empty')}
            </div>
          ) : (
            groupedList.map(([txDate, txs]) => (
              <div key={txDate} className="luna-card overflow-hidden p-0">
                <div className="bg-surface/50 border-b border-line px-5 py-2.5 text-xs font-semibold text-fg-muted uppercase tracking-wider">
                  {getHumanDate(txDate)}
                </div>
                <div className="divide-y divide-line-subtle">
                  {txs.map((tx) => {
                    const acc = state.accounts.find((a) => a.id === tx.accountId)
                    const cat = state.categories.find((c) => c.id === tx.categoryId)
                    const isIncome = tx.type === 'income'
                    const isExpense = tx.type === 'expense'
                    
                    return (
                      <div key={tx.id} className="group flex items-center justify-between px-5 py-4 transition-colors hover:bg-fg/5">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isIncome ? 'bg-success/10 text-success' : isExpense ? 'bg-danger/10 text-danger' : 'bg-fg-muted/10 text-fg-muted'}`}>
                            {isIncome ? <ArrowDownIcon className="w-5 h-5"/> : isExpense ? <ArrowUpIcon className="w-5 h-5"/> : <TransferIcon className="w-5 h-5"/>}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-fg">
                              {tx.description}
                              {tx.installmentTotal && tx.installmentTotal > 1 ? (
                                <span className="ml-2 text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
                                  {tx.installmentCurrent}/{tx.installmentTotal}
                                </span>
                              ) : null}
                            </p>
                            <p className="text-[11px] text-fg-muted mt-0.5 flex gap-2">
                              <span className="flex items-center gap-1"><BankIcon className="h-3 w-3"/> {acc?.name}</span>
                              {cat && <span className="flex items-center gap-1">· <TagIcon className="h-3 w-3"/> {cat.name}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 pl-4">
                          <span className={`text-base font-bold ${isIncome ? 'text-success' : isExpense ? 'text-danger' : 'text-fg-dim'}`}>
                            {isExpense || tx.type === 'transfer' ? '-' : '+'}{formatMoney(tx.amount)}
                          </span>
                          <button
                            type="button"
                            className="opacity-0 transition-opacity group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded-full bg-danger/10 text-danger hover:bg-danger hover:text-white"
                            onClick={() => removeTransaction(tx.id)}
                            title={t('finances.common.delete')}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Formulário Lateral (Glass Modal) */}
        {isAdding && (
          <div className="luna-card h-fit animate-in slide-in-from-right-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg">{t('finances.transactions.newEntry')}</h3>
              <button onClick={() => setIsAdding(false)} className="text-fg-muted hover:text-fg">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            
            <div className="mb-4 flex gap-2">
              <button 
                type="button"
                className="luna-btn-secondary flex flex-1 items-center justify-center gap-2 py-2 text-[10px] font-bold"
                onClick={() => eventBus.emit('luna:chat:open', null)}
                title={t('finances.transactions.categorizeAiTitle')}
              >
                <LunaIcon className="h-4 w-4" /> Categorizar via IA
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Type toggle */}
              <div className="flex rounded-lg border border-line bg-canvas p-1">
                {(['expense', 'income', 'transfer'] as const).map((txKind) => (
                  <button
                    key={txKind}
                    onClick={() => setType(txKind)}
                    className={`flex-1 rounded-md py-1.5 text-xs font-semibold capitalize transition-all ${type === txKind ? 'bg-surface shadow-sm text-fg' : 'text-fg-muted hover:text-fg'}`}
                  >
                    {txKind === 'expense' ? t('finances.transactions.typeExpense') : txKind === 'income' ? t('finances.transactions.typeIncome') : t('finances.transactions.typeTransfer')}
                  </button>
                ))}
              </div>

              <div>
                <FieldLabel>{t('finances.transactions.mainAccount')}</FieldLabel>
                <SelectInput value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  <option value="">{t('finances.form.select')}</option>
                  {state.accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </SelectInput>
              </div>

              {type === 'transfer' ? (
                <div>
                  <FieldLabel>{t('finances.transactions.toAccount')}</FieldLabel>
                  <SelectInput value={transferTo} onChange={(e) => setTransferTo(e.target.value)}>
                    <option value="">{t('finances.form.select')}</option>
                    {state.accounts.filter((a) => a.id !== accountId).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </SelectInput>
                </div>
              ) : (
                <div>
                  <FieldLabel>{t('finances.transactions.categoryTag')}</FieldLabel>
                  <CreatableCategorySelect 
                    value={categoryId || ''}
                    onChange={(val) => setCategoryId(val)}
                    options={state.categories
                      .filter((c) => c.kind === (type === 'income' ? 'income' : 'expense'))
                      .map((c) => ({
                        value: c.id,
                        name: c.name,
                        label: <span className="flex items-center gap-2"><span className="text-base">{c.icon || (type === 'income' ? '💰' : '🛒')}</span> {c.name}</span>
                      }))}
                    onCreateCategory={(name) => {
                      const id = newFinanceId()
                      upsertCategory({ id, name, kind: type === 'income' ? 'income' : 'expense', icon: '🏷️' })
                      return id
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>
                    {t('finances.transactions.amount', {
                      currency: state.meta.defaultCurrency,
                    })}
                  </FieldLabel>
                  <TextInput type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('finances.accounts.amountPlaceholder')} />
                </div>
                <div>
                  <FieldLabel>{t('finances.transactions.date')}</FieldLabel>
                  <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              <div>
                <FieldLabel>{t('finances.transactions.description')}</FieldLabel>
                <div className="flex gap-2">
                  <TextInput className="flex-1" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('finances.transactions.descriptionPlaceholder')} />
                  {type !== 'transfer' ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-lg bg-line px-3 py-1 text-[10px] font-semibold transition-colors hover:bg-line/80"
                      onClick={() => {
                        const r = suggestCategoryId(description, type, state.transactions, state.categories)
                        if (r.categoryId) setCategoryId(r.categoryId)
                      }}
                    >
                      <BulbIcon className="h-4 w-4" /> {t('finances.transactions.aiShort')}
                    </button>
                  ) : null}
                </div>
              </div>

              {type === 'expense' && (
                <div>
                  <FieldLabel>{t('finances.transactions.installments')}</FieldLabel>
                  <TextInput type="number" min="1" max="72" value={installments} onChange={(e) => setInstallments(e.target.value)} />
                </div>
              )}

              <button 
                type="button" 
                className="luna-btn-primary mt-4 w-full text-xs"
                onClick={save}
              >
                {t('finances.transactions.save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
