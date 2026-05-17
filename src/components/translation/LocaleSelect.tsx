import { useSyncExternalStore } from 'react'
import {
  LUNA_LOCALES,
  readAutoTranslateEnabled,
  readUiLocale,
  subscribeUiLocale,
  writeUiLocale,
  type LunaLocaleId,
} from '../../translation'
import { Select } from '../ui/Select'

type Props = {
  disabled?: boolean
  onChange?: (locale: LunaLocaleId) => void
}

export function LocaleSelect({ disabled, onChange }: Props) {
  const locale = useSyncExternalStore(
    subscribeUiLocale,
    readUiLocale,
    readUiLocale,
  )

  if (!readAutoTranslateEnabled()) return null

  return (
    <Select
      value={locale}
      onChange={(id) => {
        writeUiLocale(id as LunaLocaleId)
        onChange?.(id as LunaLocaleId)
      }}
      options={LUNA_LOCALES.map((l) => ({ value: l.id, label: l.label }))}
      disabled={disabled}
      variant="toolbar"
      size="md"
      className="max-w-[10rem]"
      align="end"
      aria-label="Idioma da interface"
      title="Idioma para tradução automática"
    />
  )
}
