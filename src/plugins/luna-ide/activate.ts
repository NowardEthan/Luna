import type { LunaPluginApi } from '../../../packages/luna-sdk/src'
import { LUNA_IDE_PLUGIN_ID } from './constants'
import { installLunaIdeTrustedBridge, setLunaIdeWorkbenchToggle } from './bridge'

const COMMAND_ID = `${LUNA_IDE_PLUGIN_ID}:toggle-workbench`
const SHORTCUT_ID = 'toggle-workbench'

export { setLunaIdeWorkbenchToggle }

export async function activateLunaIde(api: LunaPluginApi): Promise<void> {
  installLunaIdeTrustedBridge()
  const bridge = globalThis.__lunaTrustedIde
  if (!bridge) return

  bridge.registerTools()

  api.registerCommand({
    id: COMMAND_ID,
    label: 'Alternar modo IDE',
    keywords: 'workbench editor terminal',
    run: () => bridge.toggleWorkbench(),
  })

  api.registerShortcut({
    id: SHORTCUT_ID,
    label: 'Alternar modo IDE',
    keys: 'Ctrl+.',
    run: () => bridge.toggleWorkbench(),
  })

  bridge.notifyActive(true)
}

export async function deactivateLunaIde(api: LunaPluginApi): Promise<void> {
  void api
  const bridge = globalThis.__lunaTrustedIde
  bridge?.unregisterTools()
  bridge?.notifyActive(false)
}
