export const WORKSPACE_CONFIG_KEY = 'luna-workspace-v2'
export const WORKSPACE_ROOT_LEGACY_KEY = 'luna-workspace-root'

export type WorkspaceFolder = {
  path: string
}

export type WorkspaceConfig = {
  version: 2
  folders: WorkspaceFolder[]
  primaryIndex: number
}

function normalizePath(p: string): string {
  return p.replace(/[/\\]+$/, '')
}

export function primaryPath(config: WorkspaceConfig | null): string | null {
  if (!config?.folders.length) return null
  const idx = Math.min(
    Math.max(0, config.primaryIndex),
    config.folders.length - 1,
  )
  return normalizePath(config.folders[idx]!.path)
}

export function folderPaths(config: WorkspaceConfig | null): string[] {
  if (!config?.folders.length) return []
  return config.folders.map((f) => normalizePath(f.path))
}

export function loadWorkspaceConfig(): WorkspaceConfig | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as WorkspaceConfig
      if (
        parsed?.version === 2 &&
        Array.isArray(parsed.folders) &&
        parsed.folders.length > 0
      ) {
        const folders = parsed.folders
          .map((f) => ({ path: String(f?.path ?? '').trim() }))
          .filter((f) => f.path.length > 0)
        if (!folders.length) return null
        return {
          version: 2,
          folders,
          primaryIndex: Number.isFinite(parsed.primaryIndex)
            ? Math.max(0, parsed.primaryIndex)
            : 0,
        }
      }
    }
  } catch {
    /* ignore */
  }
  return migrateFromLegacy()
}

function migrateFromLegacy(): WorkspaceConfig | null {
  try {
    const legacy = localStorage.getItem(WORKSPACE_ROOT_LEGACY_KEY)?.trim()
    if (!legacy) return null
    const config: WorkspaceConfig = {
      version: 2,
      folders: [{ path: legacy }],
      primaryIndex: 0,
    }
    saveWorkspaceConfig(config)
    localStorage.removeItem(WORKSPACE_ROOT_LEGACY_KEY)
    return config
  } catch {
    return null
  }
}

export function saveWorkspaceConfig(config: WorkspaceConfig | null): void {
  try {
    if (!config?.folders.length) {
      localStorage.removeItem(WORKSPACE_CONFIG_KEY)
      return
    }
    localStorage.setItem(WORKSPACE_CONFIG_KEY, JSON.stringify(config))
  } catch {
    /* ignore */
  }
}

export function configFromPaths(paths: string[]): WorkspaceConfig | null {
  const folders = paths
    .map((p) => normalizePath(p.trim()))
    .filter((p) => p.length > 0)
  if (!folders.length) return null
  const unique: WorkspaceFolder[] = []
  const seen = new Set<string>()
  for (const path of folders) {
    const key = path.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push({ path })
  }
  return { version: 2, folders: unique, primaryIndex: 0 }
}

export function pathBelongsToFolder(filePath: string, folderPath: string): boolean {
  const file = normalizePath(filePath)
  const folder = normalizePath(folderPath)
  if (!file || !folder) return false
  const sep = folder.includes('\\') ? '\\' : '/'
  const fileLower = file.toLowerCase()
  const folderLower = folder.toLowerCase()
  return (
    fileLower === folderLower ||
    fileLower.startsWith(`${folderLower}${sep}`)
  )
}

export function pathBelongsToWorkspace(
  filePath: string,
  folders: string[],
): boolean {
  return folders.some((f) => pathBelongsToFolder(filePath, f))
}

export function findWorkspaceRootForPath(
  filePath: string,
  folders: string[],
): string | null {
  const trimmed = filePath.trim()
  if (!trimmed) return null
  let best: string | null = null
  let bestLen = -1
  for (const folder of folders) {
    if (!pathBelongsToFolder(trimmed, folder)) continue
    const len = normalizePath(folder).length
    if (len > bestLen) {
      bestLen = len
      best = normalizePath(folder)
    }
  }
  return best
}
