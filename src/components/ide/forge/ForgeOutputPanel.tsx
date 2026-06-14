import { useMemo, useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  clearForgeOutput,
  type ForgeOutputChannel,
} from '../../../lib/forgeOutputStore'
import { useForgeOutput } from '../../../hooks/useForgeOutput'

const CHANNELS: ForgeOutputChannel[] = ['agent', 'build', 'luna']

export function ForgeOutputPanel() {
  const { t } = useTranslation()
  const [channel, setChannel] = useState<ForgeOutputChannel>('agent')
  const lines = useForgeOutput(channel)
  const scrollRef = useRef<HTMLDivElement>(null)
  const allLines = useForgeOutput()

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [lines.length, channel])

  const channelLabels = useMemo(
    () =>
      ({
        agent: t('forge.output.channelAgent'),
        build: t('forge.output.channelBuild'),
        luna: t('forge.output.channelLuna'),
      }) as Record<ForgeOutputChannel, string>,
    [t],
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line-subtle/50 px-2 py-1">
        <div className="flex gap-1">
          {CHANNELS.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => setChannel(ch)}
              className={`rounded px-2 py-0.5 text-[10px] ${
                channel === ch
                  ? 'bg-white/[0.08] text-fg'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {channelLabels[ch]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="luna-btn-ghost px-1.5 py-0.5 text-[10px] text-fg-muted"
          onClick={() => clearForgeOutput(channel)}
        >
          {t('forge.output.clear')}
        </button>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed"
      >
        {lines.length === 0 ? (
          <p className="text-fg-muted">{t('forge.output.empty')}</p>
        ) : (
          <pre className="whitespace-pre-wrap break-words">
            {lines.map((line, i) => (
              <span
                key={`${line.ts}-${i}`}
                className={
                  line.stream === 'stderr'
                    ? 'text-danger'
                    : line.stream === 'info'
                      ? 'text-fg-muted'
                      : 'text-fg-dim'
                }
              >
                {line.text}
                {'\n'}
              </span>
            ))}
          </pre>
        )}
      </div>

      {allLines.length > 0 ? (
        <p className="shrink-0 border-t border-line-subtle/40 px-2 py-0.5 text-[9px] text-fg-muted">
          {t('forge.output.lineCount', { count: lines.length })}
        </p>
      ) : null}
    </div>
  )
}
