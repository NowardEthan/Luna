import { copyWithToast } from '../../lib/toast'

type Props = {
  text: string
  label?: string
}

export function CopyMessageButton({ text, label = 'Copiar mensagem' }: Props) {
  if (!text.trim()) return null
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="rounded-md p-1 text-fg-muted opacity-0 transition-opacity hover:bg-white/[0.08] hover:text-fg group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      onClick={() => void copyWithToast(text)}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2" aria-hidden>
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
  )
}
