import type { LoadedPlugin } from '../../core/plugin/PluginHost'
import type { PluginOrigin } from '../../core/plugin/paths'

export type AddonListItem = LoadedPlugin & {
  origin: PluginOrigin
  installPath?: string
}

export function filterAddons(
  items: AddonListItem[],
  query: string,
  enabledOnly: boolean,
): AddonListItem[] {
  const q = query.trim().toLowerCase()
  return items.filter((p) => {
    if (enabledOnly && !p.enabled) return false
    if (!q) return true
    const hay = [
      p.manifest.name,
      p.manifest.id,
      p.manifest.description ?? '',
      p.manifest.version,
    ]
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}
