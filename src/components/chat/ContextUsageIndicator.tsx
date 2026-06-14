import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const color = ringColor(usage.percent)
  const locale = i18n.language?.startsWith('pt') ? 'pt-BR' : 'en-US'

  const title = useMemo(() => {
    const lines = usage.segments.map((s) =>
      t('contextUsage.segment_tokens', {
        label: s.label,
        tokens: s.tokens.toLocaleString(locale),
      }),
    )
    lines.push(
      t('contextUsage.total', {
        total: usage.totalTokens.toLocaleString(locale),
        limit: usage.limitTokens.toLocaleString(locale),
      }),
    )
    if (usage.compacted) {
      lines.push(t('contextUsage.compacted_title'))
    }
    return lines.join('\n')
  }, [usage, t, locale])

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-caption text-fg-muted transition-colors hover:bg-raised-hover hover:text-fg"
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
          {t('contextUsage.label', { percent: usage.percent })}
        </span>
      </button>
      {open ? (
        <div
          className="absolute bottom-full right-0 z-50 mb-1 w-56 rounded-lg border border-line bg-popover p-2.5 text-[10px] shadow-overlay"
          role="tooltip"
        >
          <p className="mb-1.5 font-medium text-fg">{t('contextUsage.popover_title')}</p>
          <ul className="space-y-1 text-fg-muted">
            {usage.segments.map((s) => (
              <li key={s.id} className="flex justify-between gap-2">
                <span>{s.label}</span>
                <span className="tabular-nums text-fg-dim">
                  {s.tokens.toLocaleString(locale)}
                </span>
              </li>
            ))}
          </ul>
          {usage.compacted ? (
            <p className="mt-2 border-t border-line pt-2 text-fg-muted">
              {t('contextUsage.compacted_active')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
