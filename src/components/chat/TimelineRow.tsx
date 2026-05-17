import { useState, type ReactNode } from 'react'
import { ToolMentionBadge } from './ToolMentionBadge'

export type TimelineRowStatus = 'loading' | 'ok' | 'error' | 'neutral'

type Props = {
  title: string
  /** Badge colorido (ex.: ferramenta na timeline) em vez do título em texto simples */
  toolId?: string
  subtitle?: string
  status?: TimelineRowStatus
  children?: ReactNode
  defaultOpen?: boolean
  /** Sem conteúdo expansível — só linha de estado */
  static?: boolean
  anchorMessageId?: string
  highlighted?: boolean
}

function RowTitle({
  title,
  toolId,
  subtitle,
  anchorMessageId,
}: Pick<Props, 'title' | 'toolId' | 'subtitle' | 'anchorMessageId'>) {
  return (
    <span className="min-w-0 flex-1 truncate text-[12px]">
      {toolId ? (
        <ToolMentionBadge
          toolId={toolId}
          messageId={anchorMessageId}
          className="mr-1.5"
        />
      ) : (
        <span className="font-medium text-fg-dim">{title}</span>
      )}
      {subtitle ? (
        <span className="font-normal text-fg-muted"> · {subtitle}</span>
      ) : null}
    </span>
  )
}

function StatusDot({ status }: { status: TimelineRowStatus }) {
  if (status === 'loading') {
    return (
      <span
        className="timeline-row__dot inline-flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent"
        aria-hidden
      />
    )
  }
  if (status === 'ok') {
    return (
      <span
        className="timeline-row__dot inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[9px] font-semibold text-accent"
        aria-hidden
      >
        ✓
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span
        className="timeline-row__dot inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-[9px] font-semibold text-red-300"
        aria-hidden
      >
        !
      </span>
    )
  }
  return (
    <span
      className="timeline-row__dot inline-block h-2 w-2 shrink-0 rounded-full bg-fg-muted/50"
      aria-hidden
    />
  )
}

export function TimelineRow({
  title,
  toolId,
  subtitle,
  status = 'neutral',
  children,
  defaultOpen = false,
  static: isStatic = false,
  anchorMessageId,
  highlighted = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const expandable = Boolean(children) && !isStatic

  const liClass = [
    'timeline-row',
    highlighted
      ? 'rounded-lg ring-2 ring-accent/45 ring-offset-2 ring-offset-canvas'
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  const liProps = {
    className: liClass,
    ...(toolId && anchorMessageId
      ? {
          'data-timeline-tool': toolId,
          'data-message-id': anchorMessageId,
        }
      : {}),
  }

  if (!expandable) {
    return (
      <li {...liProps}>
        <div className="timeline-row__inner flex min-w-0 items-center gap-2 py-1">
          <StatusDot status={status} />
          <RowTitle
            title={title}
            toolId={toolId}
            subtitle={subtitle}
            anchorMessageId={anchorMessageId}
          />
        </div>
      </li>
    )
  }

  return (
    <li {...liProps}>
      <details
        open={open}
        onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
        className="timeline-row__details group"
      >
        <summary className="timeline-row__summary flex cursor-pointer select-none list-none items-center gap-2 py-1 [&::-webkit-details-marker]:hidden">
          <StatusDot status={status} />
          <RowTitle
            title={title}
            toolId={toolId}
            subtitle={subtitle}
            anchorMessageId={anchorMessageId}
          />
          <span
            className="shrink-0 text-[10px] text-fg-muted transition-transform group-open:rotate-90"
            aria-hidden
          >
            ▸
          </span>
        </summary>
        <div className="timeline-row__body pb-2 pl-6 pr-1 pt-0.5">{children}</div>
      </details>
    </li>
  )
}
