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
import { useTranslation } from 'react-i18next'

type Props = {
  disabled?: boolean
  onChange?: (locale: LunaLocaleId) => void
  fullWidth?: boolean
}

export function LocaleSelect({ disabled, onChange, fullWidth }: Props) {
  const { t } = useTranslation()
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
      variant={fullWidth ? 'default' : 'toolbar'}
      size="md"
      className={fullWidth ? 'w-full max-w-none' : 'max-w-[10rem]'}
      align="end"
      aria-label={t('toolbar.language_aria')}
      title={t('toolbar.language_title')}
    />
  )
}
