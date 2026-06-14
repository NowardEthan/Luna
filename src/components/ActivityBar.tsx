import type { LunaPrimaryView } from '../lib/primaryView'
import type { LunaWorkbenchMode } from '../lib/workbenchMode'
import { panelRegistry } from '../core/registry/PanelRegistry'
import { LunarAccountChip } from './lunar/LunarAccountChip'
import { Tooltip } from './ui/Tooltip'
import {
  activityIconBtn,
  activityIconBtnActive,
  activityRailClass,
} from './nav/activityBarStyles'
import { useTranslation } from 'react-i18next'

type Props = {
  workbenchMode: LunaWorkbenchMode
  ideAddonActive?: boolean
  financesAddonActive?: boolean
  primaryView: LunaPrimaryView
  onWorkbenchModeChange: (mode: LunaWorkbenchMode) => void
  onOpenMarketplace: () => void
  onOpenFinances?: () => void
  onOpenConversation: () => void
  preferencesOpen: boolean
  onTogglePreferences: () => void
  onOpenLunarAccount: () => void
}

/** Barra principal: modo de trabalho, loja, conta e definições. */
export function ActivityBar({
  workbenchMode,
  ideAddonActive = false,
  financesAddonActive = false,
  primaryView,
  onWorkbenchModeChange,
  onOpenMarketplace,
  onOpenFinances,
  onOpenConversation,
  preferencesOpen,
  onTogglePreferences,
  onOpenLunarAccount,
}: Props) {
  const pluginPanels = panelRegistry.list()
  const marketplaceOpen = primaryView === 'marketplace'
  const financesOpen = primaryView === 'finances'
  const fullScreenView = marketplaceOpen || financesOpen
  const chatActive = workbenchMode === 'chat' && !fullScreenView
  const ideActive = workbenchMode === 'ide' && !fullScreenView
  const { t } = useTranslation()

  return (
    <aside
      className={activityRailClass + ' bg-sidebar'}
      aria-label={t('activityBar.nav_aria')}
    >
      {pluginPanels.length > 0 ? (
        <span className="sr-only">
          {pluginPanels.map((p) => p.label).join(', ')}
        </span>
      ) : null}

      <Tooltip label={t('activityBar.chat_mode')} side="right">
        <button
          type="button"
          className={`${activityIconBtn} ${chatActive ? activityIconBtnActive : ''}`}
          aria-label={t('activityBar.chat_aria')}
          aria-pressed={chatActive}
          onClick={() => {
            onOpenConversation()
            onWorkbenchModeChange('chat')
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="stroke-current"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M12 3a7 7 0 0 0-7 7v4l-3 3h8a7 7 0 1 0 7-7Z" />
          </svg>
        </button>
      </Tooltip>

      {ideAddonActive ? (
        <Tooltip
          label={t('activityBar.ide_mode')}
          side="right"
          maxWidth="17rem"
        >
          <button
            type="button"
            className={`${activityIconBtn} ${ideActive ? activityIconBtnActive : ''}`}
            aria-label={t('activityBar.ide_aria')}
            aria-pressed={ideActive}
            onClick={() => {
              onOpenConversation()
              onWorkbenchModeChange('ide')
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-current"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M8 3h8l4 4v14H4V7l4-4z" />
              <path d="M12 3v4h4" />
              <path d="M8 13h8" />
              <path d="M8 17h5" />
            </svg>
          </button>
        </Tooltip>
      ) : null}

      <div className="my-2 h-px w-6 bg-line" aria-hidden />

      <Tooltip
        label={t('activityBar.marketplace')}
        side="right"
        maxWidth="17rem"
      >
        <button
          type="button"
          className={`${activityIconBtn} ${marketplaceOpen ? activityIconBtnActive : ''}`}
          aria-label={t('activityBar.marketplace_aria')}
          aria-pressed={marketplaceOpen}
          onClick={onOpenMarketplace}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="stroke-current"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 9h18v12H3z" />
            <path d="M3 9l2-4h14l2 4" />
            <path d="M9 13v4" />
            <path d="M15 13v4" />
          </svg>
        </button>
      </Tooltip>

      {financesAddonActive && onOpenFinances ? (
        <Tooltip
          label={t('activityBar.finances')}
          side="right"
          maxWidth="17rem"
        >
          <button
            type="button"
            className={`${activityIconBtn} ${financesOpen ? activityIconBtnActive : ''}`}
            aria-label={t('activityBar.finances_aria')}
            aria-pressed={financesOpen}
            onClick={onOpenFinances}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-current"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
              <path d="M6 15h4" />
            </svg>
          </button>
        </Tooltip>
      ) : null}

      <div className="mt-auto flex w-full flex-col items-center gap-1">
        <div className="mb-1 h-px w-6 bg-line" aria-hidden />
        <Tooltip
          label={t('activityBar.lunar_account')}
          side="right"
          maxWidth="17rem"
        >
          <LunarAccountChip
            variant="activity"
            onOpenAccount={onOpenLunarAccount}
          />
        </Tooltip>
        <Tooltip
          label={
            preferencesOpen
              ? t('activityBar.settings_close')
              : t('activityBar.settings_open')
          }
          side="right"
          maxWidth="17rem"
        >
          <button
            type="button"
            className={`${activityIconBtn} ${preferencesOpen ? activityIconBtnActive : ''}`}
            aria-label={t('activityBar.settings_aria')}
            aria-expanded={preferencesOpen}
            aria-pressed={preferencesOpen}
            onClick={onTogglePreferences}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-current"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        </Tooltip>
      </div>
    </aside>
  )
}
