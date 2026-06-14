/**
 * Entrada do add-on Luna IDE (pacote zip na Firebase Storage).
 * A lógica pesada fica na app via __lunaTrustedIde; este ficheiro só activa o slot.
 */
const PLUGIN_ID = 'luna-ide'
const COMMAND_ID = `${PLUGIN_ID}:toggle-workbench`
const SHORTCUT_ID = 'toggle-workbench'

function requireBridge() {
  const bridge = globalThis.__lunaTrustedIde
  if (!bridge) {
    throw new Error(
      'Luna IDE requer uma versão recente da aplicação Luna. Actualiza a app e tenta de novo.',
    )
  }
  return bridge
}

export async function activate(api) {
  const bridge = requireBridge()
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

export async function deactivate(_api) {
  const bridge = globalThis.__lunaTrustedIde
  bridge?.unregisterTools()
  bridge?.notifyActive(false)
}
