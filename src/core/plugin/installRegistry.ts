import type { PluginManifest } from '../../../packages/luna-sdk/src'

export type InstalledPluginRecord = {
  id: string
  rootPath: string
  manifest: PluginManifest
  installedAt: string
}

const STORAGE_KEY = 'luna-installed-plugins'

export function readInstalledPlugins(): InstalledPluginRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (r): r is InstalledPluginRecord =>
        Boolean(r) &&
        typeof r === 'object' &&
        typeof (r as InstalledPluginRecord).id === 'string' &&
        typeof (r as InstalledPluginRecord).rootPath === 'string' &&
        typeof (r as InstalledPluginRecord).manifest === 'object',
    )
  } catch {
    return []
  }
}

export function writeInstalledPlugins(records: InstalledPluginRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    /* ignore */
  }
}

export function addInstalledPlugin(record: InstalledPluginRecord): void {
  const list = readInstalledPlugins().filter((r) => r.id !== record.id)
  list.push(record)
  writeInstalledPlugins(list)
}

export function removeInstalledPlugin(id: string): void {
  writeInstalledPlugins(readInstalledPlugins().filter((r) => r.id !== id))
}

export function getInstalledPlugin(id: string): InstalledPluginRecord | undefined {
  return readInstalledPlugins().find((r) => r.id === id)
}
