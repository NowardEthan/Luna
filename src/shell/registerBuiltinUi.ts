import { panelRegistry } from '../core/registry/PanelRegistry'

/** Painéis laterais built-in (histórico e memórias). */
export function registerBuiltinUi(): void {
  if (panelRegistry.get('history')) return

  panelRegistry.register({
    id: 'history',
    label: 'Histórico',
    order: 10,
    render: () => null,
  })

  panelRegistry.register({
    id: 'memories',
    label: 'Memórias',
    order: 20,
    render: () => null,
  })
}

export const SIDEBAR_PANEL_IDS = ['history', 'memories'] as const
export type SidebarPanelId = (typeof SIDEBAR_PANEL_IDS)[number]
