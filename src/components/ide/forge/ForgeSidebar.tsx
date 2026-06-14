import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useForgeLayout } from '../../../context/ForgeLayoutContext'
import { useLunaWorkspace } from '../../../context/LunaWorkspaceContext'
import { workspaceDisplayName } from '../../../lib/workspaceSessions'
import { ForgeSearchPanel } from './ForgeSearchPanel'
import { ForgeSourceControlPanel } from './ForgeSourceControlPanel'
import { ForgeOutlinePanel } from './ForgeOutlinePanel'

type Props = {
  files: ReactNode
  history: ReactNode
  memories: ReactNode
}

const VIEW_TITLE_KEYS = {
  explorer: 'forge.sidebar.explorer',
  search: 'forge.sidebar.search',
  git: 'forge.sidebar.git',
  outline: 'forge.sidebar.outline',
  conversations: 'forge.sidebar.conversations',
  memories: 'forge.sidebar.memories',
} as const

export function ForgeSidebar({ files, history, memories }: Props) {
  const { t } = useTranslation()
  const forge = useForgeLayout()
  const ws = useLunaWorkspace()
  const titleKey = VIEW_TITLE_KEYS[forge.activeView]
  const projectName = ws.workspaceRoot
    ? ws.workspaceFolders.length > 1
      ? `${workspaceDisplayName(ws.workspaceRoot)} (+${ws.workspaceFolders.length - 1})`
      : workspaceDisplayName(ws.workspaceRoot)
    : null

  const content =
    forge.activeView === 'search' ? (
      <ForgeSearchPanel />
    ) : forge.activeView === 'git' ? (
      <ForgeSourceControlPanel />
    ) : forge.activeView === 'outline' ? (
      <ForgeOutlinePanel />
    ) : forge.activeView === 'conversations' ? (
      history
    ) : forge.activeView === 'memories' ? (
      memories
    ) : (
      files
    )

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <header className="flex shrink-0 items-center justify-between border-b border-line px-3 py-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fg">
            {t(titleKey)}
          </p>
          {projectName && forge.activeView === 'explorer' ? (
            <p className="truncate text-[10px] text-fg-muted" title={ws.workspaceRoot ?? ''}>
              {projectName}
            </p>
          ) : null}
        </div>
        {forge.activeView === 'explorer' ? (
          <button
            type="button"
            onClick={() => void ws.openFolder()}
            className="luna-btn-ghost rounded p-1 text-fg-muted hover:text-fg"
            title={
              ws.workspaceFolders.length
                ? t('forge.workspace.addFolder')
                : t('ide.explorer.openFolder')
            }
            aria-label={
              ws.workspaceFolders.length
                ? t('forge.workspace.addFolder')
                : t('ide.explorer.openFolder')
            }
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-current"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-hidden" role="region" aria-label={t(titleKey)}>
        {content}
      </div>
    </div>
  )
}
