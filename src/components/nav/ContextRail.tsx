import type { SidebarPanel } from '../../lib/sidebarPanel'
import { isHistoryOpen, isMemoriesOpen } from '../../lib/sidebarPanel'
import { Tooltip } from '../ui/Tooltip'
import { activityIconBtn, activityIconBtnActive } from './activityBarStyles'
import { useTranslation } from 'react-i18next'

export type ContextRailVariant = 'chat' | 'ide'

type Props = {
  variant: ContextRailVariant
  sidebarPanel: SidebarPanel
  /** Luna Forge: painéis só activos com projecto aberto. */
  forgeProjectOpen?: boolean
  onNewChat: () => void
  onToggleHistory: () => void
  onToggleMemories: () => void
  onFocusCurrentChat: () => void
  onShowFiles?: () => void
}

function RailLabel({ children }: { children: string }) {
  return (
    <p
      className="mb-1 w-full px-0.5 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-fg-dim"
      aria-hidden
    >
      {children}
    </p>
  )
}

function RailDivider() {
  return <div className="my-1 h-px w-6 bg-line" aria-hidden />
}

/** Segunda coluna: acções do modo actual (chat ou IDE). */
export function ContextRail({
  variant,
  sidebarPanel,
  forgeProjectOpen = true,
  onNewChat,
  onToggleHistory,
  onToggleMemories,
  onFocusCurrentChat,
  onShowFiles,
}: Props) {
  const { t } = useTranslation()
  const historyOpen = isHistoryOpen(sidebarPanel)
  const memoriesOpen = isMemoriesOpen(sidebarPanel)
  const filesActive = variant === 'ide' && sidebarPanel === 'none'

  const historyLabel =
    variant === 'ide'
      ? historyOpen
        ? t('contextRail.close_chats')
        : t('contextRail.open_chats')
      : historyOpen
        ? t('contextRail.close_chat_list')
        : t('contextRail.open_chats_list')

  const memoriesLabel =
    variant === 'ide'
      ? memoriesOpen
        ? t('contextRail.close_memories')
        : t('contextRail.open_memories_panel')
      : memoriesOpen
        ? t('contextRail.close_memories')
        : t('contextRail.open_memories')

  return (
    <aside
      className="relative z-20 flex h-full w-12 shrink-0 flex-col items-center gap-1.5 overflow-visible py-2"
      aria-label={variant === 'chat' ? t('contextRail.chat_tools') : t('contextRail.ide_panels')}
    >
      <RailLabel>
        {variant === 'chat' ? 'Chat' : t('lunaForge.short')}
      </RailLabel>

      {variant === 'chat' ? (
        <>
          <Tooltip label={t('contextRail.new_chat')} side="right">
            <button
              type="button"
              className={`${activityIconBtn} ${activityIconBtnActive}`}
              aria-label={t('contextRail.new_chat')}
              onClick={onNewChat}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="stroke-current"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </Tooltip>

          <RailDivider />

          <Tooltip label={historyLabel} side="right" maxWidth="16rem">
            <button
              type="button"
              className={`${activityIconBtn} ${historyOpen ? activityIconBtnActive : ''}`}
              aria-label={t('contextRail.conversations_aria')}
              aria-expanded={historyOpen}
              aria-pressed={historyOpen}
              onClick={onToggleHistory}
              onKeyDown={(e) => {
                if (
                  historyOpen &&
                  (e.key === ' ' || e.key === 'Enter')
                ) {
                  e.preventDefault()
                  document.getElementById('luna-history-search')?.focus()
                }
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
                <path d="M8 6h13" />
                <path d="M8 12h13" />
                <path d="M8 18h13" />
                <path d="M3 6h.01" />
                <path d="M3 12h.01" />
                <path d="M3 18h.01" />
              </svg>
            </button>
          </Tooltip>

          <Tooltip label={memoriesLabel} side="right" maxWidth="16rem">
            <button
              type="button"
              className={`${activityIconBtn} ${memoriesOpen ? activityIconBtnActive : ''}`}
              aria-label={t('contextRail.memories_aria')}
              aria-expanded={memoriesOpen}
              aria-pressed={memoriesOpen}
              onClick={onToggleMemories}
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
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <path d="M8 7h8" />
                <path d="M8 11h8" />
                <path d="M8 15h4" />
              </svg>
            </button>
          </Tooltip>

          <RailDivider />

          <Tooltip
            label={t('contextRail.focus_chat_end')}
            side="right"
            maxWidth="16rem"
          >
            <button
              type="button"
              className={activityIconBtn}
              aria-label={t('contextRail.focus_message')}
              onClick={onFocusCurrentChat}
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
                <path d="M12 5v14" />
                <path d="m6 11 6 6 6-6" />
              </svg>
            </button>
          </Tooltip>
        </>
      ) : !forgeProjectOpen ? (
        <p className="px-1 text-center text-[9px] leading-snug text-fg-muted">
          {t('lunaForge.railHint')}
        </p>
      ) : (
        <>
          <Tooltip label={t('contextRail.file_explorer')} side="right">
            <button
              type="button"
              className={`${activityIconBtn} ${filesActive ? activityIconBtnActive : ''}`}
              aria-label={t('contextRail.files')}
              aria-pressed={filesActive}
              onClick={() => onShowFiles?.()}
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
                <path d="M3 7v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-5l-2-2H5a2 2 0 0 0-2 2z" />
              </svg>
            </button>
          </Tooltip>

          <RailDivider />

          <Tooltip label={historyLabel} side="right" maxWidth="16rem">
            <button
              type="button"
              className={`${activityIconBtn} ${historyOpen ? activityIconBtnActive : ''}`}
              aria-label={t('contextRail.conversations_aria')}
              aria-expanded={historyOpen}
              aria-pressed={historyOpen}
              onClick={onToggleHistory}
              onKeyDown={(e) => {
                if (
                  historyOpen &&
                  (e.key === ' ' || e.key === 'Enter')
                ) {
                  e.preventDefault()
                  document.getElementById('luna-history-search')?.focus()
                }
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
                <path d="M8 6h13" />
                <path d="M8 12h13" />
                <path d="M8 18h13" />
                <path d="M3 6h.01" />
                <path d="M3 12h.01" />
                <path d="M3 18h.01" />
              </svg>
            </button>
          </Tooltip>

          <Tooltip label={memoriesLabel} side="right" maxWidth="16rem">
            <button
              type="button"
              className={`${activityIconBtn} ${memoriesOpen ? activityIconBtnActive : ''}`}
              aria-label={t('contextRail.memories_aria')}
              aria-expanded={memoriesOpen}
              aria-pressed={memoriesOpen}
              onClick={onToggleMemories}
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
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <path d="M8 7h8" />
                <path d="M8 11h8" />
                <path d="M8 15h4" />
              </svg>
            </button>
          </Tooltip>

          <RailDivider />

          <Tooltip
            label={t('contextRail.focus_integrated_chat')}
            side="right"
            maxWidth="16rem"
          >
            <button
              type="button"
              className={activityIconBtn}
              aria-label={t('contextRail.focus_chat')}
              onClick={onFocusCurrentChat}
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
        </>
      )}
    </aside>
  )
}
