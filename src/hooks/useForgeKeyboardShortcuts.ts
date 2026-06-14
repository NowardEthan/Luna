import { useEffect, useRef } from 'react'
import { useForgeLayout } from '../context/ForgeLayoutContext'
import { useLunaWorkspace } from '../context/LunaWorkspaceContext'
import { isEditableTarget } from '../lib/keyboard'

/** Atalhos do Luna Forge — activos só com projecto aberto. */
export function useForgeKeyboardShortcuts(enabled: boolean) {
  const forge = useForgeLayout()
  const ws = useLunaWorkspace()
  const wsRef = useRef(ws)
  wsRef.current = ws
  const forgeRef = useRef(forge)
  forgeRef.current = forge

  useEffect(() => {
    if (!enabled) return

    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey
      const f = forgeRef.current
      const w = wsRef.current

      if (mod && e.key === 's' && !e.shiftKey) {
        e.preventDefault()
        void w.saveActiveFile()
        return
      }

      if (mod && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        void w.saveAllDirtyFiles()
        return
      }

      if (e.shiftKey && e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        void w.formatActiveFile()
        return
      }

      if (mod && e.key === 'p' && !e.shiftKey) {
        e.preventDefault()
        f.setQuickOpen(true)
        return
      }

      if (mod && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        f.setActiveView('search')
        return
      }

      if (mod && e.shiftKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault()
        f.setActiveView('explorer')
        return
      }

      if (mod && e.shiftKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault()
        f.setActiveView('git')
        return
      }

      if (e.key === '`' && mod) {
        e.preventDefault()
        f.setBottomTab('terminal')
        return
      }

      if (mod && e.key === 'b' && !e.shiftKey) {
        e.preventDefault()
        f.setSidebarOpen(!f.sidebarOpen)
        return
      }

      if (mod && e.key === 'j' && !e.shiftKey && !isEditableTarget(e.target)) {
        e.preventDefault()
        f.toggleAiPanel()
      }

      if (mod && !e.shiftKey && (e.key === '\\' || e.key === '|')) {
        e.preventDefault()
        if (f.editorSplit) {
          f.setEditorSplit(false)
          f.setFocusPane('primary')
        } else {
          f.setSplitFilePath(w.activeFilePath)
          f.setEditorSplit(true)
          f.setFocusPane('primary')
        }
        return
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [enabled])
}
