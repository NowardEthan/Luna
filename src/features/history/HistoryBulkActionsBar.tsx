import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatFolder } from '../../types/chat'
import { Select } from '../../ui/Select'
import { buildFolderTree, flattenFoldersForSelect } from './folderTree'

type Props = {
  totalSelected: number
  folders: ChatFolder[]
  onDelete: () => void
  onMoveToFolder: (folderId: string | null) => void
  onClear: () => void
  onCancelMode: () => void
}

export function HistoryBulkActionsBar({
  totalSelected,
  folders,
  onDelete,
  onMoveToFolder,
  onClear,
  onCancelMode,
}: Props) {
  const { t } = useTranslation()
  const [moveValue, setMoveValue] = useState('')
  if (totalSelected === 0) return null

  const folderOptions = flattenFoldersForSelect(buildFolderTree(folders))

  return (
    <div className="shrink-0 border-t border-line bg-sidebar px-2 py-2 ">
      <p className="mb-1.5 px-0.5 text-[10px] font-medium text-fg-dim">
        {t('history.bulkSelected', { count: totalSelected })}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md border border-line bg-danger-muted px-2 py-1 text-[11px] font-medium text-danger hover:bg-raised-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {t('history.delete')}
        </button>
        <div className="min-w-0 flex-1">
          <Select
            value={moveValue}
            onChange={(v) => {
              if (!v) return
              onMoveToFolder(v === '__root__' ? null : v)
              setMoveValue('')
            }}
            options={[
              { value: '', label: t('history.bulkMoveTo') },
              { value: '__root__', label: t('history.noFolder') },
              ...folderOptions.map((f) => ({ value: f.value, label: f.label })),
            ]}
            size="sm"
            variant="ghost"
            className="w-full min-w-0"
            aria-label={t('history.bulkMoveAria')}
          />
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md px-2 py-1 text-[11px] text-fg-muted hover:bg-raised-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {t('history.clear')}
        </button>
        <button
          type="button"
          onClick={onCancelMode}
          className="rounded-md px-2 py-1 text-[11px] text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label={t('history.bulkExitSelectionAria')}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
