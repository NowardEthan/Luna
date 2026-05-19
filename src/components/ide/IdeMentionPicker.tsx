import type { MentionSuggestion } from '../../lib/ideMentionAutocomplete'

type Props = {
  suggestions: MentionSuggestion[]
  activeIndex: number
  onPick: (item: MentionSuggestion) => void
}

export function IdeMentionPicker({
  suggestions,
  activeIndex,
  onPick,
}: Props) {
  if (!suggestions.length) {
    return (
      <div
        className="absolute bottom-full left-0 z-50 mb-1 w-[min(100%,18rem)] rounded-lg border border-line bg-popover px-2.5 py-2 text-[11px] text-fg-muted shadow-overlay"
        role="listbox"
      >
        Nenhuma correspondência
      </div>
    )
  }

  return (
    <ul
      className="absolute bottom-full left-0 z-50 mb-1 max-h-52 w-[min(100%,20rem)] overflow-y-auto rounded-lg border border-line bg-popover py-1 shadow-overlay"
      role="listbox"
      aria-label="Menções @"
    >
      {suggestions.map((s, i) => {
        const active = i === activeIndex
        return (
          <li key={`${s.kind}-${s.insert}`} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={active}
              className={`flex w-full flex-col items-start gap-0 px-2.5 py-1.5 text-left transition-colors ${
                active
                  ? 'bg-accent-muted text-accent'
                  : 'text-fg-dim hover:bg-raised-hover hover:text-fg'
              }`}
              onMouseDown={(e) => {
                e.preventDefault()
                onPick(s)
              }}
            >
              <span className="text-[12px] font-medium">{s.label}</span>
              {s.detail ? (
                <span className="text-[10px] text-fg-muted">{s.detail}</span>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
