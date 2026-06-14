import type { FinanceMeta, FinanceTombstones } from './types'

export type FinanceTombstoneCollection = keyof FinanceTombstones

export function markFinanceTombstone(
  meta: FinanceMeta,
  collection: FinanceTombstoneCollection,
  id: string,
  deletedAt: string,
): FinanceMeta {
  const prev = meta.tombstones?.[collection] ?? {}
  return {
    ...meta,
    tombstones: {
      ...meta.tombstones,
      [collection]: { ...prev, [id]: deletedAt },
    },
  }
}

export function clearFinanceTombstone(
  meta: FinanceMeta,
  collection: FinanceTombstoneCollection,
  id: string,
): FinanceMeta {
  const map = meta.tombstones?.[collection]
  if (!map?.[id]) return meta
  const { [id]: _removed, ...rest } = map
  const nextCol = Object.keys(rest).length > 0 ? rest : undefined
  const tombstones = { ...meta.tombstones }
  if (nextCol) tombstones[collection] = nextCol
  else delete tombstones[collection]
  return {
    ...meta,
    tombstones: Object.keys(tombstones).length > 0 ? tombstones : undefined,
  }
}

export function mergeFinanceTombstones(
  local?: FinanceTombstones,
  remote?: FinanceTombstones,
): FinanceTombstones | undefined {
  if (!local && !remote) return undefined
  const out: FinanceTombstones = { ...(local ?? {}) }
  for (const col of Object.keys(remote ?? {}) as FinanceTombstoneCollection[]) {
    const remoteMap = remote?.[col]
    if (!remoteMap) continue
    const merged = { ...out[col] }
    for (const [id, t] of Object.entries(remoteMap)) {
      const prev = merged[id]
      if (!prev || t > prev) merged[id] = t
    }
    out[col] = merged
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function getCollectionTombstones(
  meta: FinanceMeta,
  collection: FinanceTombstoneCollection,
): Record<string, string> {
  return meta.tombstones?.[collection] ?? {}
}
