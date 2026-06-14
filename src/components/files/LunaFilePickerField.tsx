import { useTranslation } from 'react-i18next'
import {
  isLunaFileExplorerAvailable,
  type LunaFilePickerAccept,
} from '../../lib/lunaFileExplorer'
import { lunaPickFiles } from '../../lib/lunaFileExplorerPrompt'

type Props = {
  label: string
  hint?: string
  accept?: LunaFilePickerAccept
  multiple?: boolean
  disabled?: boolean
  valueLabel?: string | null
  onSelect: (files: File[]) => void
}

export function LunaFilePickerField({
  label,
  hint,
  accept,
  multiple = false,
  disabled = false,
  valueLabel,
  onSelect,
}: Props) {
  const { t } = useTranslation()
  const nativeOnly = !isLunaFileExplorerAvailable()

  function onNativeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files
    if (!list?.length) return
    onSelect(Array.from(list))
    e.target.value = ''
  }

  const acceptAttr = accept?.extensions
    ?.map((e) => (e.startsWith('.') ? e : `.${e}`))
    .join(',')

  async function openExplorer() {
    const files = await lunaPickFiles({
      title: label,
      confirmLabel: multiple
        ? t('files.picker_use_selected')
        : t('files.picker_use_file'),
      accept: { ...accept, maxFiles: multiple ? accept?.maxFiles ?? 10 : 1 },
      multiple,
    })
    if (files?.length) onSelect(files)
  }

  return (
    <div>
      <p className="mb-1 block text-[11px] font-medium text-fg-dim">{label}</p>
      {hint ? <p className="mb-2 text-[10px] text-fg-muted">{hint}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void openExplorer()}
          className="luna-btn-secondary px-3 py-2 text-ui disabled:opacity-50"
        >
          {nativeOnly ? t('files.picker_native') : t('files.picker_explorer')}
        </button>
        {valueLabel ? (
          <span className="max-w-full truncate text-[11px] text-fg-muted">{valueLabel}</span>
        ) : (
          <span className="text-[11px] text-fg-muted">{t('files.picker_none')}</span>
        )}
      </div>
      {nativeOnly ? (
        <input
          type="file"
          accept={acceptAttr}
          multiple={multiple}
          disabled={disabled}
          className="mt-2 block w-full text-[11px] text-fg-dim file:mr-2 file:rounded-lg file:border-0 file:bg-raised file:px-3 file:py-1.5 file:text-ui"
          onChange={onNativeChange}
        />
      ) : null}
    </div>
  )
}
