import type { ReactNode } from 'react'

export type PanelProps = {
  title?: string
  children: ReactNode
  className?: string
  headerActions?: ReactNode
}

export function Panel({ title, children, className = '', headerActions }: PanelProps) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-md border border-line bg-surface ${className}`}
    >
      {title ? (
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-line-subtle px-3 py-2">
          <h3 className="text-ui font-medium text-fg">{title}</h3>
          {headerActions}
        </header>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </section>
  )
}
