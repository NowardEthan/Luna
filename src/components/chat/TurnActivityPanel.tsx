import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  children: ReactNode
  summary: string
  stepCount: number
  /** Aberto por defeito (ex.: turno em curso) */
  defaultOpen?: boolean
  /** Turno activo — animação na borda do painel */
  live?: boolean
}

export function TurnActivityPanel({
  children,
  summary,
  stepCount,
  defaultOpen = false,
  live = false,
}: Props) {
  const { t } = useTranslation()
  if (stepCount < 1) return null

  return (
    <details
      className={`turn-activity group mb-3 w-full max-w-[min(100%,42rem)] overflow-hidden luna-card !p-0 shadow-sm ${live ? 'turn-activity--live' : ''}`}
      open={defaultOpen}
    >
      <summary className="luna-hover-row flex cursor-pointer select-none list-none items-center gap-2 px-3 py-2 text-[11px] text-fg-muted [&::-webkit-details-marker]:hidden">
        <span
          className="shrink-0 text-[10px] text-fg-muted/60 transition-transform duration-300 group-open:rotate-90 group-open:text-accent"
          aria-hidden
        >
          ▸
        </span>
        <span className="shrink-0 font-semibold uppercase tracking-[0.08em] text-fg-muted/70 transition-colors group-hover:text-accent/90">
          {t('chatTurn.activity_title')}
        </span>
        <span className="shrink-0 rounded-full bg-line-subtle/50 px-1.5 py-[0.5px] text-[10px] font-medium tabular-nums text-fg-dim transition-colors group-open:bg-accent/10 group-open:text-accent">
          {stepCount}
        </span>
        <span className="min-w-0 flex-1 truncate font-normal normal-case tracking-normal opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          — {summary}
        </span>
      </summary>
      <div className="mt-1 border-t border-line-subtle bg-canvas/40 pl-4 pr-3 pt-2 pb-3 luna-fade-in">{children}</div>
    </details>
  )
}
