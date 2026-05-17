import type { ReactNode } from 'react'

type Props = {
  title?: string
  children: ReactNode
  details?: ReactNode
  detailsLabel?: string
  defaultOpenDetails?: boolean
  className?: string
}

export function InlineErrorBanner({
  title,
  children,
  details,
  detailsLabel = 'Detalhes técnicos',
  defaultOpenDetails = false,
  className = '',
}: Props) {
  return (
    <div
      className={`rounded-xl border border-red-400/35 bg-red-500/[0.08] px-3.5 py-3 ${className}`.trim()}
      role="alert"
    >
      {title ? (
        <p className="mb-1 text-ui font-medium text-fg">{title}</p>
      ) : null}
      <div className="text-body leading-relaxed text-fg">{children}</div>
      {details ? (
        <details className="mt-2" open={defaultOpenDetails ? true : undefined}>
          <summary className="cursor-pointer select-none text-ui text-fg-muted">
            {detailsLabel}
          </summary>
          <div className="mt-2">{details}</div>
        </details>
      ) : null}
    </div>
  )
}
