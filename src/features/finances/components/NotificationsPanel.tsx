import { useTranslation } from 'react-i18next'
import i18n from '../../../i18n'
import { markAllNotificationsRead, markNotificationRead, useFinancesState } from '../financesStore'
import type { FinancesTab } from '../types'
import { NotificationsIcon, CheckIcon } from './FinancesIcons'

type Props = { onNavigate?: (tab: FinancesTab) => void }

export function NotificationsPanel({ onNavigate }: Props) {
  const { t } = useTranslation()
  const state = useFinancesState()
  const items = [...state.notifications].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-3xl mx-auto">
      
      <div className="flex items-center justify-between mb-6 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <NotificationsIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-fg">{t('finances.notifications.title')}</h2>
            <p className="text-[11px] text-fg-muted">{t('finances.notifications.subtitle')}</p>
          </div>
        </div>
        <button 
          type="button" 
          className="luna-btn-secondary px-4 py-2 text-xs flex items-center gap-2 hover:bg-surface transition-colors" 
          onClick={markAllNotificationsRead}
        >
          <CheckIcon className="h-4 w-4" />
          {t('finances.notifications.markAllRead')}
        </button>
      </div>

      <ul className="space-y-4">
        {items.length === 0 ? (
          <li className="luna-empty flex flex-col items-center py-12">
            <NotificationsIcon className="h-12 w-12 text-fg-muted opacity-30 mb-3" />
            <p className="text-sm font-semibold text-fg">{t('finances.notifications.inboxEmpty')}</p>
            <p className="text-[11px] text-fg-muted">{t('finances.notifications.noAlerts')}</p>
          </li>
        ) : (
          items.map((n) => {
            const isCritical = n.priority === 'critical'
            const isWarning = n.priority === 'warning'
            
            return (
              <li
                key={n.id}
                className={`luna-card luna-card--hover group relative overflow-hidden ${
                  n.read 
                    ? 'border-line/50 bg-surface/30 opacity-70 grayscale-[30%]' 
                    : isCritical 
                      ? 'border-danger/30 bg-danger/5 shadow-danger/5 hover:border-danger/50' 
                      : isWarning
                        ? 'border-warning/30 bg-warning/5 shadow-warning/5 hover:border-warning/50'
                        : 'border-accent/30 bg-accent/5 shadow-accent/5 hover:border-accent/50'
                }`}
              >
                {!n.read && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${isCritical ? 'bg-danger' : isWarning ? 'bg-warning' : 'bg-accent'}`} />
                )}
                
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-fg mb-1">{n.title}</p>
                    <p className="text-xs text-fg-dim leading-relaxed">{n.message}</p>
                    <p className="mt-2 text-[10px] text-fg-muted uppercase tracking-wider">{new Date(n.date).toLocaleString(i18n.language)}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {!n.read && (
                      <button 
                        type="button" 
                        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md transition-all hover:-translate-y-0.5 ${
                          isCritical ? 'bg-danger hover:shadow-danger/40' : isWarning ? 'bg-warning hover:shadow-warning/40' : 'bg-accent hover:shadow-accent/40'
                        }`}
                        onClick={() => markNotificationRead(n.id)}
                      >
                        <CheckIcon className="h-3 w-3" />
                        {t('finances.notifications.read')}
                      </button>
                    )}
                    {n.linkTab && onNavigate && (
                      <button 
                        type="button" 
                        className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-fg transition-all hover:-translate-y-0.5 hover:bg-line" 
                        onClick={() => onNavigate(n.linkTab!)}
                      >
                        {t('finances.notifications.viewDetails')}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}
