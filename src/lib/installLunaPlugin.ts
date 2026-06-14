import type { PluginManifest } from '../../packages/luna-sdk/src'
import { pluginHost } from '../core/plugin/PluginHost'
import { addInstalledPlugin, getInstalledPlugin } from '../core/plugin/installRegistry'
import { eventBus } from '../core/events/EventBus'

export type PluginInstallSuccess = {
  ok: true
  manifest: RawManifest
  rootPath: string
  needsReload: boolean
  installedAt: string
}

export type PluginInstallFailure = { ok: false; error: string }

export type PluginInstallResult = PluginInstallSuccess | PluginInstallFailure

type RawManifest = {
  id: string
  name: string
  version?: string
  description?: string
  entry?: string
  permissions?: string[]
  trusted?: boolean
  lunaApiVersion?: string
}

export function normalizeInstallManifest(raw: RawManifest): PluginManifest {
  return {
    ...raw,
    version: raw.version ?? '1.0.0',
    permissions: raw.permissions as PluginManifest['permissions'],
  }
}

export async function applyPluginInstallResult(
  result: PluginInstallResult,
  options?: { enable?: boolean; riskAck?: boolean },
): Promise<
  | { ok: true; manifest: PluginManifest; reloaded: boolean }
  | { ok: false; error: string }
> {
  if (!result.ok) return result

  const manifest = normalizeInstallManifest(result.manifest)
  addInstalledPlugin({
    id: manifest.id,
    rootPath: result.rootPath,
    manifest,
    installedAt: result.installedAt,
  })

  if (result.needsReload) {
    if (options?.enable && options.riskAck) {
      pluginHost.scheduleEnabledOnNextLaunch(manifest.id)
    }
    window.location.reload()
    return { ok: true, manifest, reloaded: true }
  }

  await pluginHost.refresh()
  eventBus.emit('plugin:installed', { pluginId: manifest.id })

  if (options?.enable && options.riskAck) {
    await pluginHost.setEnabled(manifest.id, true)
  }

  return { ok: true, manifest, reloaded: false }
}

export function isPluginInstalled(pluginId: string): boolean {
  if (!pluginId) return false
  if (getInstalledPlugin(pluginId)) return true
  return pluginHost.list().some((p) => p.manifest.id === pluginId)
}

export async function setAddonEnabled(
  pluginId: string,
  enabled: boolean,
): Promise<void> {
  await pluginHost.setEnabled(pluginId, enabled)
  eventBus.emit('plugin:discover:complete', {
    count: pluginHost.list().length,
  })
}
