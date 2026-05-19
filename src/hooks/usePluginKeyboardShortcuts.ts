import { useEffect, useState } from 'react'
import { eventBus } from '../core/events/EventBus'
import { pluginShortcutRegistry } from '../core/registry/PluginShortcutRegistry'
import { matchShortcut } from '../lib/matchShortcut'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

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
      if (isTypingTarget(e.target)) return
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
