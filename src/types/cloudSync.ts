/** Estado visual do item na nuvem (runtime + persistido). */
export type CloudSyncState =
  | 'local'
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'error'

/** Preferência do utilizador + último resultado conhecido. */
export type CloudSyncMeta = {
  enabled: boolean
  lastSyncedAt?: number
  lastError?: string
}

export function isCloudSyncEnabled(meta?: CloudSyncMeta): boolean {
  return meta?.enabled === true
}

export function resolveCloudSyncState(
  meta: CloudSyncMeta | undefined,
  runtime: CloudSyncState | null,
  hasPendingChanges = false,
): CloudSyncState {
  if (runtime) return runtime
  if (!meta?.enabled) return 'local'
  if (meta.lastError) return 'error'
  if (hasPendingChanges) return 'pending'
  if (meta.lastSyncedAt) return 'synced'
  // Ativado mas ainda sem envio concluído (ex.: debounce antes do push).
  return 'pending'
}
