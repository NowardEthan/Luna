import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import {
  piggyDeposit,
  piggyWithdraw,
  removePiggyBank,
  upsertPiggyBank,
  useFinancesState,
} from '../financesStore'
import { formatMoney } from '../financesSelectors'
import { FieldLabel, TextInput, SelectInput } from './FinanceFormFields'
import { PiggyAvatarIcon } from './FinancesIcons'

export function PiggyBanksPanel() {
  const { t } = useTranslation()
  const state = useFinancesState()

  const [isAdding, setIsAdding] = useState(false)
  const [isMoving, setIsMoving] = useState(false)

  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [amount, setAmount] = useState('')
  const [selected, setSelected] = useState('')

  function save() {
    if (!name.trim()) return
    const targetNum = target ? Number(target) : undefined
    upsertPiggyBank({
      name: name.trim(),
      targetAmount:
        targetNum && Number.isFinite(targetNum) ? targetNum : undefined,
      currentAmount: 0,
      icon: '🐷',
    })
    setName('')
    setTarget('')
    setIsAdding(false)
  }

  function handleMove(type: 'deposit' | 'withdraw') {
    if (!selected) return
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) return

    if (type === 'deposit') {
      piggyDeposit(selected, amt)
    } else {
      piggyWithdraw(selected, amt)
    }

    setAmount('')
    setIsMoving(false)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-fg">{t('finances.piggy.title')}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsMoving(!isMoving)
              setIsAdding(false)
            }}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${isMoving ? 'bg-line text-fg' : 'bg-surface border border-line text-fg hover:bg-fg/5'}`}
          >
            {isMoving ? t('finances.common.cancel') : t('finances.piggy.move')}
          </button>
          <button
            onClick={() => {
              setIsAdding(!isAdding)
              setIsMoving(false)
            }}
            className="luna-btn-primary rounded-full px-4 py-2 text-xs"
          >
            {isAdding ? t('finances.common.cancel') : t('finances.piggy.new')}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 grid gap-6 sm:grid-cols-2">
          {state.piggyBanks.length === 0 && !isAdding && (
            <div className="luna-empty col-span-full">
              {t('finances.piggy.empty')}
            </div>
          )}

          {state.piggyBanks.map((p) => {
            const percent = p.targetAmount
              ? Math.min(100, (p.currentAmount / p.targetAmount) * 100)
              : 0

            return (
              <div
                key={p.id}
                className="luna-card luna-card--hover group relative flex flex-col justify-between overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-fg">
                      <PiggyAvatarIcon className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="font-bold text-fg">{p.name}</h3>
                      <p className="text-[10px] text-fg-muted uppercase tracking-wider">
                        {t('finances.piggy.reserve')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="opacity-0 transition-opacity group-hover:opacity-100 rounded-full bg-danger/10 p-2 text-xs text-danger hover:bg-danger hover:text-white"
                    onClick={() => removePiggyBank(p.id)}
                    title={t('finances.common.delete')}
                  >
                    ×
                  </button>
                </div>

                <div className="mt-4">
                  <p className="text-[10px] text-fg-muted uppercase tracking-wider mb-1">
                    {t('finances.piggy.totalSaved')}
                  </p>
                  <p className="text-2xl font-bold text-fg">{formatMoney(p.currentAmount)}</p>

                  {p.targetAmount && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] font-medium text-fg-dim mb-1.5">
                        <span>{t('finances.piggy.progress')}</span>
                        <span>
                          {t('finances.goals.of')} {formatMoney(p.targetAmount)}
                        </span>
                      </div>
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-line/50">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full bg-accent transition-all duration-1000 ease-out"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-4">
          {isAdding && (
            <div className="luna-card h-fit animate-in slide-in-from-right-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
                  <PiggyAvatarIcon className="h-5 w-5" /> {t('finances.piggy.newJar')}
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <FieldLabel>{t('finances.piggy.jarName')}</FieldLabel>
                  <TextInput
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('finances.piggy.jarPlaceholder')}
                  />
                </div>
                <div>
                  <FieldLabel>
                    {t('finances.piggy.optionalTarget', {
                      currency: state.meta.defaultCurrency,
                    })}
                  </FieldLabel>
                  <TextInput
                    type="number"
                    step="0.01"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder={t('finances.piggy.targetPlaceholder')}
                  />
                </div>
                <button
                  type="button"
                  className="luna-btn-primary mt-2 w-full text-xs"
                  onClick={save}
                >
                  {t('finances.piggy.create')}
                </button>
              </div>
            </div>
          )}

          {isMoving && (
            <div className="luna-card h-fit animate-in slide-in-from-right-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">{t('finances.piggy.moveMoney')}</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <FieldLabel>{t('finances.piggy.jarSelect')}</FieldLabel>
                  <SelectInput value={selected} onChange={(e) => setSelected(e.target.value)}>
                    <option value="">{t('finances.piggy.selectJar')}</option>
                    {state.piggyBanks.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </SelectInput>
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
                    placeholder={t('finances.goals.contribPlaceholder')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    type="button"
                    className="rounded-xl border border-success bg-success/10 py-2.5 text-xs font-semibold text-success transition-all hover:bg-success hover:text-white"
                    onClick={() => handleMove('deposit')}
                  >
                    {t('finances.piggy.deposit')}
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-line bg-surface py-2.5 text-xs font-semibold text-fg transition-all hover:bg-line/80 hover:text-fg"
                    onClick={() => handleMove('withdraw')}
                  >
                    {t('finances.piggy.withdraw')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
