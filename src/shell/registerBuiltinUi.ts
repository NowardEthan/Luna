import { panelRegistry } from '../core/registry/PanelRegistry'
import i18n from '../i18n'

/** Painéis laterais built-in (histórico e memórias). */
export function registerBuiltinUi(): void {
  if (panelRegistry.get('history')) return

  panelRegistry.register({
    id: 'history',
    label: i18n.t('panels.history'),
    order: 10,
    render: () => null,
  })

  panelRegistry.register({
    id: 'memories',
    label: i18n.t('panels.memories'),
    order: 20,
    render: () => null,
  })
}

export const SIDEBAR_PANEL_IDS = ['history', 'memories'] as const
export type SidebarPanelId = (typeof SIDEBAR_PANEL_IDS)[number]
