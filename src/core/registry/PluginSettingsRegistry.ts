import type { ReactNode } from 'react'

export type PluginSettingsContribution = {
  pluginId: string
  title?: string
  render: () => ReactNode
}

class PluginSettingsRegistryImpl {
  private readonly byPlugin = new Map<string, PluginSettingsContribution>()

  register(contribution: PluginSettingsContribution): void {
    this.byPlugin.set(contribution.pluginId, contribution)
  }

  unregister(pluginId: string): void {
    this.byPlugin.delete(pluginId)
  }

  get(pluginId: string): PluginSettingsContribution | undefined {
    return this.byPlugin.get(pluginId)
  }

  clear(): void {
    this.byPlugin.clear()
  }
}

export const pluginSettingsRegistry = new PluginSettingsRegistryImpl()
