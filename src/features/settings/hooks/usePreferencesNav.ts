import { useCallback, useState } from 'react'
import type { PreferencesSectionId } from '../settingsSections'

const STORAGE_KEY = 'luna-preferences-section'

function readStoredSection(): PreferencesSectionId {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (
      raw === 'conversation' ||
      raw === 'llm' ||
      raw === 'appearance' ||
      raw === 'documents' ||
      raw === 'memory' ||
      raw === 'addons' ||
      raw === 'mcp' ||
      raw === 'cloud'
    ) {
      return raw
    }
  } catch {
    /* ignore */
  }
  return 'conversation'
}

export function usePreferencesNav() {
  const [section, setSectionState] = useState<PreferencesSectionId>(readStoredSection)

  const setSection = useCallback((id: PreferencesSectionId) => {
    setSectionState(id)
    try {
      sessionStorage.setItem(STORAGE_KEY, id)
    } catch {
      /* ignore */
    }
  }, [])

  return { section, setSection }
}
