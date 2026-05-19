import type { ReactNode } from 'react'
import type { SidebarPanel } from '../../lib/sidebarPanel'
import { IdePrimarySidebar } from '../workbench/IdePrimarySidebar'
import { ResizableSplit } from '../ui/ResizableSplit'
import { EditorPanel } from './EditorPanel'
import { TerminalPanel } from './TerminalPanel'
import { IdeSessionBanner } from './IdeSessionBanner'

type Props = {
  chatPanel: ReactNode
  sidebarPanel: SidebarPanel
  onSidebarPanelChange: (panel: SidebarPanel) => void
  filesPanel: ReactNode
  historyPanel: ReactNode
  memoriesPanel: ReactNode
}

export function IdeWorkbench({
  chatPanel,
  sidebarPanel,
  onSidebarPanelChange,
  filesPanel,
  historyPanel,
  memoriesPanel,
}: Props) {
  return (
    <ResizableSplit
      className="h-full min-h-0 min-w-0 flex-1"
      storageKey="ide-explorer"
      defaultLeadingSize={240}
      minLeading={200}
      minTrailing={480}
      leading={
        <IdePrimarySidebar
          sidebarPanel={sidebarPanel}
          onSidebarPanelChange={onSidebarPanelChange}
          files={filesPanel}
          history={historyPanel}
          memories={memoriesPanel}
        />
      }
      trailing={
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <IdeSessionBanner />
          <ResizableSplit
            className="min-h-0 flex-1"
            direction="vertical"
            storageKey="ide-terminal"
            defaultLeadingSize={480}
            defaultLeadingRatio={0.72}
            minLeading={280}
            minTrailing={140}
            leading={
              <ResizableSplit
                className="h-full min-h-0 flex-1"
                storageKey="ide-chat"
                defaultLeadingSize={400}
                defaultLeadingRatio={0.58}
                minLeading={280}
                minTrailing={300}
                leading={
                  <div className="flex h-full min-h-0 min-w-0 overflow-hidden">
                    <EditorPanel />
                  </div>
                }
                trailing={
                  <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-l border-line-subtle bg-canvas">
                    {chatPanel}
                  </div>
                }
              />
            }
            trailing={
              <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-line bg-sidebar">
                <TerminalPanel />
              </div>
            }
          />
        </div>
      }
    />
  )
}
