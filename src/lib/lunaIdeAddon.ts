import { pluginHost } from '../core/plugin/PluginHost'
import { LUNA_IDE_PLUGIN_ID } from '../plugins/luna-ide/constants'
import type { LunaWorkbenchMode } from './workbenchMode'
import { writeWorkbenchMode } from './workbenchMode'

export { LUNA_IDE_PLUGIN_ID }

export function isLunaIdeAddonActive(): boolean {
  return pluginHost.isEnabled(LUNA_IDE_PLUGIN_ID)
}

/** Garante que o modo IDE só fica activo com o add-on instalado e activado. */
export function normalizeWorkbenchMode(mode: LunaWorkbenchMode): LunaWorkbenchMode {
  if (mode === 'ide' && !isLunaIdeAddonActive()) return 'chat'
  return mode
}

export function fallbackToChatIfIdeUnavailable(): void {
  if (!isLunaIdeAddonActive()) {
    writeWorkbenchMode('chat')
  }
}
