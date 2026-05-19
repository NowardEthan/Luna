import { useLunaBadgeNav } from '../../context/LunaBadgeNavigation'
import { useThemeRevision } from '../../hooks/useThemeRevision'
import { memoryMentionBadgeClass } from '../../lib/badgeTone'

type Props = {
  noteId: string
  title?: string
  className?: string
}

/** Badge para referências a notas `save_memory` no pensamento ou na resposta. */
export function MemoryNoteMentionBadge({
  noteId,
  title,
  className = '',
}: Props) {
  useThemeRevision()
  const nav = useLunaBadgeNav()
  const badgeClass = memoryMentionBadgeClass()
  const label = title?.trim() || 'Memória'
  const hint = title
    ? `Ver memória: ${title}`
    : `Ver nota ${noteId} no painel Memórias`

  if (nav) {
    return (
      <button
        type="button"
        onClick={() => nav.focusMemoryNote(noteId)}
        className={`${badgeClass} inline-flex max-w-[min(100%,12rem)] cursor-pointer items-center rounded-full px-2 py-0.5 align-middle text-[10px] font-medium leading-tight tracking-wide transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${className}`.trim()}
        title={hint}
        aria-label={hint}
      >
        <span className="truncate">{label}</span>
      </button>
    )
  }

  return (
    <span
      className={`${badgeClass} inline-flex max-w-[min(100%,12rem)] items-center rounded-full px-2 py-0.5 align-middle text-[10px] font-medium leading-tight tracking-wide ${className}`.trim()}
      title={title ? `${title} · ${noteId}` : noteId}
    >
      <span className="truncate">{label}</span>
    </span>
  )
}
