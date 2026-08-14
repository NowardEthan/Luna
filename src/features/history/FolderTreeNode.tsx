import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  isFolderHighlight,
  useLunaBadgeNav,
} from '../../context/LunaBadgeNavigation'
import { requestConfirm } from '../../lib/confirm'
import type { ChatFolder, Conversation } from '../../types/chat'
import type { FolderTreeNode as FolderNode } from './folderTree'
import { HistoryOverflowMenu, type HistoryMenuItem } from './HistoryOverflowMenu'
import {
  FolderIconView,
  folderIconChipClass,
  folderIconLabel,
  folderTreeControlClass,
  folderTreeOnVividShell,
  folderTreeShellClass,
} from './folderVisuals'
import {
  historyDropZoneAttrs,
  historyDropZoneClass,
  type HistoryDropTarget,
} from './useConversationDragDrop'

type Props = {
  node: FolderNode
  depth: number
  collapsed: boolean
  onToggleCollapsed: (id: string) => void
  conversationCount: number
  subtreeCount: number
  childrenContent: ReactNode
  selectionMode?: boolean
  folderSelected?: boolean
  onToggleFolderSelect?: () => void
  onOpenSettings: () => void
  onNewConversation: (folderId: string) => void
  onDeleteFolder: (id: string) => void
  folders?: ChatFolder[]
  conversations?: Conversation[]
  dragEnabled: boolean
  isDragging: boolean
  isDropActive: (target: HistoryDropTarget) => boolean
}

export function FolderTreeNodeView({
  node,
  depth,
  collapsed,
  onToggleCollapsed,
  conversationCount,
  subtreeCount,
  childrenContent,
  selectionMode = false,
  folderSelected = false,
  onToggleFolderSelect,
  onOpenSettings,
  onNewConversation,
  onDeleteFolder,
  folders = [],
  conversations = [],
  dragEnabled,
  isDragging,
  isDropActive,
}: Props) {
  const { t } = useTranslation()
  const folder = node
  const nav = useLunaBadgeNav()
  const highlighted = isFolderHighlight(nav?.highlight ?? null, folder.id)
  const color = folder.color ?? 'default'
  const folderTarget = { kind: 'folder' as const, folderId: folder.id }
  const folderDropActive = isDropActive(folderTarget)
  const shellState = {
    dropActive: folderDropActive,
    selected: folderSelected,
    highlighted,
  }
  const onVividShell = folderTreeOnVividShell(color, shellState)
  const indent = depth * 8
  const nestedOnly = subtreeCount > conversationCount

  const hasBody =
    conversationCount > 0 ||
    node.children.length > 0 ||
    isDragging

  const countLabel =
    subtreeCount === 0
      ? t('history.folderEmpty')
      : nestedOnly && conversationCount === 0
        ? t('history.folderInSubfolders', { count: subtreeCount })
        : `${subtreeCount}`

  const confirmDelete = () => {
    void (async () => {
      const childNote =
        node.children.length > 0 ? t('history.folderDeleteChildNote') : ''
      const ok = await requestConfirm({
        title: t('history.folderDeleteTitle'),
        message: t('history.folderDeleteMessage', { name: folder.name }) + childNote,
        confirmLabel: t('history.folderDelete'),
        destructive: true,
      })
      if (ok) onDeleteFolder(folder.id)
    })()
  }

  const menuItems: HistoryMenuItem[] = [
    { id: 'settings', label: t('history.folderSettings'), onClick: onOpenSettings },
    {
      id: 'new-chat',
      label: t('history.newConversation'),
      onClick: () => onNewConversation(folder.id),
    },
    { id: 'delete', label: t('history.folderDelete'), onClick: confirmDelete, destructive: true },
  ]

  return (
    <li className="min-w-0" id={`history-folder-${folder.id}`}>
      <div
        className={`${folderTreeShellClass(color, shellState)} ${historyDropZoneClass(folderDropActive)}`}
        style={{ marginLeft: indent }}
        {...(dragEnabled ? historyDropZoneAttrs(folderTarget) : {})}
      >
        <div className="flex min-w-0 items-center gap-1.5 px-2.5 py-2">
          {selectionMode ? (
            <input
              type="checkbox"
              checked={folderSelected}
              onChange={onToggleFolderSelect}
              className="size-3.5 shrink-0 rounded border-line accent-accent"
              aria-label={t('history.folderSelectAria', { name: folder.name })}
              onClick={(e) => e.stopPropagation()}
            />
          ) : null}

          <button
            type="button"
            onClick={() => onToggleCollapsed(folder.id)}
            className={`flex size-7 shrink-0 items-center justify-center rounded-lg active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${folderTreeControlClass(color, onVividShell)}`}
            aria-expanded={!collapsed}
            aria-label={collapsed ? t('history.folderExpand') : t('history.folderCollapse')}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              className={`stroke-current transition-transform ${collapsed ? '-rotate-90' : ''}`}
              strokeWidth="2"
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className={`flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-95 transition-transform ${
              folder.customIcon
                ? `p-0 ring-1 ${onVividShell ? 'ring-white/35' : 'ring-line-subtle'}`
                : folderIconChipClass(color, onVividShell)
            }`}
            title={
              folder.customIcon
                ? t('history.folderCustomIcon')
                : folderIconLabel(folder.icon ?? 'folder')
            }
            aria-label={t('history.folderConfigureAria', { name: folder.name })}
          >
            <FolderIconView
              folder={folder}
              size={14}
              fill={Boolean(folder.customIcon)}
            />
          </button>

          <button
            type="button"
            onClick={() => onToggleCollapsed(folder.id)}
            className="min-w-0 flex-1 overflow-hidden py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span className="truncate text-[11px] font-semibold leading-tight text-current">
              {folder.name}
            </span>
            <span
              className={`block truncate text-[9px] ${onVividShell ? 'text-current/75' : 'text-fg-muted'}`}
            >
              {countLabel}
              {node.children.length
                ? t('history.folderSubCount', { count: node.children.length })
                : ''}
            </span>
          </button>

          <HistoryOverflowMenu
            items={menuItems}
            ariaLabel={t('history.folderActionsAria', { name: folder.name })}
            triggerClassName={folderTreeControlClass(color, onVividShell)}
          />
        </div>

        {!collapsed ? (
          hasBody ? (
            <div className="min-w-0 overflow-hidden px-1 pb-1 pt-1.5">
              {childrenContent}
            </div>
          ) : (
            <p
              className={`px-2 py-2 text-[9px] ${onVividShell ? 'text-current/75' : 'text-fg-muted'}`}
            >
              {t('history.folderEmptyHint')}
            </p>
          )
        ) : null}
      </div>
    </li>
  )
}
