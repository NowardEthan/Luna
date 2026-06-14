import type { LunaPluginApi } from '../../../packages/luna-sdk/src'
import { LUNA_FINANCES_PLUGIN_ID } from './constants'
import { setLunaFinancesOpenHandler } from './bridge'

const COMMAND_ID = `${LUNA_FINANCES_PLUGIN_ID}:open`
const SHORTCUT_ID = 'open-finances'

export { setLunaFinancesOpenHandler }

export async function activateLunaFinances(api: LunaPluginApi): Promise<void> {
  const bridge = globalThis.__lunaTrustedFinances
  if (!bridge) return

  bridge.registerTools()

  api.registerCommand({
    id: COMMAND_ID,
    label: 'Abrir Finanças',
    keywords: 'finanças dinheiro orçamento metas contas',
    run: () => bridge.openFinancesView(),
  })

  api.registerShortcut({
    id: SHORTCUT_ID,
    label: 'Abrir Finanças',
    keys: 'Ctrl+Shift+F',
    run: () => bridge.openFinancesView(),
  })

  bridge.notifyActive(true)
}

export async function deactivateLunaFinances(api: LunaPluginApi): Promise<void> {
  void api
  const bridge = globalThis.__lunaTrustedFinances
  bridge?.unregisterTools()
  bridge?.notifyActive(false)
}
