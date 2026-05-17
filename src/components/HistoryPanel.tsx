import { useCallback, useMemo, useState } from 'react'
import type { ChatFolder, Conversation } from '../types/chat'
import { requestConfirm } from '../lib/confirm'
import { Select } from './ui/Select'

function formatUpdated(ts: number) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(ts)
}

type Props = {
  open: boolean
  conversations: Conversation[]
  folders: ChatFolder[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  /** Sem argumento = nova conversa fora de pastas; id = dentro da pasta */
  onNewConversation: (inFolderId?: string) => void
  onRenameConversation: (id: string, title: string) => void
  onMoveConversation: (id: string, folderId: string | null) => void
  onCreateFolder: (name: string) => void
  onRenameFolder: (id: string, name: string) => void
  onDeleteFolder: (id: string) => void
  onTogglePin?: (id: string) => void
  onClose?: () => void
}

function sortConversations(list: Conversation[]) {
  return [...list].sort((a, b) => {
    const ap = a.pinned ? 1 : 0
    const bp = b.pinned ? 1 : 0
    if (ap !== bp) return bp - ap
    return b.updatedAt - a.updatedAt
  })
}

function matchesSearch(c: Conversation, q: string): boolean {
  if (!q) return true
  const last = [...c.messages].reverse().find((m) => m.role === 'user' || m.role === 'assistant')
  const preview = last?.text?.slice(0, 200) ?? ''
  return (
    c.title.toLowerCase().includes(q) ||
    preview.toLowerCase().includes(q)
  )
}

const rowShell = (selected: boolean) =>
  `flex flex-col rounded-md ring-1 transition-colors ${
    selected
      ? 'bg-accent/10 ring-accent/30'
      : 'ring-transparent hover:bg-white/[0.03] hover:ring-line'
  }`

export function HistoryPanel({
  open,
  conversations,
  folders,
  activeId,
  onSelect,
  onDelete,
  onNewConversation,
  onRenameConversation,
  onMoveConversation,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onTogglePin,
  onClose,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [addingFolder, setAddingFolder] = useState(false)
  const [newFolderDraft, setNewFolderDraft] = useState('')
  const [editingConvoId, setEditingConvoId] = useState<string | null>(null)
  const [convoTitleDraft, setConvoTitleDraft] = useState('')
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [folderNameDraft, setFolderNameDraft] = useState('')

  const toggleFolderCollapsed = useCallback((id: string) => {
    setCollapsedFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const q = searchQuery.trim().toLowerCase()

  const rootConversations = useMemo(
    () =>
      sortConversations(
        conversations.filter((c) => c.folderId == null && matchesSearch(c, q)),
      ),
    [conversations, q],
  )

  const conversationsInFolder = useCallback(
    (folderId: string) =>
      sortConversations(
        conversations.filter(
          (c) => c.folderId === folderId && matchesSearch(c, q),
        ),
      ),
    [conversations, q],
  )

  const anyVisible = useMemo(
    () => conversations.some((c) => matchesSearch(c, q)),
    [conversations, q],
  )

  const startRenameConvo = useCallback((c: Conversation) => {
    setEditingConvoId(c.id)
    setConvoTitleDraft(c.title)
  }, [])

  const commitRenameConvo = useCallback(() => {
    if (!editingConvoId) return
    onRenameConversation(editingConvoId, convoTitleDraft)
    setEditingConvoId(null)
  }, [editingConvoId, convoTitleDraft, onRenameConversation])

  const cancelRenameConvo = useCallback(() => {
    setEditingConvoId(null)
  }, [])

  const startRenameFolder = useCallback((f: ChatFolder) => {
    setEditingFolderId(f.id)
    setFolderNameDraft(f.name)
  }, [])

  const cancelRenameFolder = useCallback(() => {
    setEditingFolderId(null)
  }, [])

  const commitRenameFolder = useCallback(() => {
    if (!editingFolderId) return
    const n = folderNameDraft.replace(/\s+/g, ' ').trim()
    if (n.length) onRenameFolder(editingFolderId, n)
    setEditingFolderId(null)
  }, [editingFolderId, folderNameDraft, onRenameFolder])

  function renderConversationRow(c: Conversation) {
    const sel = c.id === activeId
    const editing = editingConvoId === c.id
    return (
      <li key={c.id}>
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
                  value={convoTitleDraft}
                  onChange={(e) => setConvoTitleDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => commitRenameConvo()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitRenameConvo()
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      cancelRenameConvo()
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
                  if (editing) commitRenameConvo()
                  else startRenameConvo(c)
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

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-label="Fechar histórico"
          onClick={onClose}
        />
      ) : null}
    <aside
      className={`relative flex shrink-0 flex-col overflow-hidden border-r border-line bg-sidebar transition-[width] duration-200 ease-out max-md:fixed max-md:inset-y-0 max-md:left-11 max-md:z-40 max-md:shadow-xl ${
        open
          ? 'w-[288px]'
          : 'w-0 border-r-0 pointer-events-none max-md:translate-x-[-100%]'
      }`}
      aria-hidden={!open}
      aria-label="Conversas anteriores"
    >
      <div
        className={`flex size-full flex-col transition-opacity duration-150 ${
          open ? 'min-w-[288px] opacity-100' : 'min-w-0 opacity-0'
        }`}
      >
        <div className="flex shrink-0 flex-col gap-1.5 border-b border-line px-2.5 py-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Procurar conversas…"
            className="w-full rounded-md border border-line bg-canvas px-2 py-1.5 text-ui text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-focus"
            aria-label="Procurar conversas"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[12px] font-medium text-fg-dim">
              Histórico
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onNewConversation()}
                className="rounded-md px-2 py-0.5 text-[11px] text-accent hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                + Nova
              </button>
            </div>
          </div>
          {addingFolder ? (
            <div className="flex gap-1">
              <input
                value={newFolderDraft}
                onChange={(e) => setNewFolderDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (!newFolderDraft.trim()) return
                    onCreateFolder(newFolderDraft)
                    setNewFolderDraft('')
                    setAddingFolder(false)
                  }
                  if (e.key === 'Escape') {
                    setNewFolderDraft('')
                    setAddingFolder(false)
                  }
                }}
                placeholder="Nome da pasta"
                className="min-w-0 flex-1 rounded border border-line bg-canvas px-2 py-1 text-[11px] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-focus"
                autoFocus
                maxLength={80}
                aria-label="Nome da nova pasta"
              />
              <button
                type="button"
                className="shrink-0 rounded border border-line bg-raised px-2 py-1 text-[11px] text-fg hover:bg-raised-hover"
                onClick={() => {
                  if (!newFolderDraft.trim()) return
                  onCreateFolder(newFolderDraft)
                  setNewFolderDraft('')
                  setAddingFolder(false)
                }}
              >
                Criar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingFolder(true)}
              className="w-full rounded-md border border-dashed border-line/80 py-1.5 text-[11px] text-fg-muted transition-colors hover:border-accent/35 hover:bg-white/[0.03] hover:text-fg-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              + Nova pasta
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          <ul className="flex flex-col gap-2">
            {folders.map((folder) => {
              const collapsed = collapsedFolderIds.has(folder.id)
              const inFolder = conversationsInFolder(folder.id)
              const editingFolder = editingFolderId === folder.id
              return (
                <li key={folder.id}>
                  <div className="rounded-md ring-1 ring-line/80 bg-white/[0.02]">
                    <div className="flex items-center gap-0.5 px-1 py-1">
                      <button
                        type="button"
                        onClick={() => toggleFolderCollapsed(folder.id)}
                        className="flex size-7 shrink-0 items-center justify-center rounded text-fg-muted hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        aria-expanded={!collapsed}
                        aria-label={collapsed ? 'Expandir pasta' : 'Recolher pasta'}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          className={`stroke-current transition-transform ${collapsed ? '-rotate-90' : ''}`}
                          strokeWidth="2"
                          aria-hidden
                        >
                          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <div className="min-w-0 flex-1">
                        {editingFolder ? (
                          <input
                            value={folderNameDraft}
                            onChange={(e) => setFolderNameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                commitRenameFolder()
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault()
                                cancelRenameFolder()
                              }
                            }}
                            onBlur={() => commitRenameFolder()}
                            className="w-full rounded border border-line bg-canvas px-1.5 py-0.5 text-[12px] font-medium text-fg focus:outline-none focus:ring-1 focus:ring-focus"
                            autoFocus
                            maxLength={80}
                            aria-label="Renomear pasta"
                          />
                        ) : (
                          <p className="truncate px-0.5 text-left text-[12px] font-semibold text-fg-dim">
                            {folder.name}
                          </p>
                        )}
                        <p className="truncate px-0.5 text-[9px] text-fg-muted">
                          {inFolder.length} conversa{inFolder.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          if (editingFolder) e.preventDefault()
                        }}
                        onClick={() =>
                          editingFolder ? commitRenameFolder() : startRenameFolder(folder)
                        }
                        className="flex size-7 shrink-0 items-center justify-center rounded text-fg-muted hover:bg-white/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        title="Renomear pasta"
                        aria-label={`Renomear pasta ${folder.name}`}
                      >
                        {editingFolder ? (
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
                        onClick={() => onNewConversation(folder.id)}
                        className="flex size-7 shrink-0 items-center justify-center rounded text-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        title="Nova conversa nesta pasta"
                        aria-label={`Nova conversa na pasta ${folder.name}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2" aria-hidden>
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void (async () => {
                            const ok = await requestConfirm({
                              title: 'Excluir pasta',
                              message: `Excluir a pasta «${folder.name}»? As conversas serão movidas para «Sem pasta».`,
                              confirmLabel: 'Excluir',
                              destructive: true,
                            })
                            if (ok) onDeleteFolder(folder.id)
                          })()
                        }}
                        className="flex size-7 shrink-0 items-center justify-center rounded text-fg-muted hover:bg-white/[0.07] hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        title="Excluir pasta"
                        aria-label={`Excluir pasta ${folder.name}`}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2" aria-hidden>
                          <path d="M3 6h18" strokeLinecap="round" />
                          <path d="M8 6V4h8v2" strokeLinecap="round" />
                          <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                    {!collapsed ? (
                      inFolder.length ? (
                        <ul className="space-y-1 border-t border-line/50 p-1 pt-1.5">
                          {inFolder.map((c) => renderConversationRow(c))}
                        </ul>
                      ) : (
                        <p className="border-t border-line/50 px-2 py-2 text-[10px] text-fg-muted">
                          Nenhuma conversa aqui — use + ao lado do nome da pasta.
                        </p>
                      )
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="mt-3">
            <p className="mb-1 px-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
              Sem pasta
            </p>
            <ul className="flex flex-col gap-px">
              {rootConversations.map((c) => renderConversationRow(c))}
            </ul>
          </div>

          {!conversations.length ? (
            <p className="mt-8 px-2 text-center text-[11px] text-fg-muted">
              Ainda não há conversas salvas.
            </p>
          ) : q && !anyVisible ? (
            <p className="mt-8 px-2 text-center text-[11px] text-fg-muted">
              Nenhuma conversa encontrada.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
    </>
  )
}
