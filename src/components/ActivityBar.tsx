import type { LunaWorkbenchMode } from '../lib/workbenchMode'
import { Tooltip } from './ui/Tooltip'

type Props = {
  workbenchMode: LunaWorkbenchMode
  onWorkbenchModeChange: (mode: LunaWorkbenchMode) => void
  onNewChat: () => void
  historyOpen: boolean
  onToggleHistory: () => void
  memoriesOpen: boolean
  onToggleMemories: () => void
  onFocusCurrentChat: () => void
}

const iconBtn =
  'flex size-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-raised-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar'

const iconBtnActive = 'bg-accent-muted text-accent shadow-sm'

export function ActivityBar({
  workbenchMode,
  onWorkbenchModeChange,
  onNewChat,
  historyOpen,
  onToggleHistory,
  memoriesOpen,
  onToggleMemories,
  onFocusCurrentChat,
}: Props) {
  return (
    <aside
      className="relative z-20 flex w-11 shrink-0 flex-col items-center gap-1 overflow-visible border-r border-line bg-sidebar py-2"
      aria-label="Menu principal"
    >
      <Tooltip label="Modo conversa" side="right">
        <button
          type="button"
          className={`${iconBtn} ${workbenchMode === 'chat' ? iconBtnActive : ''}`}
          aria-label="Modo conversa"
          aria-pressed={workbenchMode === 'chat'}
          onClick={() => onWorkbenchModeChange('chat')}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="stroke-current"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M12 3a7 7 0 0 0-7 7v4l-3 3h8a7 7 0 1 0 7-7Z" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip label="Modo IDE — editar ficheiros e terminal" side="right" maxWidth="17rem">
        <button
          type="button"
          className={`${iconBtn} ${workbenchMode === 'ide' ? iconBtnActive : ''}`}
          aria-label="Modo IDE"
          aria-pressed={workbenchMode === 'ide'}
          onClick={() => onWorkbenchModeChange('ide')}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="stroke-current"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M8 3h8l4 4v14H4V7l4-4z" />
            <path d="M12 3v4h4" />
            <path d="M8 13h8" />
            <path d="M8 17h5" />
          </svg>
        </button>
      </Tooltip>

      <div className="my-1 h-px w-6 bg-line" aria-hidden />

      <Tooltip label="Ir ao fim e focar o compositor" side="right" maxWidth="16rem">
        <button
          type="button"
          className={`${iconBtn} ${workbenchMode === 'chat' ? 'text-accent' : ''}`}
          aria-label="Ir ao fim da conversa e focar o campo de mensagem"
          onClick={onFocusCurrentChat}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="stroke-current"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 5v14" />
            <path d="m6 11 6 6 6-6" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip
        label={memoriesOpen ? 'Fechar memórias' : 'Memórias guardadas'}
        side="right"
      >
        <button
          type="button"
          className={`${iconBtn} ${memoriesOpen ? iconBtnActive : ''}`}
          aria-label="Memórias da Luna"
          aria-expanded={memoriesOpen}
          aria-pressed={memoriesOpen}
          onClick={onToggleMemories}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="stroke-current"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <path d="M8 7h8" />
            <path d="M8 11h8" />
            <path d="M8 15h4" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip
        label={historyOpen ? 'Fechar histórico' : 'Conversas anteriores'}
        side="right"
      >
        <button
          type="button"
          className={`${iconBtn} ${historyOpen ? iconBtnActive : ''}`}
          aria-label="Ver conversas antigas"
          aria-expanded={historyOpen}
          aria-pressed={historyOpen}
          onClick={onToggleHistory}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="stroke-current"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M8 6h13" />
            <path d="M8 12h13" />
            <path d="M8 18h13" />
            <path d="M3 6h.01" />
            <path d="M3 12h.01" />
            <path d="M3 18h.01" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip label="Nova conversa" side="right">
        <button
          type="button"
          className={iconBtn}
          aria-label="Começar conversa nova"
          onClick={onNewChat}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="stroke-current"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </Tooltip>
    </aside>
  )
}
