import type { ReactNode } from 'react'
import { ResizableSplit } from '../../components/ui/ResizableSplit'

type SidebarLayoutProps = {
  sidebarOpen: boolean
  sidebarContent: ReactNode
  mainContent: ReactNode
}

export function SidebarLayout({ sidebarOpen, sidebarContent, mainContent }: SidebarLayoutProps) {
  return (
    <ResizableSplit
      className="h-full min-h-0 min-w-0 flex-1"
      storageKey="chat-sidebar"
      defaultLeadingSize={288}
      minLeading={220}
      minTrailing={320}
      resizable={sidebarOpen}
      leadingSize={sidebarOpen ? undefined : 0}
      leading={sidebarOpen && sidebarContent ? sidebarContent : <div />}
      trailing={
        <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col bg-canvas">
          {mainContent}
        </div>
      }
    />
  )
}
