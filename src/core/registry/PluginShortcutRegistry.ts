export type PluginShortcutContribution = {
  id: string
  pluginId: string
  label: string
  /** Ex.: `Ctrl+Shift+H` ou `Alt+K` */
  keys: string
  run: () => void
}

class PluginShortcutRegistryImpl {
  private readonly shortcuts = new Map<string, PluginShortcutContribution>()

  register(shortcut: PluginShortcutContribution): void {
    this.shortcuts.set(shortcut.id, shortcut)
  }

  unregister(id: string): void {
    this.shortcuts.delete(id)
  }

  unregisterByPlugin(pluginId: string): void {
    for (const [id, s] of this.shortcuts) {
      if (s.pluginId === pluginId) this.shortcuts.delete(id)
    }
  }

  list(): PluginShortcutContribution[] {
    return [...this.shortcuts.values()]
  }

  listByPlugin(pluginId: string): PluginShortcutContribution[] {
    return this.list().filter((s) => s.pluginId === pluginId)
  }

  clear(): void {
    this.shortcuts.clear()
  }
}

export const pluginShortcutRegistry = new PluginShortcutRegistryImpl()
