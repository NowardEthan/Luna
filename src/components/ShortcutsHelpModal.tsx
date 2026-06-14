import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

type ShortcutRow = { keys: string; actionKey: string }

const ROW_DEFS: ShortcutRow[] = [
  { keys: 'Ctrl+Enter', actionKey: 'shortcuts.send_message' },
  { keys: 'Ctrl+N', actionKey: 'shortcuts.new_chat' },
  { keys: 'Ctrl+Shift+L', actionKey: 'shortcuts.toggle_history' },
  { keys: 'Ctrl+Shift+M', actionKey: 'shortcuts.toggle_memories' },
  { keys: 'Ctrl+Shift+T', actionKey: 'shortcuts.cycle_theme' },
  { keys: 'Ctrl+.', actionKey: 'shortcuts.toggle_chat_ide' },
  { keys: 'Ctrl+K', actionKey: 'shortcuts.command_palette' },
  { keys: '?', actionKey: 'shortcuts.this_help' },
  { keys: 'Escape', actionKey: 'shortcuts.escape' },
]

type Props = {
  open: boolean
  onClose: () => void
}

export function ShortcutsHelpModal({ open, onClose }: Props) {
  const { t } = useTranslation()
  const rows = useMemo(
    () => ROW_DEFS.map((r) => ({ keys: r.keys, action: t(r.actionKey) })),
    [t],
  )

  if (!open) return null

  return (
    <div
      className="luna-overlay-scrim fixed inset-0 z-[85] flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="shortcuts-title"
        className="luna-dialog w-full max-w-md p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="shortcuts-title" className="text-title font-semibold text-fg">
          {t('shortcuts.title')}
        </h2>
        <table className="mt-3 w-full text-ui">
          <tbody>
            {rows.map((r) => (
              <tr key={r.keys} className="luna-hover-row border-t border-line first:border-0">
                <td className="py-2 pr-3 font-mono text-fg-dim">{r.keys}</td>
                <td className="py-2 text-fg">{r.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          className="luna-btn-secondary mt-4 w-full py-2"
          onClick={onClose}
        >
          {t('shortcuts.close')}
        </button>
      </div>
    </div>
  )
}
