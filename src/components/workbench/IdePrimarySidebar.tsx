import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { SidebarPanel } from '../../lib/sidebarPanel'

type Props = {
  sidebarPanel: SidebarPanel
  files: ReactNode
  history: ReactNode
  memories: ReactNode
}

export function IdePrimarySidebar({
  sidebarPanel,
  files,
  history,
  memories,
}: Props) {
  const { t } = useTranslation()
  const title =
    sidebarPanel === 'history'
      ? t('ide.sidebar.conversations')
      : sidebarPanel === 'memories'
        ? t('ide.sidebar.memories')
        : t('ide.sidebar.files')

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div className="shrink-0 border-b border-line px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-dim">
          {title}
        </p>
      </div>
      <div
        className="min-h-0 flex-1 overflow-hidden"
        role="region"
        aria-label={title}
      >
        {sidebarPanel === 'history'
          ? history
          : sidebarPanel === 'memories'
            ? memories
            : files}
      </div>
    </div>
  )
}
