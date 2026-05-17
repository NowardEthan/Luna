import { useLunaBadgeNav } from '../../context/LunaBadgeNavigation'

type Props = {
  noteId: string
  title?: string
  className?: string
}

const badgeClass =
  'inline-flex max-w-[min(100%,12rem)] items-center rounded-full bg-violet-500/20 px-2 py-0.5 align-middle text-[10px] font-medium leading-tight tracking-wide text-violet-200 ring-1 ring-violet-500/25'

/** Badge para referências a notas `save_memory` no pensamento ou na resposta. */
export function MemoryNoteMentionBadge({
  noteId,
  title,
  className = '',
}: Props) {
  const nav = useLunaBadgeNav()
  const label = title?.trim() || 'Memória'
  const hint = title
    ? `Ver memória: ${title}`
  : `Ver nota ${noteId} no painel Memórias`

  if (nav) {
    return (
      <button
        type="button"
        onClick={() => nav.focusMemoryNote(noteId)}
        className={`${badgeClass} cursor-pointer transition hover:bg-violet-500/30 hover:ring-violet-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 ${className}`.trim()}
        title={hint}
        aria-label={hint}
      >
        <span className="truncate">{label}</span>
      </button>
    )
  }

  return (
    <span
      className={`${badgeClass} ${className}`.trim()}
      title={title ? `${title} · ${noteId}` : noteId}
    >
      <span className="truncate">{label}</span>
    </span>
  )
}
