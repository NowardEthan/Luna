import { useCallback, useMemo, useState } from 'react'
import type { ChatFolder, Conversation } from '../types/chat'
import { requestConfirm } from '../lib/confirm'
import { ConversationListRow } from '../features/history/ConversationListRow'
import { matchesSearch, sortConversations } from '../features/history/utils'
import { EmptyState } from '../ui/EmptyState'

type Props = {
  open: boolean
  /** Dentro de ResizableSplit — ocupa 100% da largura do painel. */
  embedded?: boolean
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

export function HistoryPanel({
  open,
  embedded = false,
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
    return (
      <ConversationListRow
        key={c.id}
        conversation={c}
        folders={folders}
        activeId={activeId}
        editing={editingConvoId === c.id}
        titleDraft={convoTitleDraft}
        onTitleDraftChange={setConvoTitleDraft}
        onSelect={onSelect}
        onDelete={onDelete}
        onRenameCommit={commitRenameConvo}
        onRenameCancel={cancelRenameConvo}
        onStartRename={startRenameConvo}
        onMoveConversation={onMoveConversation}
        onTogglePin={onTogglePin}
      />
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
      className={
        embedded
          ? `relative flex h-full w-full flex-col overflow-hidden bg-sidebar ${
              open ? 'luna-sidebar-panel-enter' : 'pointer-events-none opacity-0'
            }`
          : `relative flex shrink-0 flex-col overflow-hidden border-r border-line bg-sidebar transition-[width] duration-200 ease-out max-md:fixed max-md:inset-y-0 max-md:left-11 max-md:z-40 max-md:shadow-xl ${
              open
                ? 'w-[288px]'
                : 'w-0 border-r-0 pointer-events-none max-md:translate-x-[-100%]'
            }`
      }
      aria-hidden={!open}
      aria-label="Conversas anteriores"
    >
      <div
        className={`flex size-full flex-col transition-opacity duration-150 ${
          embedded
            ? open
              ? 'opacity-100'
              : 'opacity-0'
            : open
              ? 'min-w-[288px] opacity-100'
              : 'min-w-0 opacity-0'
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
            <EmptyState
              title="Ainda não há conversas"
              description="Comece uma nova conversa com a Luna. As conversas ficam guardadas neste computador."
              action={
                <button
                  type="button"
                  className="luna-btn-primary mt-1 px-3 py-1.5 text-ui"
                  onClick={() => onNewConversation()}
                >
                  Nova conversa
                </button>
              }
            />
          ) : q && !anyVisible ? (
            <EmptyState
              title="Nenhum resultado"
              description="Tente outro termo na pesquisa ou limpe o filtro."
            />
          ) : null}
        </div>
      </div>
    </aside>
    </>
  )
}
