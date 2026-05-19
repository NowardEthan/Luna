import type { ChatFolder, Conversation } from '../../types/chat'
import { requestConfirm } from '../../lib/confirm'
import { Select } from '../../ui/Select'
import { formatUpdated, rowShell } from './utils'

type Props = {
  conversation: Conversation
  folders: ChatFolder[]
  activeId: string | null
  editing: boolean
  titleDraft: string
  onTitleDraftChange: (v: string) => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onRenameCommit: () => void
  onRenameCancel: () => void
  onStartRename: (c: Conversation) => void
  onMoveConversation: (id: string, folderId: string | null) => void
  onTogglePin?: (id: string) => void
}

export function ConversationListRow({
  conversation: c,
  folders,
  activeId,
  editing,
  titleDraft,
  onTitleDraftChange,
  onSelect,
  onDelete,
  onRenameCommit,
  onRenameCancel,
  onStartRename,
  onMoveConversation,
  onTogglePin,
}: Props) {
  const sel = c.id === activeId

  return (
    <li>
      <div className={rowShell(sel)}>
        <div className="flex min-h-[3rem] items-stretch">
          <button
            type="button"
            onClick={() => onSelect(c.id)}
            aria-current={sel ? 'page' : undefined}
            className="min-w-0 flex-1 px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
          >
            {editing ? (
              <input
                value={titleDraft}
                onChange={(e) => onTitleDraftChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={() => onRenameCommit()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onRenameCommit()
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    onRenameCancel()
                  }
                }}
                className="mb-0.5 w-full rounded border border-line bg-canvas px-1.5 py-0.5 text-[12px] text-fg focus:outline-none focus:ring-1 focus:ring-focus"
                autoFocus
                maxLength={120}
                aria-label="Novo título da conversa"
              />
            ) : (
              <span className="block truncate text-[12px] font-medium leading-tight text-fg">
                {c.title}
              </span>
            )}
            <span className="mt-0.5 block truncate text-[10px] text-fg-muted">
              {formatUpdated(c.updatedAt)}
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-px border-l border-line/60 pr-0.5">
            {onTogglePin ? (
              <button
                type="button"
                className={`rounded p-1.5 transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                  c.pinned ? 'text-accent' : 'text-fg-muted hover:text-fg'
                }`}
                title={c.pinned ? 'Desafixar' : 'Fixar no topo'}
                aria-label={c.pinned ? 'Desafixar conversa' : 'Fixar conversa'}
                onClick={(e) => {
                  e.stopPropagation()
                  onTogglePin(c.id)
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={c.pinned ? 'currentColor' : 'none'} className="stroke-current" strokeWidth="2" aria-hidden>
                  <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6Z" strokeLinejoin="round" />
                </svg>
              </button>
            ) : null}
            <button
              type="button"
              className="rounded p-1.5 text-fg-muted transition-colors hover:bg-white/[0.07] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              title={editing ? 'Salvar nome' : 'Renomear conversa'}
              aria-label={editing ? 'Salvar nome da conversa' : 'Renomear conversa'}
              onMouseDown={(e) => {
                if (editing) e.preventDefault()
              }}
              onClick={(e) => {
                e.stopPropagation()
                if (editing) onRenameCommit()
                else onStartRename(c)
              }}
            >
              {editing ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2" aria-hidden>
                  <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2" aria-hidden>
                  <path d="M12 20h9" strokeLinecap="round" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <button
              type="button"
              className="rounded p-1.5 text-fg-muted transition-colors hover:bg-white/[0.07] hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              title="Apagar conversa"
              aria-label={`Apagar conversa: ${c.title}`}
              onClick={(e) => {
                e.stopPropagation()
                void (async () => {
                  const ok = await requestConfirm({
                    title: 'Apagar conversa',
                    message: `Apagar «${c.title}»? Esta acção não pode ser desfeita.`,
                    confirmLabel: 'Apagar',
                    destructive: true,
                  })
                  if (ok) onDelete(c.id)
                })()
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2" aria-hidden>
                <path d="M3 6h18" strokeLinecap="round" />
                <path d="M8 6V4h8v2" strokeLinecap="round" />
                <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <label className="flex items-center gap-1.5 border-t border-line/50 px-2 py-1">
          <span className="shrink-0 text-[9px] uppercase tracking-wide text-fg-muted">
            Pasta
          </span>
          <div
            className="min-w-0 flex-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Select
              value={c.folderId ?? ''}
              onChange={(v) => onMoveConversation(c.id, v === '' ? null : v)}
              options={[
                { value: '', label: 'Sem pasta' },
                ...folders.map((f) => ({ value: f.id, label: f.name })),
              ]}
              size="sm"
              variant="ghost"
              className="w-full"
              align="end"
              aria-label={`Mover conversa para pasta: ${c.title}`}
            />
          </div>
        </label>
      </div>
    </li>
  )
}
