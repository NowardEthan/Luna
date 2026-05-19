import type {
  LunaPluginModule,
  PluginManifest,
} from '../../../packages/luna-sdk/src'
import {
  getInstalledPlugin,
  readInstalledPlugins,
} from './installRegistry'

export type PluginOrigin = 'project' | 'user'

const LEGACY_USER_MANIFESTS_KEY = 'luna-user-plugin-manifests'

/** Manifestos em `.luna/plugins/<id>/plugin.json` (Vite eager glob). */
export function scanProjectPlugins(): PluginManifest[] {
  const loaders = import.meta.glob('../../../.luna/plugins/*/plugin.json', {
    eager: true,
    import: 'default',
  }) as Record<string, PluginManifest>
  return Object.values(loaders).filter((m) => m?.id && m?.name)
}

/** Manifestos instalados pelo utilizador (disco / userData). */
export function scanUserPlugins(): PluginManifest[] {
  const fromRegistry = readInstalledPlugins().map((r) => r.manifest)
  if (fromRegistry.length > 0) return fromRegistry

  try {
    const raw = localStorage.getItem(LEGACY_USER_MANIFESTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (m): m is PluginManifest =>
        Boolean(m) &&
        typeof m === 'object' &&
        typeof (m as PluginManifest).id === 'string',
    )
  } catch {
    return []
  }
}

const projectIds = (): Set<string> =>
  new Set(scanProjectPlugins().map((m) => m.id))

export function getPluginOrigin(id: string): PluginOrigin {
  return projectIds().has(id) ? 'project' : 'user'
}

export function getUserPluginRootPath(id: string): string | undefined {
  return getInstalledPlugin(id)?.rootPath
}

export function entryPathForPlugin(manifest: PluginManifest): string {
  const file = manifest.entry?.trim() || 'index.ts'
  return `../../../.luna/plugins/${manifest.id}/${file}`
}

export function getPluginEntryLoader(
  manifest: PluginManifest,
): (() => Promise<unknown>) | undefined {
  if (getPluginOrigin(manifest.id) === 'user') {
    return () => importUserPluginModule(manifest.id)
  }
  const path = entryPathForPlugin(manifest)
  const loaders = import.meta.glob('../../../.luna/plugins/*/index.ts')
  return loaders[path] as (() => Promise<unknown>) | undefined
}

/** URL resolvível para `import()` no worker ou thread principal. */
export async function resolvePluginEntryUrl(
  manifest: PluginManifest,
  onBlobUrl?: (url: string) => void,
): Promise<string> {
  const file = manifest.entry?.trim() || 'index.ts'
  if (getPluginOrigin(manifest.id) === 'user') {
    const bridge = window.plugins
    if (!bridge?.readEntry) {
      throw new Error(
        'Plugins instalados requerem a aplicação desktop ou recarregue após copiar para .luna/plugins/.',
      )
    }
    const result = await bridge.readEntry(manifest.id)
    if (!result.ok) {
      throw new Error(result.error ?? 'Não foi possível ler o add-on.')
    }
    const blob = new Blob([result.source], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    onBlobUrl?.(url)
    return url
  }
  return new URL(
    `../../../.luna/plugins/${manifest.id}/${file}`,
    import.meta.url,
  ).href
}

async function importUserPluginModule(
  pluginId: string,
): Promise<LunaPluginModule> {
  const manifest = readInstalledPlugins().find((r) => r.manifest.id === pluginId)
    ?.manifest
  if (!manifest) {
    throw new Error(`Add-on «${pluginId}» não encontrado.`)
  }
  const url = await resolvePluginEntryUrl(manifest)
  try {
    return (await import(/* @vite-ignore */ url)) as LunaPluginModule
  } finally {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url)
  }
}
