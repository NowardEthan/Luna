import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AccountType, FinanceAccount } from '../types'
import { removeAccount, upsertAccount, useFinancesState } from '../financesStore'
import { accountBalance, formatMoney } from '../financesSelectors'
import { FieldLabel, TextInput } from './FinanceFormFields'
import {
  BankIcon,
  LeafIcon,
  AnalyticsIcon,
  CashIcon,
  CardsIcon,
  TargetAvatarIcon,
  EditIcon,
  TrashIcon,
  CloseIcon,
} from './FinancesIcons'

const TYPE_DEFS: {
  value: AccountType
  labelKey: string
  icon: React.FC<React.SVGProps<SVGSVGElement>>
  solidColor: string
}[] = [
  { value: 'checking', labelKey: 'finances.accounts.typeChecking', icon: BankIcon, solidColor: 'bg-blue-600' },
  { value: 'savings', labelKey: 'finances.accounts.typeSavings', icon: LeafIcon, solidColor: 'bg-emerald-600' },
  { value: 'investment', labelKey: 'finances.accounts.typeInvestment', icon: AnalyticsIcon, solidColor: 'bg-violet-600' },
  { value: 'cash', labelKey: 'finances.accounts.typeCash', icon: CashIcon, solidColor: 'bg-amber-600' },
  { value: 'credit', labelKey: 'finances.accounts.typeCredit', icon: CardsIcon, solidColor: 'bg-slate-700' },
  { value: 'other', labelKey: 'finances.accounts.typeOther', icon: TargetAvatarIcon, solidColor: 'bg-gray-600' },
]

const GRADIENT_TO_SOLID: Record<string, string> = {
  'from-blue-600 to-indigo-700': 'bg-blue-600',
  'from-emerald-500 to-teal-700': 'bg-emerald-600',
  'from-violet-600 to-fuchsia-700': 'bg-violet-600',
  'from-amber-500 to-orange-700': 'bg-amber-600',
  'from-rose-500 to-red-700': 'bg-rose-600',
  'from-cyan-500 to-blue-600': 'bg-cyan-600',
  'from-slate-700 to-slate-900': 'bg-slate-700',
  'from-gray-600 to-gray-800': 'bg-gray-600',
}

function accountSolidBg(colorOrGradient: string | undefined, fallback: string): string {
  if (!colorOrGradient) return fallback
  if (colorOrGradient.startsWith('bg-')) return colorOrGradient
  return GRADIENT_TO_SOLID[colorOrGradient] ?? 'bg-accent'
}

const COLOR_DEFS: { value: string; labelKey: string }[] = [
  { value: '', labelKey: 'finances.accounts.colorAuto' },
  { value: 'bg-blue-600', labelKey: 'finances.accounts.colorBlue' },
  { value: 'bg-emerald-600', labelKey: 'finances.accounts.colorGreen' },
  { value: 'bg-violet-600', labelKey: 'finances.accounts.colorPurple' },
  { value: 'bg-amber-600', labelKey: 'finances.accounts.colorOrange' },
  { value: 'bg-rose-600', labelKey: 'finances.accounts.colorRed' },
  { value: 'bg-cyan-600', labelKey: 'finances.accounts.colorCyan' },
  { value: 'bg-slate-700', labelKey: 'finances.accounts.colorBlack' },
]

export function AccountsPanel() {
  const { t } = useTranslation()
  const state = useFinancesState()
  const currency = state.meta.defaultCurrency
  const types = useMemo(
    () => TYPE_DEFS.map((d) => ({ ...d, label: t(d.labelKey) })),
    [t],
  )
  const colorOptions = useMemo(
    () => COLOR_DEFS.map((d) => ({ ...d, label: t(d.labelKey) })),
    [t],
  )
  const [editing, setEditing] = useState<FinanceAccount | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('checking')
  const [initialBalance, setInitialBalance] = useState('0')
  const [color, setColor] = useState('')

  function startNew() {
    setEditing(null)
    setName('')
    setType('checking')
    setInitialBalance('0')
    setColor('')
    setIsAdding(true)
  }

  function startEdit(a: FinanceAccount) {
    setEditing(a)
    setName(a.name)
    setType(a.type)
    setInitialBalance(String(a.initialBalance))
    setColor(a.color ?? '')
    setIsAdding(true)
  }

  function save() {
    const n = name.trim()
    const bal = Number(initialBalance)
    if (!n || !Number.isFinite(bal)) return
    const def = types.find((x) => x.value === type)
    upsertAccount({
      id: editing?.id,
      name: n,
      type,
      initialBalance: bal,
      currency,
      color: color || def?.solidColor,
    })
    setIsAdding(false)
    setEditing(null)
  }

  const activeAccounts = state.accounts.filter((a) => !a.archived)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-fg">{t('finances.accounts.title')}</h2>
        <button
          type="button"
          onClick={() => (isAdding ? setIsAdding(false) : startNew())}
          className="luna-btn-primary rounded-full px-4 py-2 text-xs"
        >
          {isAdding ? t('finances.common.back') : t('finances.accounts.new')}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {activeAccounts.length === 0 && !isAdding && (
            <div className="luna-empty col-span-full">
              {t('finances.accounts.empty')}
            </div>
          )}
          {activeAccounts.map((a) => {
            const bal = accountBalance(a, state.transactions)
            const def = types.find((x) => x.value === a.type)
            const Icon = def?.icon ?? BankIcon
            const solidBg = accountSolidBg(a.color, def?.solidColor ?? 'bg-accent')
            return (
              <div
                key={a.id}
                className="luna-card luna-card--hover group relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${solidBg} text-white`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-bold text-fg">{a.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-fg-muted">{def?.label}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      className="rounded-full p-2 text-fg-muted hover:bg-raised-hover hover:text-accent"
                      onClick={() => startEdit(a)}
                      title={t('finances.common.edit')}
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full p-2 text-danger hover:bg-danger-muted"
                      onClick={() => removeAccount(a.id)}
                      title={t('finances.common.delete')}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 border-t border-line/50 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-fg-muted">{t('finances.accounts.currentBalance')}</p>
                  <p className="text-xl font-extrabold tracking-tight text-fg">{formatMoney(bal)}</p>
                </div>
              </div>
            )
          })}
        </div>

        {isAdding && (
          <div className="luna-card h-fit animate-in slide-in-from-right-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg">
                {editing ? t('finances.accounts.editForm') : t('finances.accounts.newForm')}
              </h3>
              <button type="button" onClick={() => setIsAdding(false)} className="text-fg-muted hover:text-fg">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <FieldLabel>{t('finances.accounts.institutionName')}</FieldLabel>
                <TextInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('finances.accounts.institutionPlaceholder')}
                />
              </div>
              <div>
                <FieldLabel>{t('finances.accounts.accountType')}</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {types.map((td) => (
                    <button
                      key={td.value}
                      type="button"
                      onClick={() => setType(td.value)}
                      className={`rounded-lg border px-2 py-2 text-left text-[10px] font-semibold transition-all ${
                        type === td.value
                          ? 'border-accent bg-accent-muted text-accent'
                          : 'border-line text-fg-muted hover:border-accent/40'
                      }`}
                    >
                      {td.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>{t('finances.accounts.cardColor')}</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((g) => (
                    <button
                      key={g.value || 'auto'}
                      type="button"
                      title={g.label}
                      onClick={() => setColor(g.value)}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        color === g.value ? 'border-accent ring-2 ring-accent/30' : 'border-line'
                      } ${g.value || 'bg-line'}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>{t('finances.accounts.initialBalance', { currency })}</FieldLabel>
                <TextInput
                  type="number"
                  step="0.01"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder={t('finances.accounts.amountPlaceholder')}
                />
              </div>
              <button
                type="button"
                className="luna-btn-primary mt-2 w-full text-xs"
                onClick={save}
              >
                {editing ? t('finances.accounts.saveChanges') : t('finances.accounts.create')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
