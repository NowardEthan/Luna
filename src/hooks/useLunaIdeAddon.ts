import { useCallback, useEffect, useState } from 'react'
import { eventBus } from '../core/events/EventBus'
import { isLunaIdeAddonActive } from '../lib/lunaIdeAddon'

/** Estado reactivo do add-on IDE (activação no PluginHost). */
export function useLunaIdeAddon(): {
  active: boolean
  refresh: () => void
} {
  const [active, setActive] = useState(isLunaIdeAddonActive)

  const refresh = useCallback(() => {
    setActive(isLunaIdeAddonActive())
  }, [])

  useEffect(() => {
    refresh()
    const unsubs = [
      eventBus.on('luna-ide:availability', ({ active: on }) => setActive(on)),
      eventBus.on('plugin:activated', refresh),
      eventBus.on('plugin:deactivated', refresh),
      eventBus.on('plugin:enabled-changed', refresh),
      eventBus.on('plugin:discover:complete', refresh),
      eventBus.on('plugin:installed', refresh),
    ]
    return () => unsubs.forEach((u) => u())
  }, [refresh])

  return { active, refresh }
}
