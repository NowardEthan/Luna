import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LunarCloudBanner } from '../../components/lunar/LunarCloudBanner'
import { eventBus } from '../../core/events/EventBus'
import { setFinancesActiveTab } from '../../lib/financesUiState'
import { useLunaAuth } from '../auth/AuthProvider'
import { AccountsPanel } from './components/AccountsPanel'
import { AnalyticsPanel } from './components/AnalyticsPanel'
import { BillsPanel } from './components/BillsPanel'
import { BudgetsPanel } from './components/BudgetsPanel'
import { CreditCardsPanel } from './components/CreditCardsPanel'
import { FinancesDashboard } from './components/FinancesDashboard'
import { GoalsPanel } from './components/GoalsPanel'
import { NotificationsPanel } from './components/NotificationsPanel'
import { PiggyBanksPanel } from './components/PiggyBanksPanel'
import { RecurringPanel } from './components/RecurringPanel'
import { ReportsPanel } from './components/ReportsPanel'
import { TransactionsPanel } from './components/TransactionsPanel'
import { downloadFinancesExport } from './financesExport'
import { canSyncFinancesCloud, syncFinancesNow } from './financesCloudSync'
import { useFinancesState } from './financesStore'
import type { FinancesTab } from './types'
import { lunaNavItemClass } from '../../lib/lunaVisual'
import {
  DashboardIcon,
  AccountsIcon,
  TransactionsIcon,
  CardsIcon,
  BillsIcon,
  RecurringIcon,
  BudgetsIcon,
  GoalsIcon,
  PiggyIcon,
  ReportsIcon,
  AnalyticsIcon,
  NotificationsIcon,
  LunaIcon
} from './components/FinancesIcons'

const TAB_DEFS: {
  id: FinancesTab
  icon: React.FC<React.SVGProps<SVGSVGElement>>
}[] = [
  { id: 'dashboard', icon: DashboardIcon },
  { id: 'accounts', icon: AccountsIcon },
  { id: 'transactions', icon: TransactionsIcon },
  { id: 'cards', icon: CardsIcon },
  { id: 'bills', icon: BillsIcon },
  { id: 'recurring', icon: RecurringIcon },
  { id: 'budgets', icon: BudgetsIcon },
  { id: 'goals', icon: GoalsIcon },
  { id: 'piggy', icon: PiggyIcon },
  { id: 'reports', icon: ReportsIcon },
  { id: 'analytics', icon: AnalyticsIcon },
  { id: 'notifications', icon: NotificationsIcon },
]

export function FinancesMainPanel() {
  const { t, i18n } = useTranslation()
  const auth = useLunaAuth()
  const tabs = useMemo(
    () =>
      TAB_DEFS.map((tabDef) => ({
        ...tabDef,
        label: t(`finances.tabs.${tabDef.id}`),
      })),
    [t],
  )
  const state = useFinancesState()
  const [tab, setTab] = useState<FinancesTab>('dashboard')
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const selectTab = useCallback((id: FinancesTab) => {
    setTab(id)
    setFinancesActiveTab(id)
  }, [])

  useEffect(() => {
    setFinancesActiveTab(tab)
  }, [tab])

  const runSync = useCallback(async () => {
    if (!canSyncFinancesCloud()) return
    setSyncing(true)
    setSyncError(null)
    try {
      await syncFinancesNow()
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : t('finances.main.syncFailed'))
    } finally {
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    void runSync()
    const unsub = eventBus.on('finances:sync:complete', (r) => {
      if (!r.ok && r.error) setSyncError(r.error)
    })
    return unsub
  }, [runSync])

  const cloudReady = auth.isLunarConnected
  const unread = state.notifications.filter((n) => !n.read).length

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-canvas">
      <LunarCloudBanner className="shrink-0" />
      {!cloudReady ? (
        <div className="shrink-0 border-b border-line bg-surface px-3 py-1.5 text-[10px] text-fg-muted">
          {t('finances.main.localBanner')}
        </div>
      ) : (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-3 py-1.5 text-[10px]">
          <span className="text-fg-muted">
            {syncing
              ? t('finances.main.syncing')
              : state.meta.lastSyncAt
                ? t('finances.main.syncStatus', {
                    datetime: new Date(state.meta.lastSyncAt).toLocaleString(i18n.language),
                  })
                : t('finances.main.lunarAccount')}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="luna-btn-secondary px-2 py-0.5 text-[10px]"
              onClick={() => downloadFinancesExport('csv')}
            >
              {t('finances.main.exportCsv')}
            </button>
            <button
              type="button"
              className="luna-btn-secondary px-2 py-0.5 text-[10px]"
              disabled={syncing}
              onClick={() => void runSync()}
            >
              {t('finances.main.sync')}
            </button>
          </div>
        </div>
      )}
      {syncError ? (
        <p className="shrink-0 border-b border-danger/30 bg-danger/10 px-3 py-1.5 text-[10px] text-danger">
          {syncError}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col bg-surface md:flex-row">
        <nav
          className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-line bg-canvas/50 p-2 shadow-inner md:w-48 md:flex-col md:gap-1 md:overflow-y-auto md:border-b-0 md:border-r md:p-3"
          aria-label={t('finances.main.navAria')}
        >
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              className={`group shrink-0 justify-between whitespace-nowrap ${lunaNavItemClass(tab === tabItem.id)}`}
              aria-current={tab === tabItem.id ? 'page' : undefined}
              onClick={() => selectTab(tabItem.id)}
            >
              <div className="flex items-center gap-2 md:gap-3">
                <tabItem.icon className={`h-4 w-4 transition-transform ${tab === tabItem.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="text-xs">{tabItem.label}</span>
              </div>
              {tabItem.id === 'notifications' && unread > 0 ? (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${tab === tabItem.id ? 'bg-white text-accent' : 'bg-danger text-white'}`}>
                  {unread}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 bg-canvas/30 md:p-6">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-2 md:mb-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-fg md:text-2xl">{t('finances.main.title')}</h2>
              <p className="mt-0.5 text-[11px] text-fg-muted md:mt-1 md:text-xs">
                {t('finances.main.subtitle')}
              </p>
            </div>
            <button
              type="button"
              title={t('finances.common.askLunaTitle')}
              className="luna-btn-primary flex size-9 items-center justify-center rounded-full p-0 md:size-10"
              onClick={() => {
                eventBus.emit('luna:chat:open', null)
              }}
            >
              <LunaIcon className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </header>
          {tab === 'dashboard' ? <FinancesDashboard /> : null}
          {tab === 'accounts' ? <AccountsPanel /> : null}
          {tab === 'transactions' ? <TransactionsPanel /> : null}
          {tab === 'budgets' ? <BudgetsPanel /> : null}
          {tab === 'goals' ? <GoalsPanel /> : null}
          {tab === 'recurring' ? <RecurringPanel /> : null}
          {tab === 'bills' ? <BillsPanel /> : null}
          {tab === 'cards' ? <CreditCardsPanel /> : null}
          {tab === 'piggy' ? <PiggyBanksPanel /> : null}
          {tab === 'reports' ? <ReportsPanel /> : null}
          {tab === 'analytics' ? <AnalyticsPanel /> : null}
          {tab === 'notifications' ? <NotificationsPanel onNavigate={selectTab} /> : null}
        </div>
      </div>
    </div>
  )
}
