import type { LunaFileEntry } from '../../lib/lunaFileExplorer'

export type FileSortKey = 'name' | 'date' | 'size'

export function sortEntries(
  entries: LunaFileEntry[],
  key: FileSortKey,
  dir: 'asc' | 'desc',
): LunaFileEntry[] {
  const mul = dir === 'asc' ? 1 : -1
  return [...entries].sort((a, b) => {
    const aDir = a.type === 'directory'
    const bDir = b.type === 'directory'
    if (aDir !== bDir) return aDir ? -1 : 1
    if (key === 'name') {
      return mul * a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' })
    }
    if (key === 'size') {
      return mul * (a.size - b.size)
    }
    return mul * (a.modifiedAt - b.modifiedAt)
  })
}

/** Segmentos de breadcrumb para caminhos Windows ou POSIX. */
export function splitPathSegments(dirPath: string): { label: string; path: string }[] {
  if (!dirPath.trim()) return []
  const normalized = dirPath.replace(/\//g, '\\')
  const parts = normalized.split('\\').filter(Boolean)
  const crumbs: { label: string; path: string }[] = []
  let acc = ''
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (i === 0 && /^[a-zA-Z]:$/.test(part)) {
      acc = `${part}\\`
      crumbs.push({ label: part, path: acc })
    } else if (i === 0 && /^[a-zA-Z]:/.test(part)) {
      acc = part
      crumbs.push({ label: part.slice(0, 2), path: acc })
    } else {
      acc = acc ? `${acc}\\${part}` : part
      crumbs.push({ label: part, path: acc })
    }
  }
  return crumbs
}
