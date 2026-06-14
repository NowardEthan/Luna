import { useCallback, useEffect, useState } from 'react'
import { eventBus } from '../core/events/EventBus'
import { pluginHost } from '../core/plugin/PluginHost'
import { LUNA_FINANCES_PLUGIN_ID } from '../plugins/luna-finances/constants'

export function isLunaFinancesAddonActive(): boolean {
  return pluginHost.isEnabled(LUNA_FINANCES_PLUGIN_ID)
}

export function useLunaFinancesAddon(): {
  active: boolean
  refresh: () => void
} {
  const [active, setActive] = useState(isLunaFinancesAddonActive)

  const refresh = useCallback(() => {
    setActive(isLunaFinancesAddonActive())
  }, [])

  useEffect(() => {
    refresh()
    const unsubs = [
      eventBus.on('luna-finances:availability', ({ active: on }) => setActive(on)),
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
