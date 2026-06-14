import { isLunaLocaleId } from './locales'
import type { LunaLocaleId } from './types'

const STORAGE_LOCALE = 'luna-ui-locale'
const STORAGE_AUTO_TRANSLATE = 'luna-auto-translate'

/** Chaves antigas (migração) */
const LEGACY_REASONING_LOCALE = 'luna-reasoning-display-lang'
const LEGACY_REASONING_TRANSLATE = 'luna-reasoning-translate'

export const UI_LOCALE_CHANGE_EVENT = 'luna-ui-locale-change'
export const AUTO_TRANSLATE_CHANGE_EVENT = 'luna-auto-translate-change'

function dispatchPreferenceChange(name: string) {
  try {
    globalThis.dispatchEvent(new Event(name))
  } catch {
    /* ignore */
  }
}

export function subscribeUiLocale(onChange: () => void): () => void {
  if (typeof globalThis.addEventListener !== 'function') {
    return () => {}
  }

  const onStorage = (e: StorageEvent) => {
    if (
      e.key === STORAGE_LOCALE ||
      e.key === LEGACY_REASONING_LOCALE ||
      e.key === null
    ) {
      onChange()
    }
  }
  globalThis.addEventListener('storage', onStorage)
  globalThis.addEventListener(UI_LOCALE_CHANGE_EVENT, onChange)
  return () => {
    globalThis.removeEventListener('storage', onStorage)
    globalThis.removeEventListener(UI_LOCALE_CHANGE_EVENT, onChange)
  }
}

export function readUiLocale(): LunaLocaleId {
  try {
    const ls = globalThis.localStorage
    if (!ls) return 'pt'

    const current = ls.getItem(STORAGE_LOCALE)?.trim()
    if (current && isLunaLocaleId(current)) return current

    const legacy = ls.getItem(LEGACY_REASONING_LOCALE)?.trim()
    if (legacy && isLunaLocaleId(legacy)) {
      ls.setItem(STORAGE_LOCALE, legacy)
      return legacy
    }
  } catch {
    /* ignore */
  }
  return 'pt'
}

export function writeUiLocale(id: LunaLocaleId): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_LOCALE, id)
    dispatchPreferenceChange(UI_LOCALE_CHANGE_EVENT)
  } catch {
    /* ignore */
  }
}

export function readAutoTranslateEnabled(): boolean {
  try {
    const ls = globalThis.localStorage
    if (!ls) return true

    const current = ls.getItem(STORAGE_AUTO_TRANSLATE)
    if (current === '0') return false
    if (current === '1') return true

    const legacy = ls.getItem(LEGACY_REASONING_TRANSLATE)
    if (legacy === '0') return false
    if (legacy === '1') return true
  } catch {
    /* ignore */
  }
  return true
}

export function writeAutoTranslateEnabled(enabled: boolean): void {
  try {
    globalThis.localStorage?.setItem(
      STORAGE_AUTO_TRANSLATE,
      enabled ? '1' : '0',
    )
    dispatchPreferenceChange(AUTO_TRANSLATE_CHANGE_EVENT)
  } catch {
    /* ignore */
  }
}
