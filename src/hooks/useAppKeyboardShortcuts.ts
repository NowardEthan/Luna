import { useEffect, useRef } from 'react'
import { isEditableTarget } from '../lib/keyboard'

type Handlers = {
  onSend?: () => void
  onNewConversation: () => void
  onToggleHistory: () => void
  onToggleMemories: () => void
  onOpenCommandPalette: () => void
  onOpenPreferences?: () => void
  onOpenShortcutsHelp: () => void
  onCycleTheme?: () => void
  onCloseOverlays: () => void
  composerBusy?: boolean
}

export function useAppKeyboardShortcuts(handlers: Handlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const handlers = handlersRef.current
      const mod = e.ctrlKey || e.metaKey

      if (e.key === 'Escape') {
        if (!isEditableTarget(e.target)) {
          handlers.onCloseOverlays()
        }
        return
      }

      if (e.key === '?' && !mod && !isEditableTarget(e.target)) {
        e.preventDefault()
        handlers.onOpenShortcutsHelp()
        return
      }

      if (!mod) return

      if (e.key === 'k' || e.key === 'K') {
        const el = e.target
        if (el instanceof HTMLElement && el.closest('.cm-editor')) {
          return
        }
        e.preventDefault()
        handlers.onOpenCommandPalette()
        return
      }

      if (e.key === ',' && handlers.onOpenPreferences) {
        e.preventDefault()
        handlers.onOpenPreferences()
        return
      }

      if (e.key === 'Enter' && handlers.onSend && !handlers.composerBusy) {
        e.preventDefault()
        handlers.onSend()
        return
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        handlers.onNewConversation()
        return
      }

      if (e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault()
        handlers.onToggleHistory()
        return
      }

      if (e.shiftKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault()
        handlers.onToggleMemories()
        return
      }

      if (e.shiftKey && (e.key === 't' || e.key === 'T') && handlers.onCycleTheme) {
        e.preventDefault()
        handlers.onCycleTheme()
        return
      }

    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
