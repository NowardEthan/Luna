import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatFolder, FolderColorId } from '../../types/chat'
import { requestConfirm } from '../../lib/confirm'
import { Select } from '../../ui/Select'
import type { FolderUpdatePatch } from '../chat/state/folderStore'
import {
  buildFolderTree,
  canNestUnder,
  flattenFoldersForSelect,
  getFolderPathLabel,
} from './folderTree'
import { FolderIconPickerModal } from './FolderIconPickerModal'
import {
  FOLDER_COLOR_OPTIONS,
  FolderIconView,
  folderColorDotClass,
  folderIconLabel,
} from './folderVisuals'

type Props = {
  open: boolean
  folder: ChatFolder | null
  folders: ChatFolder[]
  onClose: () => void
  onUpdateFolder: (id: string, patch: FolderUpdatePatch) => void
  onDeleteFolder: (id: string) => void
  onCreateFolder: (name: string, parentId?: string | null) => void
  onNewConversation: (folderId: string) => void
}

export function FolderSettingsModal({
  open,
  folder,
  folders,
  onClose,
  onUpdateFolder,
  onDeleteFolder,
  onCreateFolder,
  onNewConversation,
}: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState<string | null>(null)
  const [subfolderDraft, setSubfolderDraft] = useState('')
  const [iconModalOpen, setIconModalOpen] = useState(false)

  useEffect(() => {
    if (!folder) return
    setName(folder.name)
    setParentId(folder.parentId ?? null)
    setSubfolderDraft('')
  }, [folder])

  useEffect(() => {
    if (!open) setIconModalOpen(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !iconModalOpen) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, iconModalOpen])

  const parentOptions = useMemo(() => {
    if (!folder) return []
    const tree = buildFolderTree(folders.filter((f) => f.id !== folder.id))
    return flattenFoldersForSelect(tree)
  }, [folder, folders])

  if (!open || !folder) return null

  const color = folder.color ?? 'default'
  const canSubfolder = canNestUnder(folder.id, folders)

  const saveName = () => {
    const n = name.replace(/\s+/g, ' ').trim()
    if (n.length && n !== folder.name) onUpdateFolder(folder.id, { name: n })
  }

  const handleDelete = () => {
    void (async () => {
      const ok = await requestConfirm({
        title: t('history.folderDeleteTitle'),
        message: t('history.folderDeleteMessage', { name: folder.name }),
        confirmLabel: t('history.folderDelete'),
        destructive: true,
      })
      if (ok) {
        onDeleteFolder(folder.id)
        onClose()
      }
    })()
  }

  return (
    <>
    <div
      className="luna-overlay-scrim fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="presentation"
      onClick={() => {
        if (!iconModalOpen) onClose()
      }}
    >
      <div
        role="dialog"
        aria-labelledby="folder-settings-title"
        className="luna-dialog flex max-h-[min(90vh,32rem)] w-full max-w-md flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-line px-4 py-3">
          <h2 id="folder-settings-title" className="text-title font-semibold text-fg">
            {t('history.folderSettingsTitle')}
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-fg-muted">
            {getFolderPathLabel(folder.id, folders)}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-fg-muted">
              {t('history.folderName')}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  saveName()
                }
              }}
              maxLength={80}
              className="w-full rounded-md border border-line bg-canvas px-2.5 py-1.5 text-body text-fg focus:outline-none focus:ring-1 focus:ring-focus"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-fg-muted">
              {t('history.folderIconLabel')}
            </span>
            <button
              type="button"
              onClick={() => setIconModalOpen(true)}
              className="flex w-full items-center gap-3 rounded-lg border border-line bg-canvas px-3 py-2.5 text-left transition-colors hover:border-line hover:bg-raised-hover"
            >
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-canvas ring-1 ring-line">
                <FolderIconView folder={folder} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-medium text-fg">
                  {folder.customIcon
                    ? t('history.folderCustomIcon')
                    : folderIconLabel(folder.icon ?? 'folder')}
                </span>
                <span className="block text-[10px] text-fg-muted">
                  {t('history.folderIconClickHint')}
                </span>
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="shrink-0 stroke-fg-muted"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div>
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-fg-muted">
              {t('history.folderColor')}
            </span>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={color === opt}
                  title={opt === 'default' ? t('history.folderColorDefault') : opt}
                  onClick={() =>
                    onUpdateFolder(folder.id, { color: opt as FolderColorId })
                  }
                  className={`flex size-8 items-center justify-center rounded-full border-2 transition-transform ${
                    color === opt
                      ? 'border-accent scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                >
                  <span className={`size-5 rounded-full ${folderColorDotClass(opt)}`} />
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-fg-muted">
              {t('history.folderParent')}
            </span>
            <Select
              value={parentId ?? ''}
              onChange={(v) => {
                const next = v === '' ? null : v
                setParentId(next)
                onUpdateFolder(folder.id, { parentId: next })
              }}
              options={[
                { value: '', label: t('history.folderRootLevel') },
                ...parentOptions.map((o) => ({ value: o.value, label: o.label })),
              ]}
              size="sm"
              className="w-full"
              aria-label={t('history.folderMoveToAria')}
            />
          </label>

          {canSubfolder ? (
            <div>
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-fg-muted">
                {t('history.folderSubfolder')}
              </span>
              <div className="flex gap-2">
                <input
                  value={subfolderDraft}
                  onChange={(e) => setSubfolderDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && subfolderDraft.trim()) {
                      e.preventDefault()
                      onCreateFolder(subfolderDraft, folder.id)
                      setSubfolderDraft('')
                    }
                  }}
                  placeholder={t('history.folderSubfolderPlaceholder')}
                  maxLength={80}
                  className="min-w-0 flex-1 rounded-md border border-line bg-canvas px-2.5 py-1.5 text-ui text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-focus"
                />
                <button
                  type="button"
                  disabled={!subfolderDraft.trim()}
                  onClick={() => {
                    if (!subfolderDraft.trim()) return
                    onCreateFolder(subfolderDraft, folder.id)
                    setSubfolderDraft('')
                  }}
                  className="shrink-0 rounded-md border border-line bg-raised px-3 py-1.5 text-ui text-fg hover:bg-raised-hover disabled:opacity-40"
                >
                  {t('history.folderCreate')}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-line px-4 py-3">
          <button
            type="button"
            className="luna-btn-primary w-full py-2"
            onClick={() => {
              onNewConversation(folder.id)
              onClose()
            }}
          >
            {t('history.folderNewConversation')}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              className="luna-btn-secondary flex-1 py-2"
              onClick={onClose}
            >
              {t('history.folderClose')}
            </button>
            <button
              type="button"
              className="luna-btn-secondary px-3 py-2 text-danger hover:bg-danger-muted"
              onClick={handleDelete}
            >
              {t('history.folderDelete')}
            </button>
          </div>
        </div>
      </div>
    </div>

    <FolderIconPickerModal
      open={iconModalOpen}
      folder={folder}
      onClose={() => setIconModalOpen(false)}
      onSelectIcon={(icon) => onUpdateFolder(folder.id, { icon })}
      onSelectCustom={(dataUrl) =>
        onUpdateFolder(folder.id, { customIcon: dataUrl })
      }
      onClearCustom={() => onUpdateFolder(folder.id, { customIcon: null })}
    />
    </>
  )
}
