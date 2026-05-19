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

export function deleteCheckpoint(convId: string, checkpointId: string): void {
  try {
    const key = storageKey(convId)
    const list = listCheckpoints(convId).filter((c) => c.id !== checkpointId)
    if (!list.length) {
      globalThis.localStorage?.removeItem(key)
      return
    }
    globalThis.localStorage?.setItem(key, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

/** ID usado ao gravar checkpoints antes de aplicar patches no workspace. */
export const WORKSPACE_CHECKPOINT_CONV_ID = 'workspace'
