import type { PanelContribution } from './types'

class PanelRegistryImpl {
  private readonly panels = new Map<string, PanelContribution>()

  register(panel: PanelContribution): void {
    this.panels.set(panel.id, panel)
  }

  unregister(id: string): void {
    this.panels.delete(id)
  }

  get(id: string): PanelContribution | undefined {
    return this.panels.get(id)
  }

  list(): PanelContribution[] {
    return [...this.panels.values()].sort(
      (a, b) => (a.order ?? 100) - (b.order ?? 100),
    )
  }

  clear(): void {
    this.panels.clear()
  }
}

export const panelRegistry = new PanelRegistryImpl()
