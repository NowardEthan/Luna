import { useEffect, useState, type ReactNode } from 'react'
import type { LunaIndicatorPhase } from './LunaPhaseIndicator'
import { LunaPhaseIndicator } from './LunaPhaseIndicator'
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
  compact?: boolean
  /** Animação de loading alinhada à fase (só quando status=loading). */
  loadingPhase?: LunaIndicatorPhase
}

function RowTitle({
  title,
  toolId,
  subtitle,
  anchorMessageId,
  compact,
}: Pick<Props, 'title' | 'toolId' | 'subtitle' | 'anchorMessageId' | 'compact'>) {
  return (
    <span
      className={`min-w-0 flex-1 ${compact ? 'text-[11px]' : 'truncate text-[12px]'}`}
    >
      {toolId ? (
        <ToolMentionBadge
          toolId={toolId}
          messageId={anchorMessageId}
          className="mr-1"
        />
      ) : (
        <span className="font-medium text-fg-dim">{title}</span>
      )}
      {subtitle ? (
        <span
          className={`font-normal text-fg-muted ${compact ? 'block truncate text-[10px] leading-snug' : ''}`}
        >
          {compact ? subtitle : ` · ${subtitle}`}
        </span>
      ) : null}
    </span>
  )
}

function StatusDot({
  status,
  compact,
  loadingPhase = 'waiting',
}: {
  status: TimelineRowStatus
  compact?: boolean
  loadingPhase?: LunaIndicatorPhase
}) {
  const size = compact ? 'h-1.5 w-1.5' : 'h-2 w-2'
  if (status === 'loading') {
    return (
      <span className="mt-px shrink-0">
        <LunaPhaseIndicator
          phase={loadingPhase}
          size={compact ? 'sm' : 'md'}
        />
      </span>
    )
  }
  if (status === 'ok') {
    return (
      <span
        className={`timeline-row__dot inline-flex ${compact ? 'h-3.5 w-3.5 text-[8px]' : 'h-4 w-4 text-[9px]'} shrink-0 items-center justify-center rounded-full bg-accent/10 font-bold text-accent ring-1 ring-inset ring-accent/30 mt-px`}
        aria-hidden
      >
        ✓
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span
        className={`timeline-row__dot inline-flex ${compact ? 'h-3.5 w-3.5 text-[8px]' : 'h-4 w-4 text-[9px]'} shrink-0 items-center justify-center rounded-full bg-danger-muted font-semibold text-red-700 dark:text-red-300`}
        aria-hidden
      >
        !
      </span>
    )
  }
  return (
    <span
      className={`timeline-row__dot inline-block ${size} shrink-0 rounded-full bg-line-subtle ring-1 ring-inset ring-white/5 mt-[3px]`}
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
  compact = false,
  loadingPhase = 'waiting',
}: Props) {
  const live = status === 'loading'
  const [userOpen, setUserOpen] = useState(defaultOpen)
  const open = live || userOpen

  useEffect(() => {
    if (defaultOpen) setUserOpen(true)
  }, [defaultOpen])

  const expandable = Boolean(children) && !isStatic
  const py = compact ? 'py-0.5' : 'py-1'

  const liClass = [
    'timeline-row',
    compact ? 'timeline-row--compact' : '',
    highlighted
      ? 'rounded-md ring-2 ring-accent ring-offset-1 ring-offset-canvas'
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
        <div className={`timeline-row__inner flex min-w-0 items-start gap-2.5 px-1 -ml-1 ${py}`}>
          <StatusDot
            status={status}
            compact={compact}
            loadingPhase={loadingPhase}
          />
          <RowTitle
            title={title}
            toolId={toolId}
            subtitle={subtitle}
            anchorMessageId={anchorMessageId}
            compact={compact}
          />
        </div>
      </li>
    )
  }

  return (
    <li {...liProps}>
      <details
        open={open}
        onToggle={(e) => {
          if (live) return
          setUserOpen((e.target as HTMLDetailsElement).open)
        }}
        className="timeline-row__details group/row"
      >
        <summary
          className={`timeline-row__summary flex cursor-pointer select-none list-none items-start gap-2.5 ${py} px-1 -ml-1 rounded-md transition-all hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden`}
        >
          <StatusDot
            status={status}
            compact={compact}
            loadingPhase={loadingPhase}
          />
          <RowTitle
            title={title}
            toolId={toolId}
            subtitle={subtitle}
            anchorMessageId={anchorMessageId}
            compact={compact}
          />
          <span
            className="mt-0.5 shrink-0 text-[9px] text-fg-muted transition-transform group-open/row:rotate-90"
            aria-hidden
          >
            ▸
          </span>
        </summary>
        <div
          className={`timeline-row__body ${compact ? 'pb-1.5 pl-6 pr-0.5 pt-0.5' : 'pb-2 pl-7 pr-1 pt-0.5'}`}
        >
          {children}
        </div>
      </details>
    </li>
  )
}
