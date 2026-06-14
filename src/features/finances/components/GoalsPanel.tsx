import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import {
  addGoalContribution,
  removeGoal,
  upsertGoal,
  useFinancesState,
} from '../financesStore'
import { formatMoney, goalProgress } from '../financesSelectors'
import { FieldLabel, TextInput, SelectInput } from './FinanceFormFields'
import { TargetAvatarIcon, CheckIcon } from './FinancesIcons'

export function GoalsPanel() {
  const { t } = useTranslation()
  const state = useFinancesState()

  const [isAdding, setIsAdding] = useState(false)
  const [isContributing, setIsContributing] = useState(false)

  const [name, setName] = useState('')
  const [target, setTarget] = useState('')

  const [contribGoal, setContribGoal] = useState('')
  const [contribAmount, setContribAmount] = useState('')

  function saveGoal() {
    const n = name.trim()
    const targetNum = Number(target)
    if (!n || !Number.isFinite(targetNum) || targetNum <= 0) return
    upsertGoal({ name: n, targetAmount: targetNum, currentAmount: 0 })
    setName('')
    setTarget('')
    setIsAdding(false)
  }

  function contribute() {
    const amt = Number(contribAmount)
    if (!contribGoal || !Number.isFinite(amt) || amt <= 0) return
    addGoalContribution(contribGoal, amt)
    setContribAmount('')
    setIsContributing(false)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-fg">{t('finances.goals.title')}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsContributing(!isContributing)
              setIsAdding(false)
            }}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${isContributing ? 'bg-line text-fg' : 'bg-surface border border-line text-fg hover:bg-fg/5'}`}
          >
            {isContributing ? t('finances.common.cancel') : t('finances.goals.contribute')}
          </button>
          <button
            onClick={() => {
              setIsAdding(!isAdding)
              setIsContributing(false)
            }}
            className="luna-btn-primary rounded-full px-4 py-2 text-xs"
          >
            {isAdding ? t('finances.common.cancel') : t('finances.goals.new')}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 grid gap-6 sm:grid-cols-2">
          {state.goals.length === 0 && !isAdding && (
            <div className="luna-empty col-span-full">
              {t('finances.goals.empty')}
            </div>
          )}
          {state.goals.map((g) => {
            const p = goalProgress(g)
            const isDone = p >= 100

            return (
              <div
                key={g.id}
                className="luna-card luna-card--hover group relative flex flex-col justify-between overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-fg">
                      {isDone ? (
                        <CheckIcon className="h-6 w-6" />
                      ) : (
                        <TargetAvatarIcon className="h-6 w-6" />
                      )}
                    </span>
                    <div>
                      <h3 className="font-bold text-fg">{g.name}</h3>
                      <p className="text-[10px] text-fg-muted uppercase tracking-wider">
                        {isDone ? t('finances.goals.completed') : t('finances.goals.inProgress')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="opacity-0 transition-opacity group-hover:opacity-100 rounded-full bg-danger/10 p-2 text-xs text-danger hover:bg-danger hover:text-white"
                    onClick={() => removeGoal(g.id)}
                    title={t('finances.common.delete')}
                  >
                    ×
                  </button>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-bold text-fg">{formatMoney(g.currentAmount)}</span>
                    <span className="text-fg-muted">
                      {t('finances.goals.of')} {formatMoney(g.targetAmount)}
                    </span>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-line/50">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-accent transition-all duration-1000 ease-out"
                      style={{ width: `${p}%` }}
                    />
                  </div>
                  <p className="mt-2 text-right text-[10px] font-bold text-fg-dim">
                    {t('finances.goals.percentReached', { percent: Math.floor(p) })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-4">
          {isAdding && (
            <div className="luna-card h-fit animate-in slide-in-from-right-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">{t('finances.goals.newGoal')}</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <FieldLabel>{t('finances.goals.name')}</FieldLabel>
                  <TextInput
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('finances.goals.namePlaceholder')}
                  />
                </div>
                <div>
                  <FieldLabel>
                    {t('finances.goals.target', { currency: state.meta.defaultCurrency })}
                  </FieldLabel>
                  <TextInput
                    type="number"
                    step="0.01"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder={t('finances.accounts.amountPlaceholder')}
                  />
                </div>
                <button
                  type="button"
                  className="luna-btn-primary mt-2 w-full text-xs"
                  onClick={saveGoal}
                >
                  {t('finances.goals.create')}
                </button>
              </div>
            </div>
          )}

          {isContributing && (
            <div className="luna-card h-fit animate-in slide-in-from-right-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">{t('finances.goals.saveMoney')}</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <FieldLabel>{t('finances.goals.destination')}</FieldLabel>
                  <SelectInput value={contribGoal} onChange={(e) => setContribGoal(e.target.value)}>
                    <option value="">{t('finances.goals.selectGoal')}</option>
                    {state.goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
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
                    value={contribAmount}
                    onChange={(e) => setContribAmount(e.target.value)}
                    placeholder={t('finances.goals.contribPlaceholder')}
                  />
                </div>
                <button
                  type="button"
                  className="mt-2 w-full rounded-xl bg-success py-2.5 text-xs font-semibold text-white shadow-lg shadow-success/20 hover:bg-success/90 hover:-translate-y-0.5 transition-all"
                  onClick={contribute}
                >
                  {t('finances.goals.confirmContribution')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
