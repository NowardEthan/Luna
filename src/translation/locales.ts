import type { LunaLocaleId } from './types'

export type LunaLocaleOption = {
  id: LunaLocaleId
  label: string
}

export const LUNA_LOCALES: LunaLocaleOption[] = [
  { id: 'pt', label: 'Português (BR)' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Français' },
  { id: 'de', label: 'Deutsch' },
  { id: 'it', label: 'Italiano' },
  { id: 'ja', label: '日本語' },
  { id: 'ko', label: '한국어' },
  { id: 'zh', label: '中文' },
]

export function isLunaLocaleId(value: string): value is LunaLocaleId {
  return LUNA_LOCALES.some((l) => l.id === value)
}

export function localeLabel(id: LunaLocaleId): string {
  return LUNA_LOCALES.find((l) => l.id === id)?.label ?? id
}
