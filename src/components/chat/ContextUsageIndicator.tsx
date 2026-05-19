import { useMemo, useState } from 'react'
import type { ContextUsageSnapshot } from '../../lib/contextUsageEstimate'

type Props = {
  usage: ContextUsageSnapshot
}

function ringColor(percent: number): string {
  if (percent >= 85) return 'text-red-400'
  if (percent >= 65) return 'text-amber-400'
  return 'text-accent'
}

export function ContextUsageIndicator({ usage }: Props) {
  const [open, setOpen] = useState(false)
  const color = ringColor(usage.percent)

  const title = useMemo(() => {
    const lines = usage.segments.map(
      (s) => `${s.label}: ~${s.tokens.toLocaleString('pt-BR')} tokens`,
    )
    lines.push(
      `Total estimado: ~${usage.totalTokens.toLocaleString('pt-BR')} / ${usage.limitTokens.toLocaleString('pt-BR')}`,
    )
    if (usage.compacted) {
      lines.push('Mensagens antigas foram resumidas nesta conversa.')
    }
    return lines.join('\n')
  }, [usage])

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-caption text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
        title={title}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" className={color} aria-hidden>
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeOpacity="0.2"
          />
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${usage.percent} 100`}
            strokeLinecap="round"
            transform="rotate(-90 12 12)"
            pathLength="100"
          />
        </svg>
        <span className="tabular-nums">
          Contexto ~{usage.percent}%
        </span>
      </button>
      {open ? (
        <div
          className="absolute bottom-full right-0 z-50 mb-1 w-56 rounded-lg border border-line bg-popover p-2.5 text-[10px] shadow-overlay"
          role="tooltip"
        >
          <p className="mb-1.5 font-medium text-fg">Uso estimado do contexto</p>
          <ul className="space-y-1 text-fg-muted">
            {usage.segments.map((s) => (
              <li key={s.id} className="flex justify-between gap-2">
                <span>{s.label}</span>
                <span className="tabular-nums text-fg-dim">
                  {s.tokens.toLocaleString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
          {usage.compacted ? (
            <p className="mt-2 border-t border-line pt-2 text-fg-muted">
              Resumo activo — mensagens antigas condensadas.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
