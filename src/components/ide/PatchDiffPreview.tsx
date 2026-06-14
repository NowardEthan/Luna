import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { computeLineDiff, countDiffChanges } from '../../lib/lineDiff'

type Props = {
  oldContent: string
  newContent: string
  defaultExpanded?: boolean
}

export function PatchDiffPreview({
  oldContent,
  newContent,
  defaultExpanded = false,
}: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const lines = useMemo(
    () => computeLineDiff(oldContent, newContent),
    [oldContent, newContent],
  )
  const stats = useMemo(() => countDiffChanges(lines), [lines])

  if (oldContent === newContent) return null

  return (
    <div className="mt-2">
      <button
        type="button"
        className="luna-hover-row flex w-full items-center gap-1.5 px-1 py-0.5 text-left text-[10px] text-fg-muted hover:text-fg"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span
          className={`shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          aria-hidden
        >
          ▸
        </span>
        <span>
          {t('ide.diff.view')}
          {stats.added || stats.removed ? (
            <span className="ml-1 tabular-nums text-fg-dim">
              (+{stats.added} −{stats.removed})
            </span>
          ) : null}
        </span>
      </button>
      {expanded ? (
        <pre
          className="mt-1 max-h-48 overflow-auto rounded-md border border-line-subtle bg-canvas p-2 font-mono text-[10px] leading-relaxed"
          aria-label={t('ide.diff.previewAria')}
        >
          {lines.map((line, idx) => (
            <span
              key={`${idx}-${line.kind}-${line.oldLine ?? ''}-${line.newLine ?? ''}`}
              className={
                line.kind === 'add'
                  ? 'block bg-success-muted text-success'
                  : line.kind === 'remove'
                    ? 'block bg-danger-muted text-danger'
                    : 'block text-fg-muted'
              }
            >
              {line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' '}
              {line.text || ' '}
            </span>
          ))}
        </pre>
      ) : null}
    </div>
  )
}
