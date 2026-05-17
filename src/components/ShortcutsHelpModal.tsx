type ShortcutRow = { keys: string; action: string }

const ROWS: ShortcutRow[] = [
  { keys: 'Ctrl+Enter', action: 'Enviar mensagem' },
  { keys: 'Ctrl+N', action: 'Nova conversa' },
  { keys: 'Ctrl+Shift+L', action: 'Abrir/fechar histórico' },
  { keys: 'Ctrl+Shift+M', action: 'Abrir/fechar memórias' },
  { keys: 'Ctrl+.', action: 'Alternar Chat / IDE' },
  { keys: 'Ctrl+K', action: 'Paleta de comandos' },
  { keys: '?', action: 'Esta ajuda' },
  { keys: 'Escape', action: 'Fechar painéis e diálogos' },
]

type Props = {
  open: boolean
  onClose: () => void
}

export function ShortcutsHelpModal({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="shortcuts-title"
        className="w-full max-w-md rounded-xl border border-line bg-surface p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="shortcuts-title" className="text-title font-semibold text-fg">
          Atalhos de teclado
        </h2>
        <table className="mt-3 w-full text-ui">
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.keys} className="border-t border-line/60 first:border-0">
                <td className="py-2 pr-3 font-mono text-fg-dim">{r.keys}</td>
                <td className="py-2 text-fg">{r.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          className="mt-4 w-full rounded-lg border border-line py-2 text-ui text-fg-dim hover:bg-white/[0.05]"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
