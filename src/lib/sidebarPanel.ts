/** Painel lateral de conversas — partilhado entre modo Chat e IDE. */
export type SidebarPanel = 'none' | 'history' | 'memories'

export function isHistoryOpen(panel: SidebarPanel): boolean {
  return panel === 'history'
}

export function isMemoriesOpen(panel: SidebarPanel): boolean {
  return panel === 'memories'
}

export function toggleSidebarPanel(
  current: SidebarPanel,
  target: 'history' | 'memories',
): SidebarPanel {
  return current === target ? 'none' : target
}
