import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isLunaFileExplorerAvailable } from '../../lib/lunaFileExplorer'
import { lunaPickFiles } from '../../lib/lunaFileExplorerPrompt'
import type { ChatFolder, FolderIconId } from '../../types/chat'
import { FolderIconCropModal } from './FolderIconCropModal'
import { isAcceptedIconFile } from './folderCustomIcon'
import {
  FOLDER_ICON_OPTIONS,
  FolderIconView,
  folderIconLabel,
} from './folderVisuals'

type Props = {
  open: boolean
  folder: ChatFolder
  onClose: () => void
  onSelectIcon: (icon: FolderIconId) => void
  onSelectCustom: (dataUrl: string) => void
  onClearCustom: () => void
}

export function FolderIconPickerModal({
  open,
  folder,
  onClose,
  onSelectIcon,
  onSelectCustom,
  onClearCustom,
}: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const activeIcon = folder.icon ?? 'folder'
  const hasCustom = Boolean(folder.customIcon)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setImportError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && cropSrc == null) {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, onClose, cropSrc])

  const filteredIcons = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return FOLDER_ICON_OPTIONS
    return FOLDER_ICON_OPTIONS.filter((id) =>
      folderIconLabel(id).toLowerCase().includes(q),
    )
  }, [query])

  const applyPickedFile = (file: File) => {
    if (!isAcceptedIconFile(file)) {
      setImportError(t('history.folderInvalidFile'))
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setImportError(t('history.folderFileTooLarge'))
      return
    }
    setCropSrc(URL.createObjectURL(file))
  }

  const openFilePicker = async () => {
    setImportError(null)
    if (isLunaFileExplorerAvailable()) {
      const files = await lunaPickFiles({
        title: t('history.folderImportIcon'),
        confirmLabel: t('history.folderUseImage'),
        accept: {
          extensions: ['.png', '.jpg', '.jpeg', '.webp', '.ico'],
          maxBytesPerFile: 4 * 1024 * 1024,
        },
      })
      const file = files?.[0]
      if (file) applyPickedFile(file)
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.png,.jpg,.jpeg,.webp,.ico,image/png,image/jpeg,image/webp,image/x-icon'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) applyPickedFile(file)
    }
    input.click()
  }

  const closeCrop = () => {
    if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  const pickIcon = (icon: FolderIconId) => {
    onSelectIcon(icon)
    onClose()
  }

  const applyCustom = (dataUrl: string) => {
    onSelectCustom(dataUrl)
    closeCrop()
    onClose()
  }

  if (!open) return null

  const currentLabel = hasCustom
    ? t('history.folderCustomIcon')
    : folderIconLabel(activeIcon)

  return (
    <>
      <div
        className="luna-overlay-scrim fixed inset-0 z-[92] flex items-center justify-center p-4"
        role="presentation"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-labelledby="folder-icon-picker-title"
          className="luna-dialog flex max-h-[min(88vh,36rem)] w-full max-w-md flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 border-b border-line px-4 py-3">
            <h2
              id="folder-icon-picker-title"
              className="text-title font-semibold text-fg"
            >
              {t('history.folderChooseIcon')}
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-fg-muted">
              {t('history.folderNamed', { name: folder.name })}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 border-b border-line bg-canvas px-4 py-3">
            <div
              className={`flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-2 ${
                hasCustom ? 'ring-accent bg-accent-muted' : 'ring-line bg-canvas'
              }`}
            >
              <FolderIconView folder={folder} size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-medium text-fg">{currentLabel}</p>
              <p className="text-[10px] text-fg-muted">
                {hasCustom
                  ? t('history.folderImportedHint')
                  : t('history.folderSelectOrImport')}
              </p>
            </div>
            {hasCustom ? (
              <button
                type="button"
                onClick={() => {
                  onClearCustom()
                }}
                className="shrink-0 rounded-md px-2 py-1 text-[10px] text-fg-muted hover:bg-raised-hover hover:text-red-400"
              >
                {t('common.remove')}
              </button>
            ) : null}
          </div>

          <div className="shrink-0 px-4 pt-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('history.folderSearchIcons')}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ui text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-focus"
              autoFocus
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {filteredIcons.length === 0 ? (
              <p className="py-8 text-center text-ui text-fg-muted">
                {t('history.folderNoIconMatch', { query })}
              </p>
            ) : (
              <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-8">
                {filteredIcons.map((opt) => {
                  const selected = !hasCustom && activeIcon === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      title={folderIconLabel(opt)}
                      aria-pressed={selected}
                      onClick={() => pickIcon(opt)}
                      className={`flex size-10 items-center justify-center rounded-lg border transition-colors ${
                        selected
                          ? 'border-accent bg-accent-muted text-accent shadow-sm '
                          : 'border-transparent text-fg-muted hover:border-line hover:bg-raised-hover hover:text-fg'
                      }`}
                    >
                      <FolderIconView folder={{ icon: opt }} size={18} />
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 space-y-2 border-t border-line px-4 py-3">
            {importError ? (
              <p className="text-center text-[11px] text-red-400" role="alert">
                {importError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void openFilePicker()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-canvas py-2.5 text-ui text-fg-dim transition-colors hover:border-accent hover:bg-accent-muted hover:text-fg"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="stroke-current"
                strokeWidth="2"
                aria-hidden
              >
                <path
                  d="M12 16V8m0 0l-3 3m3-3 3 3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t('history.folderImportImage')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="luna-btn-secondary w-full py-2"
            >
              {t('history.folderClose')}
            </button>
          </div>
        </div>
      </div>

      <FolderIconCropModal
        open={cropSrc != null}
        imageSrc={cropSrc}
        onClose={closeCrop}
        onApply={applyCustom}
      />
    </>
  )
}
