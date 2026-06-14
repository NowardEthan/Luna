import { useEffect, useState } from 'react'
import { eventBus } from '../core/events/EventBus'
import { pluginShortcutRegistry } from '../core/registry/PluginShortcutRegistry'
import { isEditableTarget } from '../lib/keyboard'
import { matchShortcut } from '../lib/matchShortcut'

export function usePluginKeyboardShortcuts(enabled = true): void {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const bump = () => setRevision((n) => n + 1)
    const unsubs = [
      eventBus.on('plugin:activated', bump),
      eventBus.on('plugin:deactivated', bump),
      eventBus.on('plugin:discover:complete', bump),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  useEffect(() => {
    if (!enabled) return

    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return
      const shortcuts = pluginShortcutRegistry.list()
      for (const s of shortcuts) {
        if (matchShortcut(e, s.keys)) {
          e.preventDefault()
          e.stopPropagation()
          s.run()
          return
        }
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [enabled, revision])
}
