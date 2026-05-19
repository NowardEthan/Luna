import type { ReactNode } from 'react'
import type { SidebarPanel } from '../../lib/sidebarPanel'

type Tab = 'files' | 'history' | 'memories'

const tabs: { id: Tab; label: string; panel: SidebarPanel }[] = [
  { id: 'files', label: 'Ficheiros', panel: 'none' },
  { id: 'history', label: 'Conversas', panel: 'history' },
  { id: 'memories', label: 'Memórias', panel: 'memories' },
]

type Props = {
  sidebarPanel: SidebarPanel
  onSidebarPanelChange: (panel: SidebarPanel) => void
  files: ReactNode
  history: ReactNode
  memories: ReactNode
}

export function IdePrimarySidebar({
  sidebarPanel,
  onSidebarPanelChange,
  files,
  history,
  memories,
}: Props) {
  const activeTab: Tab =
    sidebarPanel === 'history'
      ? 'history'
      : sidebarPanel === 'memories'
        ? 'memories'
        : 'files'

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div
        className="flex shrink-0 border-b border-line"
        role="tablist"
        aria-label="Painel esquerdo do IDE"
      >
        {tabs.map((tab) => {
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`min-w-0 flex-1 truncate px-2 py-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus ${
                selected
                  ? 'border-b-2 border-accent text-fg'
                  : 'text-fg-muted hover:bg-white/[0.04] hover:text-fg'
              }`}
              onClick={() => {
                if (tab.id === 'files') {
                  onSidebarPanelChange('none')
                  return
                }
                onSidebarPanelChange(
                  sidebarPanel === tab.panel ? 'none' : tab.panel,
                )
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden" role="tabpanel">
        {activeTab === 'files' ? files : activeTab === 'history' ? history : memories}
      </div>
    </div>
  )
}
