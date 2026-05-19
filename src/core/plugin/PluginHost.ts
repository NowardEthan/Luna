import type {
  LunaPluginApi,
  LunaPluginModule,
  PluginManifest,
} from '../../../packages/luna-sdk/src'
import { LUNA_API_VERSION } from '../../../packages/luna-sdk/src'
import { commandRegistry } from '../registry/CommandRegistry'
import { panelRegistry } from '../registry/PanelRegistry'
import { pluginSettingsRegistry } from '../registry/PluginSettingsRegistry'
import { pluginShortcutRegistry } from '../registry/PluginShortcutRegistry'
import { toolRegistry } from '../registry/ToolRegistry'
import { eventBus, type LunaEventMap } from '../events/EventBus'
import { getInstalledPlugin, removeInstalledPlugin } from './installRegistry'
import {
  patchPluginSettings,
  readPluginSettings,
} from './pluginSettingsStorage'
import {
  getPluginEntryLoader,
  getPluginOrigin,
  getUserPluginRootPath,
  scanProjectPlugins,
  scanUserPlugins,
  type PluginOrigin,
} from './paths'
import { assertPluginPermission, canUseWorker } from './permissions'
import { PluginWorkerBridge, type PluginWorkerHostCallbacks } from './pluginWorker'
import { finishTool } from '../tools/toolResult'

const ENABLED_KEY = 'luna-plugins-enabled'
const RISK_ACK_KEY = 'luna-plugins-risk-ack'

export type LoadedPlugin = {
  manifest: PluginManifest
  enabled: boolean
  loadError?: string
}

export type PluginLoadError = {
  pluginId: string
  message: string
}

type ActivePlugin = {
  manifest: PluginManifest
  hookUnsubs: (() => void)[]
  worker?: PluginWorkerBridge
  commandIds: string[]
  panelIds: string[]
  shortcutIds: string[]
  toolPrefix: string
}

class PluginHostImpl {
  private readonly plugins = new Map<string, LoadedPlugin>()
  private readonly active = new Map<string, ActivePlugin>()
  private readonly discoveryErrors: PluginLoadError[] = []

  async discover(): Promise<void> {
    this.discoveryErrors.length = 0
    const project = scanProjectPlugins()
    const projectIds = new Set(project.map((m) => m.id))
    const user = scanUserPlugins().filter((m) => !projectIds.has(m.id))
    const manifests = [...project, ...user]
    const enabled = readEnabledSet()

    for (const manifest of manifests) {
      if (manifest.lunaApiVersion && manifest.lunaApiVersion !== LUNA_API_VERSION) {
        this.discoveryErrors.push({
          pluginId: manifest.id,
          message: `Versão API ${manifest.lunaApiVersion} incompatível (esperado ${LUNA_API_VERSION}).`,
        })
      }
      const loadError = this.discoveryErrors.find((e) => e.pluginId === manifest.id)
        ?.message
      const plugin: LoadedPlugin = {
        manifest,
        enabled: enabled.has(manifest.id) && !loadError,
        loadError,
      }
      this.plugins.set(manifest.id, plugin)
      if (plugin.enabled) {
        try {
          await this.activate(manifest.id)
        } catch (err) {
          plugin.enabled = false
          plugin.loadError =
            err instanceof Error ? err.message : 'Falha ao activar plugin.'
        }
      }
    }
    eventBus.emit('plugin:discover:complete', { count: this.plugins.size })
  }

  list(): LoadedPlugin[] {
    return [...this.plugins.values()]
  }

  getLoadErrors(): PluginLoadError[] {
    return [...this.discoveryErrors]
  }

  getOrigin(id: string): PluginOrigin {
    return getPluginOrigin(id)
  }

  getInstallPath(id: string): string | undefined {
    if (getPluginOrigin(id) === 'user') {
      return getUserPluginRootPath(id)
    }
    return `.luna/plugins/${id}`
  }

  canUninstall(id: string): boolean {
    return getInstalledPlugin(id) != null
  }

  async refresh(): Promise<void> {
    for (const id of [...this.active.keys()]) {
      await this.deactivate(id)
    }
    this.plugins.clear()
    await this.discover()
  }

  async uninstall(id: string): Promise<void> {
    if (!this.canUninstall(id)) {
      throw new Error(
        'Só é possível desinstalar add-ons instalados do disco (não os incluídos na aplicação).',
      )
    }
    await this.deactivate(id)
    this.plugins.delete(id)
    removeInstalledPlugin(id)
    try {
      await window.plugins?.uninstall?.(id)
    } catch {
      /* ignore */
    }
    const enabled = readEnabledSet()
    enabled.delete(id)
    persistEnabledSet(enabled)
  }

  isEnabled(id: string): boolean {
    return this.plugins.get(id)?.enabled ?? false
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    const p = this.plugins.get(id)
    if (!p || p.loadError) return
    if (enabled && !readRiskAcknowledged()) {
      throw new Error('Confirme o aviso de segurança nas definições antes de activar plugins.')
    }
    if (enabled) await this.activate(id)
    else await this.deactivate(id)
    p.enabled = enabled
    persistEnabled(this.plugins)
  }

  async activate(id: string): Promise<void> {
    if (this.active.has(id)) return
    const p = this.plugins.get(id)
    if (!p) return

    const manifest = p.manifest
    const api = this.createApi(manifest)
    const record: ActivePlugin = {
      manifest,
      hookUnsubs: [],
      commandIds: [],
      panelIds: [],
      shortcutIds: [],
      toolPrefix: `${manifest.id}__`,
    }

    this.active.set(id, record)

    if (canUseWorker(manifest)) {
      const worker = new PluginWorkerBridge(
        manifest,
        this.createWorkerCallbacks(manifest),
      )
      await worker.start()
      record.worker = worker
      eventBus.emit('plugin:activated', { pluginId: id })
      return
    }

    const mod = await this.loadModule(manifest)
    if (mod?.activate) {
      await mod.activate(api)
    }
    eventBus.emit('plugin:activated', { pluginId: id })
  }

  async deactivate(id: string): Promise<void> {
    const record = this.active.get(id)
    if (record) {
      for (const u of record.hookUnsubs) u()
      for (const cmdId of record.commandIds) commandRegistry.unregister(cmdId)
      for (const panelId of record.panelIds) panelRegistry.unregister(panelId)
      for (const shortcutId of record.shortcutIds) {
        pluginShortcutRegistry.unregister(shortcutId)
      }
      pluginSettingsRegistry.unregister(id)
      toolRegistry.unregisterByPrefix(record.toolPrefix)
      await record.worker?.stop()
      const mod = await this.loadModule(record.manifest).catch(() => null)
      if (mod?.deactivate) await mod.deactivate()
      this.active.delete(id)
    }
    const p = this.plugins.get(id)
    if (p) p.enabled = false
    eventBus.emit('plugin:deactivated', { pluginId: id })
  }

  private async loadModule(manifest: PluginManifest): Promise<LunaPluginModule | null> {
    const loader = getPluginEntryLoader(manifest)
    if (!loader) {
      const entry = manifest.entry?.trim() || 'index.ts'
      throw new Error(
        `Entrada não encontrada para «${manifest.id}» (${entry}). Use index.js em add-ons instalados.`,
      )
    }
    const mod = (await loader()) as { activate?: LunaPluginModule['activate'] }
    return mod as LunaPluginModule
  }

  private createWorkerCallbacks(
    manifest: PluginManifest,
  ): PluginWorkerHostCallbacks {
    return {
      readAllSettings: () => readPluginSettings(manifest.id),
      onWriteSetting: (key, value) => {
        patchPluginSettings(manifest.id, { [key]: value })
        eventBus.emit('plugin:settings:changed', {
          pluginId: manifest.id,
          key,
        })
      },
      storageGet: async (key) => {
        assertPluginPermission(manifest, 'storage')
        try {
          return localStorage.getItem(`luna-plugin:${manifest.id}:${key}`)
        } catch {
          return null
        }
      },
      storageSet: async (key, value) => {
        assertPluginPermission(manifest, 'storage')
        try {
          localStorage.setItem(`luna-plugin:${manifest.id}:${key}`, value)
        } catch {
          /* ignore */
        }
      },
      onRegisterTool: ({ localName, description, parameters, invoke }) => {
        assertPluginPermission(manifest, 'registerTool')
        const name = `${manifest.id}__${localName}`
        const params =
          parameters && typeof parameters === 'object'
            ? parameters
            : {
                type: 'object',
                properties: {},
                additionalProperties: true,
              }
        toolRegistry.register({
          name,
          family: 'plugin',
          schema: {
            type: 'function',
            function: {
              name,
              description:
                description?.trim() ||
                `Ferramenta «${localName}» do plugin «${manifest.name}»`,
              parameters: params,
            },
          },
          uiLabel: manifest.name,
          handler: async ({ args }) => {
            const result = await invoke(args)
            return finishTool(
              name,
              result.ok,
              result.content,
              args,
              result,
            )
          },
        })
      },
    }
  }

  private createApi(manifest: PluginManifest): LunaPluginApi {
    const record = (): ActivePlugin => {
      const r = this.active.get(manifest.id)
      if (!r) throw new Error(`Plugin ${manifest.id} não está activo.`)
      return r
    }

    return {
      id: manifest.id,
      registerTool: (tool) => {
        assertPluginPermission(manifest, 'registerTool')
        const t = tool as { name: string }
        const prefixed = { ...t, name: `${manifest.id}__${t.name}` }
        toolRegistry.register(prefixed as never)
      },
      registerPanel: (panel) => {
        assertPluginPermission(manifest, 'registerPanel')
        const p = panel as { id: string }
        record().panelIds.push(p.id)
        panelRegistry.register(panel as never)
      },
      registerCommand: (cmd) => {
        assertPluginPermission(manifest, 'registerCommand')
        const c = cmd as { id: string }
        record().commandIds.push(c.id)
        commandRegistry.register(cmd as never)
      },
      registerSettings: (panel) => {
        assertPluginPermission(manifest, 'registerSettings')
        pluginSettingsRegistry.register({
          pluginId: manifest.id,
          title: panel.title,
          render: panel.render,
        })
        eventBus.emit('plugin:settings:registered', { pluginId: manifest.id })
      },
      registerShortcut: (shortcut) => {
        assertPluginPermission(manifest, 'registerShortcut')
        const fullId = `${manifest.id}:${shortcut.id}`
        record().shortcutIds.push(fullId)
        pluginShortcutRegistry.register({
          id: fullId,
          pluginId: manifest.id,
          label: shortcut.label,
          keys: shortcut.keys,
          run: shortcut.run,
        })
        eventBus.emit('plugin:shortcut:registered', {
          pluginId: manifest.id,
          shortcutId: fullId,
        })
      },
      readSetting: <T,>(key: string, fallback?: T): T => {
        const values = readPluginSettings(manifest.id)
        const v = values[key]
        return (v !== undefined ? v : fallback) as T
      },
      writeSetting: (key, value) => {
        patchPluginSettings(manifest.id, { [key]: value })
        eventBus.emit('plugin:settings:changed', {
          pluginId: manifest.id,
          key,
        })
      },
      on: (event, handler) => {
        assertPluginPermission(manifest, 'on')
        const unsub = eventBus.on(event as keyof LunaEventMap, handler as never)
        record().hookUnsubs.push(unsub)
        return unsub
      },
      storage: {
        get: async (key) => {
          assertPluginPermission(manifest, 'storage')
          try {
            return localStorage.getItem(`luna-plugin:${manifest.id}:${key}`)
          } catch {
            return null
          }
        },
        set: async (key, value) => {
          assertPluginPermission(manifest, 'storage')
          try {
            localStorage.setItem(`luna-plugin:${manifest.id}:${key}`, value)
          } catch {
            /* ignore */
          }
        },
      },
    }
  }
}

function readEnabledSet(): Set<string> {
  try {
    const raw = localStorage.getItem(ENABLED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function readRiskAcknowledged(): boolean {
  try {
    return localStorage.getItem(RISK_ACK_KEY) === '1'
  } catch {
    return false
  }
}

function persistEnabled(plugins: Map<string, LoadedPlugin>): void {
  const enabled = [...plugins.entries()]
    .filter(([, p]) => p.enabled)
    .map(([id]) => id)
  persistEnabledSet(new Set(enabled))
}

function persistEnabledSet(enabled: Set<string>): void {
  try {
    localStorage.setItem(ENABLED_KEY, JSON.stringify([...enabled]))
  } catch {
    /* ignore */
  }
}

export const pluginHost = new PluginHostImpl()
