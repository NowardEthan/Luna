import type { Role } from '../types/chat'

function RedoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 3" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 21" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

export type RedoTurnButtonProps = {
  messageRole: Role
  disabled?: boolean
  onRedo: () => void
}

/**
 * Refaz o par utilizador + assistente (texto curto + ícone, alinhado à bolha).
 */
export function RedoTurnButton({
  messageRole,
  disabled,
  onRedo,
}: RedoTurnButtonProps) {
  return (
    <div
      className={
        messageRole === 'user'
          ? 'mt-2 flex justify-end'
          : 'mt-2 flex justify-start'
      }
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onRedo}
        title="Apaga esta troca e tudo o que veio depois (inclui memórias gravadas nesses turnos) e gera uma nova resposta"
        aria-label="Refazer a partir desta mensagem"
        className="inline-flex items-center gap-1.5 rounded-lg border border-line-subtle bg-surface/90 px-2.5 py-1.5 text-[11px] font-medium text-fg-muted shadow-sm transition-colors hover:border-accent/45 hover:bg-white/[0.05] hover:text-accent disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <RedoIcon className="shrink-0 text-accent/90 opacity-90" />
        <span className="tracking-tight">Refazer</span>
      </button>
    </div>
  )
}
