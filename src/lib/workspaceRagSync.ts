import { eventBus } from '../core/events/EventBus'
import { ragIndexFiles } from './ragClient'

const DEBOUNCE_MS = 2800
const RAG_SYNC_KEY = 'luna-rag-sync'

let pendingPaths = new Set<string>()
let timer: ReturnType<typeof setTimeout> | null = null
let flushing = false

export function readWorkspaceRagSyncEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem(RAG_SYNC_KEY) !== '0'
  } catch {
    return true
  }
}

export function writeWorkspaceRagSyncEnabled(enabled: boolean): void {
  try {
    globalThis.localStorage?.setItem(RAG_SYNC_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function scheduleWorkspaceRagSync(paths: string[]): void {
  if (!readWorkspaceRagSyncEnabled()) return
  const normalized = paths.map((p) => p.trim()).filter(Boolean)
  if (!normalized.length) return
  for (const p of normalized) pendingPaths.add(p)
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    void flushWorkspaceRagSync()
  }, DEBOUNCE_MS)
}

export async function flushWorkspaceRagSync(): Promise<void> {
  if (flushing || pendingPaths.size === 0) return
  flushing = true
  const batch = [...pendingPaths]
  pendingPaths.clear()
  timer = null
  try {
    const res = await ragIndexFiles(batch)
    eventBus.emit('rag:sync:complete', {
      paths: batch,
      ok: res.ok,
      chunksIndexed: res.ok ? res.chunksIndexed : 0,
    })
  } finally {
    flushing = false
  }
}
