import { pluginHost } from '../core/plugin/PluginHost'
import { LUNA_FINANCES_PLUGIN_ID } from '../plugins/luna-finances/constants'
import type { LunaPrimaryView } from './primaryView'

export { LUNA_FINANCES_PLUGIN_ID }

export function isLunaFinancesAddonActive(): boolean {
  return pluginHost.isEnabled(LUNA_FINANCES_PLUGIN_ID)
}

/** Se Finanças estiver activo mas o add-on não, volta à conversa. */
export function normalizePrimaryViewForFinances(
  view: LunaPrimaryView,
): LunaPrimaryView {
  if (view === 'finances' && !isLunaFinancesAddonActive()) return 'conversation'
  return view
}
