import type { ReactNode } from 'react'

type MainLayoutProps = {
  titleBar?: ReactNode
  /** Painel lateral unificado (AppSidebar). Ausente → main ocupa tudo. */
  sidebar?: ReactNode
  /** Sem padding — workbench IDE edge-to-edge (estilo Cursor). */
  compact?: boolean
  children: ReactNode
}

export function MainLayout({
  titleBar,
  sidebar,
  compact = false,
  children,
}: MainLayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      {titleBar}
      <div className={`flex min-h-0 flex-1 ${compact ? 'p-0' : 'p-2'}`}>
        <div
          className={`flex min-h-0 flex-1 min-w-0 ${compact ? 'gap-0' : 'gap-2'}`}
        >
          {sidebar}
          <div
            className={`relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
              compact ? 'bg-canvas' : 'luna-surface-panel'
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
