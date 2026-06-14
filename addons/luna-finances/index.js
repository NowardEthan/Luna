/**
 * Entrada do add-on Luna Finanças — delega para a bridge trusted da app.
 */
const PLUGIN_ID = 'luna-finances'
const COMMAND_ID = `${PLUGIN_ID}:open`
const SHORTCUT_ID = 'open-finances'

function requireBridge() {
  const bridge = globalThis.__lunaTrustedFinances
  if (!bridge) {
    throw new Error(
      'Luna Finanças requer uma versão recente da aplicação Luna. Actualiza a app e tenta de novo.',
    )
  }
  return bridge
}

export async function activate(api) {
  const bridge = requireBridge()
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

export async function deactivate(_api) {
  const bridge = globalThis.__lunaTrustedFinances
  bridge?.unregisterTools()
  bridge?.notifyActive(false)
}
