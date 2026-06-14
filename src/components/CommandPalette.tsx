import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

export type CommandItem = {
  id: string
  label: string
  keywords?: string
  run: () => void
}

type Props = {
  open: boolean
  onClose: () => void
  commands: CommandItem[]
}

export function CommandPalette({ open, onClose, commands }: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setQuery('')
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords?.toLowerCase().includes(q),
    )
  }, [commands, query])

  if (!open) return null

  const closeAndReset = () => {
    setQuery('')
    onClose()
  }

  return (
    <div
      className="luna-overlay-scrim fixed inset-0 z-[88] flex items-start justify-center pt-[12vh] p-4"
      role="presentation"
      onClick={closeAndReset}
    >
      <div
        role="dialog"
        aria-label={t('commandPalette.aria')}
        className="luna-dialog w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="search"
          autoFocus
          placeholder={t('commandPalette.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border-b border-line bg-transparent px-4 py-3 text-body text-fg placeholder:text-fg-muted focus:outline-none"
        />
        <ul className="max-h-64 overflow-y-auto py-1">
          {filtered.length ? (
            filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-ui text-fg hover:bg-surface"
                  onClick={() => {
                    c.run()
                    closeAndReset()
                  }}
                >
                  {c.label}
                </button>
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-ui text-fg-muted">{t('commandPalette.empty')}</li>
          )}
        </ul>
      </div>
    </div>
  )
}
