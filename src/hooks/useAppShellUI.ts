import { useCallback, useEffect, useState } from 'react'
import { dismissOnboarding, readOnboardingDismissed } from '../components/OnboardingCard'
import { themeRegistry } from '../core/registry/ThemeRegistry'
import {
  cycleLunaTheme,
  readStoredThemeId,
  writeStoredThemeId,
  type LunaThemeId,
} from '../lib/lunaThemes'
import { readStreamingEnabled, writeStreamingEnabled } from '../lib/llmStreamClient'

type UseAppShellUIOpts = {
  activeId: string | null | undefined
}

export function useAppShellUI({ activeId }: UseAppShellUIOpts) {
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(() => !readOnboardingDismissed())
  const [themeId, setThemeId] = useState<LunaThemeId>(() => readStoredThemeId())
  const [streamingEnabled, setStreamingEnabledState] = useState(() => readStreamingEnabled())

  useEffect(() => {
    setEditingTitle(false)
  }, [activeId])

  const cycleTheme = useCallback(() => {
    setThemeId((current) => {
      const next = cycleLunaTheme(current)
      writeStoredThemeId(next)
      themeRegistry.setActive(next)
      return next
    })
  }, [])

  const setStreamingEnabled = useCallback((enabled: boolean) => {
    writeStreamingEnabled(enabled)
    setStreamingEnabledState(enabled)
  }, [])

  const dismissShowOnboarding = useCallback(() => {
    dismissOnboarding()
    setShowOnboarding(false)
  }, [])

  return {
    preferencesOpen,
    setPreferencesOpen,
    shortcutsOpen,
    setShortcutsOpen,
    commandOpen,
    setCommandOpen,
    editingTitle,
    setEditingTitle,
    titleDraft,
    setTitleDraft,
    showOnboarding,
    dismissShowOnboarding,
    themeId,
    setThemeId,
    streamingEnabled,
    setStreamingEnabled,
    cycleTheme,
  }
}
