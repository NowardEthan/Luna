import { useTranslation } from 'react-i18next'
import { useForgeLayout } from '../../../context/ForgeLayoutContext'
import type { ForgeSidebarView } from '../../../lib/forgeLayout'
import { Tooltip } from '../../ui/Tooltip'
import {
  activityIconBtn,
  activityIconBtnActive,
} from '../../nav/activityBarStyles'

type IconDef = {
  view: ForgeSidebarView
  labelKey: string
  paths: string[]
}

const HISTORY_VIEW: IconDef = {
  view: 'conversations',
  labelKey: 'forge.activity.conversations',
  paths: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
}

const WORKSPACE_VIEWS: IconDef[] = [
  {
    view: 'explorer',
    labelKey: 'forge.activity.explorer',
    paths: [
      'M3 7v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-5l-2-2H5a2 2 0 0 0-2 2z',
    ],
  },
  {
    view: 'search',
    labelKey: 'forge.activity.search',
    paths: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'm21 21-4.3-4.3'],
  },
  {
    view: 'git',
    labelKey: 'forge.activity.git',
    paths: [
      'M6 3v12',
      'M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
      'M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
      'M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
      'M8.59 13.51 15.42 17.49',
      'M15.41 6.51 8.59 10.49',
    ],
  },
  {
    view: 'outline',
    labelKey: 'forge.activity.outline',
    paths: ['M4 6h16', 'M4 12h10', 'M4 18h14'],
  },
]

const CONTEXT_VIEWS: IconDef[] = [
  {
    view: 'memories',
    labelKey: 'forge.activity.memories',
    paths: [
      'M12 2a4 4 0 0 1 4 4v1h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2V6a4 4 0 0 1 4-4z',
    ],
  },
]

const CHAT_ICON_PATHS = [
  'M12 3a7 7 0 0 0-7 7v4l-3 3h8a7 7 0 1 0 7-7Z',
  'M9.5 17h5',
]

function ForgeIcon({ paths }: { paths: string[] }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      className="stroke-current"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

function ViewButton({
  def,
  active,
  onClick,
}: {
  def: IconDef
  active: boolean
  onClick: () => void
}) {
  const { t } = useTranslation()
  return (
    <Tooltip label={t(def.labelKey)} side="right">
      <button
        type="button"
        className={`${activityIconBtn} ${active ? activityIconBtnActive : ''}`}
        aria-label={t(def.labelKey)}
        aria-pressed={active}
        onClick={onClick}
      >
        <ForgeIcon paths={def.paths} />
      </button>
    </Tooltip>
  )
}

function RailDivider() {
  return <div className="my-1 h-px w-6 bg-line-subtle" aria-hidden />
}

function SectionLabel({ children }: { children: string }) {
  return (
    <span
      className="mb-0.5 max-w-[2.5rem] truncate text-center text-[8px] font-medium uppercase tracking-wide text-fg-muted/70"
      aria-hidden
    >
      {children}
    </span>
  )
}

/** Activity bar do Forge — chat e histórico em destaque, depois ficheiros. */
export function ForgeActivityBar({ onSwitchToChat }: { onSwitchToChat?: () => void }) {
  const { t } = useTranslation()
  const forge = useForgeLayout()

  const isSidebarActive = (view: ForgeSidebarView) =>
    forge.sidebarOpen && forge.activeView === view

  return (
    <aside
      className="relative z-10 flex h-full w-12 shrink-0 flex-col items-center gap-0.5 border-r border-line-subtle bg-sidebar py-2"
      aria-label={t('forge.activity.aria')}
    >
      {onSwitchToChat ? (
        <>
          <Tooltip label={t('forge.activity.backToChat')} side="right">
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
              aria-label={t('forge.activity.backToChat')}
              onClick={onSwitchToChat}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                className="stroke-current"
                strokeWidth="1.75"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          </Tooltip>
          <RailDivider />
        </>
      ) : null}

      <SectionLabel>{t('forge.activity.sectionChat')}</SectionLabel>
      <Tooltip label={t('forge.activity.ai')} side="right">
        <button
          type="button"
          className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
            forge.aiPanelOpen
              ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
              : 'text-fg-muted hover:bg-surface-hover hover:text-fg'
          }`}
          aria-label={t('forge.activity.ai')}
          aria-pressed={forge.aiPanelOpen}
          onClick={() => forge.toggleAiPanel()}
        >
          <ForgeIcon paths={CHAT_ICON_PATHS} />
        </button>
      </Tooltip>

      <ViewButton
        def={HISTORY_VIEW}
        active={isSidebarActive('conversations')}
        onClick={() => forge.toggleView('conversations')}
      />

      <RailDivider />

      <SectionLabel>{t('forge.activity.sectionProject')}</SectionLabel>
      {WORKSPACE_VIEWS.map((def) => (
        <ViewButton
          key={def.view}
          def={def}
          active={isSidebarActive(def.view)}
          onClick={() => forge.toggleView(def.view)}
        />
      ))}

      <RailDivider />

      <SectionLabel>{t('forge.activity.sectionContext')}</SectionLabel>
      {CONTEXT_VIEWS.map((def) => (
        <ViewButton
          key={def.view}
          def={def}
          active={isSidebarActive(def.view)}
          onClick={() => forge.toggleView(def.view)}
        />
      ))}

      <div className="flex-1" aria-hidden />
    </aside>
  )
}
