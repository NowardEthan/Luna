const PREFIX = 'luna-checkpoint-'

export type LunaCheckpoint = {
  id: string
  convId: string
  createdAt: number
  label: string
  files: { path: string; content: string }[]
}

function storageKey(convId: string): string {
  return `${PREFIX}${convId}`
}

export function saveCheckpoint(cp: LunaCheckpoint): void {
  try {
    const key = storageKey(cp.convId)
    const raw = globalThis.localStorage?.getItem(key)
    const list: LunaCheckpoint[] = raw ? (JSON.parse(raw) as LunaCheckpoint[]) : []
    list.unshift(cp)
    globalThis.localStorage?.setItem(
      key,
      JSON.stringify(list.slice(0, 12)),
    )
  } catch {
    /* ignore */
  }
}

export function listCheckpoints(convId: string): LunaCheckpoint[] {
  try {
    const raw = globalThis.localStorage?.getItem(storageKey(convId))
    if (!raw) return []
    return JSON.parse(raw) as LunaCheckpoint[]
  } catch {
    return []
  }
}

export function restoreCheckpoint(
  convId: string,
  checkpointId: string,
): LunaCheckpoint | null {
  return listCheckpoints(convId).find((c) => c.id === checkpointId) ?? null
}
