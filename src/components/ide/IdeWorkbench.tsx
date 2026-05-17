import type { ReactNode } from 'react'
import { FileExplorer } from './FileExplorer'
import { EditorPanel } from './EditorPanel'
import { TerminalPanel } from './TerminalPanel'
import { PendingChangesPanel } from './PendingChangesPanel'
import { IdeSessionBanner } from './IdeSessionBanner'

type Props = {
  chatPanel: ReactNode
}

export function IdeWorkbench({ chatPanel }: Props) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="flex w-[220px] shrink-0 flex-col border-r border-line">
        <FileExplorer />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <IdeSessionBanner />
        <div className="flex min-h-0 flex-1">
          <EditorPanel />
          <div className="flex w-[min(420px,38vw)] shrink-0 flex-col border-l border-line">
            {chatPanel}
          </div>
        </div>
        <PendingChangesPanel />
        <div className="h-[180px] shrink-0">
          <TerminalPanel />
        </div>
      </div>
    </div>
  )
}
