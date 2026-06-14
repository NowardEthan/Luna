import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { useLunaBadgeNav } from '../context/LunaBadgeNavigation'
import { isEditableTarget } from '../lib/keyboard'

import type {
  ChatFolder,
  Conversation,
  ConversationSourceMode,
} from '../types/chat'
import { filterConversationsForScope } from '../lib/workspaceSessions'

import { ConversationListRow } from '../features/history/ConversationListRow'

import { FolderTreeNodeView } from '../features/history/FolderTreeNode'

import type { FolderUpdatePatch } from '../features/chat/state/folderStore'

import {
  buildFolderTree,
  collectAllTags,
  countConversationsInSubtree,
  getFolderAncestorIds,
  type FolderTreeNode,
} from '../features/history/folderTree'
import { useHistoryPanelCompact } from '../features/history/useHistoryPanelCompact'

import {

  historyDropZoneAttrs,

  historyDropZoneClass,

  useConversationDragDrop,

} from '../features/history/useConversationDragDrop'

import { matchesHistoryFilters, sortConversations } from '../features/history/utils'
import { FolderSettingsModal } from '../features/history/FolderSettingsModal'
import { HistoryBulkActionsBar } from '../features/history/HistoryBulkActionsBar'
import {
  conversationIdsForBulkDelete,
  useHistorySelection,
} from '../features/history/useHistorySelection'
import { requestConfirm } from '../lib/confirm'
import { EmptyState } from '../ui/EmptyState'
import { useTranslation } from 'react-i18next'



type Props = {

  open: boolean

  embedded?: boolean

  conversations: Conversation[]

  folders: ChatFolder[]

  activeId: string | null

  onSelect: (id: string) => void

  onDelete: (id: string) => void

  onNewConversation: (inFolderId?: string) => void

  onRenameConversation: (id: string, title: string) => void

  onMoveConversation: (id: string, folderId: string | null) => void

  onSetConversationTags?: (id: string, tags: string[]) => void

  onCreateFolder: (name: string, parentId?: string | null) => void

  onRenameFolder: (id: string, name: string) => void

  onUpdateFolder?: (id: string, patch: FolderUpdatePatch) => void

  onDeleteFolder: (id: string) => void

  onTogglePin?: (id: string) => void

  cloudSyncAvailable?: boolean

  onSetConversationCloudEnabled?: (id: string, enabled: boolean) => void

  onSetFolderCloudEnabled?: (id: string, enabled: boolean) => void

  onClose?: () => void

  /** Filtra conversas por universo (chat geral vs workspace IDE). */
  conversationScope?: {
    mode: ConversationSourceMode
    workspaceRoot?: string | null
  }

  /** IDE: lista plana sem pastas de histórico. */
  flatList?: boolean

  header?: ReactNode

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

  onSetConversationTags,

  onCreateFolder,

  onRenameFolder,

  onUpdateFolder,

  onDeleteFolder,

  onTogglePin,

  cloudSyncAvailable = false,

  onSetConversationCloudEnabled,

  onSetFolderCloudEnabled,

  onClose,

  conversationScope,

  flatList = false,

  header,

}: Props) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')

  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([])

  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(

    () => new Set(),

  )

  const [addingFolder, setAddingFolder] = useState(false)

  const [newFolderDraft, setNewFolderDraft] = useState('')

  const [editingConvoId, setEditingConvoId] = useState<string | null>(null)

  const [convoTitleDraft, setConvoTitleDraft] = useState('')

  const [settingsFolderId, setSettingsFolderId] = useState<string | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const { ref: panelMeasureRef } = useHistoryPanelCompact()
  const badgeNav = useLunaBadgeNav()

  const scopedConversations = useMemo(() => {
    if (!conversationScope) return conversations
    return filterConversationsForScope(
      conversations,
      conversationScope.mode,
      conversationScope.workspaceRoot,
    )
  }, [conversations, conversationScope])

  const selection = useHistorySelection(
    flatList ? [] : folders,
    scopedConversations,
  )
  const settingsFolder =
    settingsFolderId != null
      ? folders.find((f) => f.id === settingsFolderId) ?? null
      : null



  useEffect(() => {

    if (!open) return

    const id = window.requestAnimationFrame(() => searchRef.current?.focus())

    return () => window.cancelAnimationFrame(id)

  }, [open])

  useEffect(() => {
    const highlight = badgeNav?.highlight
    if (!open || highlight?.type !== 'folder') return
    const folderId = highlight.folderId
    const expandIds = getFolderAncestorIds(folderId, folders)
    setCollapsedFolderIds((prev) => {
      const next = new Set(prev)
      for (const id of expandIds) next.delete(id)
      return next
    })
  }, [badgeNav?.highlight, folders, open])



  const toggleFolderCollapsed = useCallback((id: string) => {

    setCollapsedFolderIds((prev) => {

      const next = new Set(prev)

      if (next.has(id)) next.delete(id)

      else next.add(id)

      return next

    })

  }, [])



  const q = searchQuery.trim().toLowerCase()

  const folderTree = useMemo(
    () => (flatList ? [] : buildFolderTree(folders)),
    [folders, flatList],
  )

  const allTags = useMemo(
    () => collectAllTags(scopedConversations),
    [scopedConversations],
  )



  const filterConvo = useCallback(

    (c: Conversation) => matchesHistoryFilters(c, q, activeTagFilters),

    [q, activeTagFilters],

  )



  const rootConversations = useMemo(

    () =>

      sortConversations(

        scopedConversations.filter((c) => c.folderId == null && filterConvo(c)),

      ),

    [scopedConversations, filterConvo],

  )



  const conversationsInFolder = useCallback(

    (folderId: string) =>

      sortConversations(

        scopedConversations.filter(

          (c) => c.folderId === folderId && filterConvo(c),

        ),

      ),

    [scopedConversations, filterConvo],

  )



  const anyVisible = useMemo(

    () => scopedConversations.some((c) => filterConvo(c)),

    [scopedConversations, filterConvo],

  )



  const toggleTagFilter = useCallback((tag: string) => {

    setActiveTagFilters((prev) =>

      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],

    )

  }, [])



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



  const handleUpdateFolder = useCallback(

    (id: string, patch: FolderUpdatePatch) => {

      if (onUpdateFolder) {

        onUpdateFolder(id, patch)

        return

      }

      if (patch.name) onRenameFolder(id, patch.name)

    },

    [onRenameFolder, onUpdateFolder],

  )



  const getCurrentFolderId = useCallback(

    (conversationId: string) =>

      conversations.find((c) => c.id === conversationId)?.folderId ?? null,

    [conversations],

  )



  const dragEnabled =
    !q &&
    activeTagFilters.length === 0 &&
    editingConvoId === null &&
    !selection.selectionMode

  const visibleConversationIds = useMemo(
    () => scopedConversations.filter(filterConvo).map((c) => c.id),
    [conversations, filterConvo],
  )

  const handleBulkDelete = useCallback(() => {
    void (async () => {
      const convoIds = conversationIdsForBulkDelete(
        selection.selectedConversationIds,
        selection.selectedFolderIds,
        folders,
        conversations,
      )
      const folderCount = selection.selectedFolderIds.size
      const convoCount = convoIds.length
      if (!folderCount && !convoCount) return
      const ok = await requestConfirm({
        title: t('history.delete_selected'),
        message: [
          convoCount ? `${convoCount} conversa${convoCount === 1 ? '' : 's'}` : null,
          folderCount ? `${folderCount} pasta${folderCount === 1 ? '' : 's'}` : null,
        ]
          .filter(Boolean)
          .join(' e ') + '? ' + t('history.delete_warning'),
        confirmLabel: t('history.delete'),
        destructive: true,
      })
      if (!ok) return
      for (const id of convoIds) onDelete(id)
      for (const id of selection.folderIdsToDeleteOrdered) onDeleteFolder(id)
      selection.exitSelectionMode()
    })()
  }, [conversations, folders, onDelete, onDeleteFolder, selection])

  const revealFolderPath = useCallback((folderId: string) => {
    setCollapsedFolderIds((prev) => {
      const next = new Set(prev)
      let current: string | null = folderId
      const seen = new Set<string>()
      while (current) {
        if (seen.has(current)) break
        seen.add(current)
        next.delete(current)
        const f = folders.find((x) => x.id === current)
        current = f?.parentId ?? null
      }
      return next
    })
  }, [folders])

  const handleMoveConversation = useCallback(
    (conversationId: string, folderId: string | null) => {
      onMoveConversation(conversationId, folderId)
      if (folderId) revealFolderPath(folderId)
    },
    [onMoveConversation, revealFolderPath],
  )

  const handleBulkMove = useCallback(
    (folderId: string | null) => {
      for (const id of selection.selectedConversationIds) {
        handleMoveConversation(id, folderId)
      }
      selection.clearSelection()
    },
    [handleMoveConversation, selection],
  )

  useEffect(() => {
    if (!open) return
    const active = conversations.find((c) => c.id === activeId)
    if (active?.folderId) revealFolderPath(active.folderId)
  }, [activeId, open, conversations, revealFolderPath])

  const {

    draggingId,

    isDragging,

    ghost,

    gripPointerDown,

    isDropActive,

  } = useConversationDragDrop(

    handleMoveConversation,

    getCurrentFolderId,

    revealFolderPath,

  )



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

        onMoveConversation={handleMoveConversation}

        onSetConversationTags={onSetConversationTags}

        onTogglePin={onTogglePin}
        cloudSyncAvailable={cloudSyncAvailable}
        onSetConversationCloudEnabled={onSetConversationCloudEnabled}
        selectionMode={selection.selectionMode}
        selected={selection.isConversationSelected(c.id)}
        onToggleSelect={() => selection.toggleConversation(c.id)}

        isDragging={draggingId === c.id}

        dragSessionActive={isDragging}

        onGripPointerDown={

          dragEnabled ? gripPointerDown(c.id, c.title) : undefined

        }

      />

    )

  }



  function renderFolderNode(node: FolderTreeNode, depth: number) {

    const inFolder = conversationsInFolder(node.id)
    const subtreeCount = countConversationsInSubtree(node, conversations)

    const childFolders = node.children.map((child) =>

      renderFolderNode(child, depth + 1),

    )



    return (

      <FolderTreeNodeView

        key={node.id}

        node={node}

        depth={depth}

        collapsed={collapsedFolderIds.has(node.id)}

        onToggleCollapsed={toggleFolderCollapsed}

        conversationCount={inFolder.length}

        subtreeCount={subtreeCount}

        selectionMode={selection.selectionMode}

        folderSelected={selection.isFolderSelected(node.id)}

        onToggleFolderSelect={() => selection.toggleFolder(node.id)}

        onOpenSettings={() => setSettingsFolderId(node.id)}

        onNewConversation={onNewConversation}

        onDeleteFolder={onDeleteFolder}

        cloudSyncAvailable={cloudSyncAvailable}

        onSetFolderCloudEnabled={onSetFolderCloudEnabled}

        folders={folders}

        conversations={conversations}

        dragEnabled={dragEnabled}

        isDragging={isDragging}

        isDropActive={isDropActive}

        childrenContent={

          <>

            {inFolder.length ? (

              <ul className="space-y-1">

                {inFolder.map((c) => renderConversationRow(c))}

              </ul>

            ) : dragEnabled && isDragging ? (
              <p className="px-2 py-3 text-center text-[10px] font-medium text-current/85">
                {t('history.drop_here')}
              </p>
            ) : null}

            {childFolders.length ? (

              <ul className="mt-1 flex flex-col gap-2">{childFolders}</ul>

            ) : null}

          </>

        }

      />

    )

  }



  return (

    <>

      {open && !embedded ? (

        <button

          type="button"
          className="luna-overlay-scrim fixed inset-0 z-30 md:hidden"
          aria-label={t('history.close_aria')}
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
        aria-label={t('history.panel_aria')}
        onKeyDownCapture={(e) => {

          if (!isEditableTarget(e.target)) return

          if (e.key === ' ' || e.code === 'Space') {

            e.stopPropagation()

          }

        }}

      >

        <div

          ref={panelMeasureRef}
        className={`flex size-full min-w-0 flex-col transition-opacity duration-150 ${

            embedded

              ? open

                ? 'opacity-100'

                : 'opacity-0'

              : open

                ? 'min-w-[288px] opacity-100'

                : 'min-w-0 opacity-0'

          }`}

        >

          {header ? <div className="shrink-0">{header}</div> : null}

          <div className="flex shrink-0 flex-col gap-1.5 px-2.5 py-2">

            <input
              ref={searchRef}
              id="luna-history-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('history.search_placeholder')}
              className="w-full rounded-full border border-line-subtle bg-surface px-3 py-1.5 text-ui text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all duration-200"
              aria-label={t('history.search_aria')}
              autoComplete="off"
            />

            {allTags.length ? (
              <div className="flex flex-wrap gap-1" role="group" aria-label={t('history.filter_aria')}>
                {allTags.map((tag) => {

                  const active = activeTagFilters.includes(tag)

                  return (

                    <button

                      key={tag}

                      type="button"

                      aria-pressed={active}

                      onClick={() => toggleTagFilter(tag)}

                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${

                        active

                          ? 'bg-accent-muted text-accent'

                          : 'bg-raised text-fg-muted hover:bg-raised-hover hover:text-fg-dim'

                      }`}

                    >

                      #{tag}

                    </button>

                  )

                })}

                {activeTagFilters.length ? (

                  <button

                    type="button"

                    className="rounded-full px-2 py-0.5 text-[10px] text-fg-muted underline-offset-2 hover:text-fg hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"

                    onClick={() => setActiveTagFilters([])}
                  >
                    {t('history.clear')}
                  </button>
                ) : null}

              </div>

            ) : null}

            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="truncate text-[12px] font-medium text-fg-dim">
                {t('history.title')}
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                {selection.selectionMode ? (
                  <>
                    <button type="button" onClick={() => selection.selectAllVisible(visibleConversationIds, [])} className="rounded-md px-2 py-1 text-[10px] text-fg-muted hover:bg-raised-hover hover:text-accent transition-colors">{t('history.select_all')}</button>
                    <button type="button" onClick={selection.toggleSelectionMode} className="rounded-md px-2 py-1 text-[10px] text-accent hover:bg-raised-hover transition-colors">{t('history.done')}</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={selection.toggleSelectionMode} className="rounded-md px-2 py-1 text-[10px] text-fg-muted hover:bg-raised-hover hover:text-accent transition-colors">{t('history.select')}</button>
                  </>
                )}
              </div>

            </div>

            {addingFolder ? (

              <div className="flex gap-1 mt-1">

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

                  placeholder={t('history.panelFolderPlaceholder')}

                  className="min-w-0 flex-1 rounded border border-line bg-canvas px-2 py-1 text-[11px] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-focus"

                  autoFocus

                  maxLength={80}

                  aria-label={t('history.panelNewFolderAria')}

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

                  {t('history.folderCreate')}

                </button>

              </div>

            ) : (

              <button

                type="button"

                onClick={() => setAddingFolder(true)}

                className="w-full rounded-2xl border-2 border-dashed border-accent/45 mt-1 py-2.5 text-[11px] font-medium text-accent transition-colors duration-200 hover:border-accent hover:bg-accent hover:text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"

              >

                {t('history.newFolder')}

              </button>

            )}

          </div>



          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-1.5">

            {isDragging ? (

              <p className="mb-2 px-1 text-[10px] text-fg-muted">

                {t('history.panelDragHint')}

              </p>

            ) : null}

            <ul className="flex flex-col gap-2">

              {folderTree.map((node) => renderFolderNode(node, 0))}

            </ul>



            <div

              className={`mt-4 pt-2 transition-colors ${historyDropZoneClass(isDropActive({ kind: 'root' }))}`}

              {...(dragEnabled ? historyDropZoneAttrs({ kind: 'root' }) : {})}

            >

              <p className="mb-1 px-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-muted">

                {t('history.noFolder')}

              </p>

              <ul className="flex min-h-[2rem] flex-col gap-px">

                {rootConversations.length ? (

                  rootConversations.map((c) => renderConversationRow(c))

                ) : dragEnabled && isDragging ? (

                  <li className="rounded-md border border-dashed border-accent px-2 py-3 text-center text-[10px] text-fg-muted">

                    {t('history.panelDropRoot')}

                  </li>

                ) : null}

              </ul>

            </div>



            {!scopedConversations.length ? (

              <EmptyState

                title={
                  conversationScope?.mode === 'ide'
                    ? t('ide.workspace.emptyChatsTitle')
                    : t('history.emptyConversationsTitle')
                }

                description={
                  conversationScope?.mode === 'ide'
                    ? t('ide.workspace.emptyChatsDesc')
                    : t('history.emptyConversationsDesc')
                }

                action={

                  <button

                    type="button"

                    className="luna-btn-primary mt-1 px-3 py-1.5 text-ui"

                    onClick={() => onNewConversation()}

                  >

                    {t('history.newConversation')}

                  </button>

                }

              />

            ) : (q || activeTagFilters.length) && !anyVisible ? (

              <EmptyState

                title={t('history.emptyNoResultsTitle')}

                description={t('history.emptyNoResultsDesc')}

              />

            ) : null}

          </div>

          {selection.selectionMode ? (
            <HistoryBulkActionsBar
              totalSelected={selection.totalSelected}
              folders={folders}
              onDelete={handleBulkDelete}
              onMoveToFolder={handleBulkMove}
              onClear={selection.clearSelection}
              onCancelMode={selection.exitSelectionMode}
            />
          ) : null}
        </div>

      </aside>

      {ghost ? (

        <div

          className="pointer-events-none fixed z-[200] max-w-[14rem] truncate rounded-lg border border-accent bg-surface px-2.5 py-1.5 text-[11px] font-medium text-fg shadow-overlay"

          style={{

            left: ghost.x + 14,

            top: ghost.y + 10,

          }}

          aria-hidden

        >

          {ghost.title}

        </div>

      ) : null}

      <FolderSettingsModal
        open={settingsFolder != null}
        folder={settingsFolder}
        folders={folders}
        onClose={() => setSettingsFolderId(null)}
        onUpdateFolder={handleUpdateFolder}
        onDeleteFolder={(id) => {
          onDeleteFolder(id)
          setSettingsFolderId(null)
        }}
        onCreateFolder={(name, parentId) => {
          onCreateFolder(name, parentId)
          if (parentId) revealFolderPath(parentId)
        }}
        onNewConversation={(folderId) => {
          onNewConversation(folderId)
          revealFolderPath(folderId)
        }}
      />

    </>
  )
}


