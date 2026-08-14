import { useMemo, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatFolder, Conversation } from '../../types/chat'
import { requestConfirm } from '../../lib/confirm'
import { ConversationTags } from './ConversationTags'
import { HistoryOverflowMenu, type HistoryMenuItem } from './HistoryOverflowMenu'
import { buildFolderTree, flattenFoldersForSelect } from './folderTree'
import { formatUpdated, rowShell } from './utils'

type Props = {
  conversation: Conversation
  folders: ChatFolder[]
  activeId: string | null
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  editing: boolean
  titleDraft: string
  onTitleDraftChange: (v: string) => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onRenameCommit: () => void
  onRenameCancel: () => void
  onStartRename: (c: Conversation) => void
  onMoveConversation: (id: string, folderId: string | null) => void
  onSetConversationTags?: (id: string, tags: string[]) => void
  onTogglePin?: (id: string) => void
  isDragging?: boolean
  dragSessionActive?: boolean
  onGripPointerDown?: (e: ReactPointerEvent<Element>) => void
}

export function ConversationListRow({
  conversation: c,
  folders,
  activeId,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  editing,
  titleDraft,
  onTitleDraftChange,
  onSelect,
  onDelete,
  onRenameCommit,
  onRenameCancel,
  onStartRename,
  onMoveConversation,
  onSetConversationTags,
  onTogglePin,
  isDragging = false,
  dragSessionActive = false,
  onGripPointerDown,
}: Props) {
  const { t } = useTranslation()
  const sel = c.id === activeId
  const canDrag = Boolean(onGripPointerDown) && !editing && !selectionMode
  const tags = c.tags ?? []

  const folderOptions = useMemo(() => {
    const tree = buildFolderTree(folders)
    return flattenFoldersForSelect(tree)
  }, [folders])

  const confirmDelete = () => {
    void (async () => {
      const ok = await requestConfirm({
        title: t('history.deleteConversationTitle'),
        message: t('history.deleteConversationMessage', { title: c.title }),
        confirmLabel: t('history.delete'),
        destructive: true,
      })
      if (ok) onDelete(c.id)
    })()
  }

  const moveItems: HistoryMenuItem[] = [
    { id: 'root', label: t('history.noFolder'), onClick: () => onMoveConversation(c.id, null) },
    ...folderOptions.map((f) => ({
      id: `folder-${f.value}`,
      label: f.label,
      onClick: () => onMoveConversation(c.id, f.value),
    })),
  ]

  const menuItems: HistoryMenuItem[] = [
    ...(onTogglePin
      ? [
          {
            id: 'pin',
            label: c.pinned ? t('history.unpin') : t('history.pinTop'),
            onClick: () => onTogglePin(c.id),
          },
        ]
      : []),
    {
      id: 'rename',
      label: editing ? t('history.saveName') : t('history.rename'),
      onClick: () => (editing ? onRenameCommit() : onStartRename(c)),
    },
    ...moveItems,
    { id: 'delete', label: t('history.delete'), onClick: confirmDelete, destructive: true },
  ]

  const showTags = Boolean(onSetConversationTags) && tags.length > 0

  return (
    <li className="min-w-0">
      <div
        className={`${rowShell(sel || selected)} min-w-0 transition-opacity ${isDragging ? 'opacity-45' : ''} ${dragSessionActive ? 'pointer-events-none' : ''}`}
      >
        <div className="flex min-h-[2rem] min-w-0 items-center gap-0.5 px-0.5">
          {selectionMode ? (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="ml-0.5 size-3.5 shrink-0 rounded border-line accent-accent"
              aria-label={t('history.selectConversation', { title: c.title })}
              onClick={(e) => e.stopPropagation()}
            />
          ) : null}

          {canDrag ? (
            <button
              type="button"
              onPointerDown={onGripPointerDown}
              title={t('history.drag')}
              aria-label={t('history.dragItem', { title: c.title })}
              className="flex w-5 shrink-0 touch-none cursor-grab items-center justify-center rounded bg-transparent opacity-70 hover:opacity-100 hover:bg-white/15 active:scale-95 active:cursor-grabbing transition-all"
              onClick={(e) => e.preventDefault()}
            >
              <svg width="8" height="12" viewBox="0 0 10 14" fill="currentColor" aria-hidden>
                <circle cx="2.5" cy="2.5" r="1" />
                <circle cx="7.5" cy="2.5" r="1" />
                <circle cx="2.5" cy="7" r="1" />
                <circle cx="7.5" cy="7" r="1" />
              </svg>
            </button>
          ) : null}

          {editing ? (
            <input
              value={titleDraft}
              onChange={(e) => onTitleDraftChange(e.target.value)}
              onBlur={() => onRenameCommit()}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onRenameCommit()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  onRenameCancel()
                }
              }}
              className="min-w-0 flex-1 rounded border border-line bg-canvas px-1.5 py-0.5 text-[11px] text-fg focus:outline-none focus:ring-1 focus:ring-focus"
              autoFocus
              maxLength={120}
              aria-label={t('history.newTitle')}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                if (selectionMode) onToggleSelect?.()
                else onSelect(c.id)
              }}
              aria-current={sel ? 'page' : undefined}
              className="min-w-0 flex-1 overflow-hidden py-1 pl-0.5 pr-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset active:scale-[0.98] transition-transform"
            >
              <span className="flex items-center gap-1">
                {c.pinned ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-accent" aria-hidden>
                    <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6Z" />
                  </svg>
                ) : null}
                <span className="truncate text-[11px] font-medium text-current">{c.title}</span>
              </span>
              <span className="block truncate text-[9px] opacity-70">
                {formatUpdated(c.updatedAt)}
              </span>
            </button>
          )}

          {!selectionMode ? (
            <>
              <HistoryOverflowMenu
                items={menuItems}
                ariaLabel={t('history.actions', { title: c.title })}
              />
            </>
          ) : null}
        </div>

        {showTags ? (
          <ConversationTags
            tags={tags}
            compact
            onChange={(next) => onSetConversationTags!(c.id, next)}
          />
        ) : null}
      </div>
    </li>
  )
}
