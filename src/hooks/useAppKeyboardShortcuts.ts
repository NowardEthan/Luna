import { useEffect } from 'react'
import type { LunaWorkbenchMode } from '../lib/workbenchMode'

type Handlers = {
  onSend?: () => void
  onNewConversation: () => void
  onToggleHistory: () => void
  onToggleMemories: () => void
  onToggleWorkbench: () => void
  onOpenCommandPalette: () => void
  onOpenShortcutsHelp: () => void
  onCloseOverlays: () => void
  composerBusy?: boolean
  workbenchMode: LunaWorkbenchMode
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

export function useAppKeyboardShortcuts(handlers: Handlers) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey

      if (e.key === 'Escape') {
        handlers.onCloseOverlays()
        return
      }

      if (e.key === '?' && !mod && !isTypingTarget(e.target)) {
        e.preventDefault()
        handlers.onOpenShortcutsHelp()
        return
      }

      if (!mod) return

      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        handlers.onOpenCommandPalette()
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
        if (handlers.workbenchMode === 'chat') handlers.onToggleMemories()
        return
      }

      if (e.key === '.' || e.code === 'Period') {
        e.preventDefault()
        handlers.onToggleWorkbench()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
