import { useLunaBadgeNav } from '../../context/LunaBadgeNavigation'
import { TOOL_META } from '../../agent/toolSchemas'

type Props = {
  toolId: string
  className?: string
  /** Mensagem do turno — permite saltar para a linha da ferramenta na timeline */
  messageId?: string
}

/** Badge compacto para ferramentas mencionadas no pensamento ou na resposta. */
export function ToolMentionBadge({
  toolId,
  className = '',
  messageId,
}: Props) {
  const nav = useLunaBadgeNav()
  const meta = TOOL_META[toolId]
  const label = meta?.label ?? toolId.replace(/_/g, ' ')
  const color =
    meta?.badgeClass ?? 'bg-raised text-fg-dim ring-1 ring-line-subtle'
  const hint = `Ver passo «${label}» neste turno`

  const inner = <span className="truncate">{label}</span>

  if (nav && messageId) {
    return (
      <button
        type="button"
        onClick={() => nav.focusToolStep(messageId, toolId)}
        className={`inline-flex max-w-full cursor-pointer items-center rounded-full px-2 py-0.5 align-middle text-[10px] font-medium leading-tight tracking-wide transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${color} ${className}`.trim()}
        title={hint}
        aria-label={hint}
      >
        {inner}
      </button>
    )
  }

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2 py-0.5 align-middle text-[10px] font-medium leading-tight tracking-wide ${color} ${className}`.trim()}
      title={toolId}
    >
      {inner}
    </span>
  )
}

export function toolIdFromInlineCode(raw: string): string | null {
  const id = raw.trim()
  if (!id || /\s/.test(id)) return null
  if (TOOL_META[id]) return id
  return null
}
