import type { ChatFolder, Conversation } from '../../types/chat'
import type { CloudSyncMeta, CloudSyncState } from '../../types/cloudSync'
import { isCloudSyncEnabled, resolveCloudSyncState } from '../../types/cloudSync'
import { cloudSyncService } from './cloudSyncService'
import { collectFolderSubtreeConversationIds } from './cloudSyncFolders'

/** Estado visual agregado a partir das conversas na subárvore (testável). */
export function resolveFolderCloudSyncStateFromSubtree(
  meta: CloudSyncMeta | undefined,
  runtime: CloudSyncState | null,
  subtreePending: boolean,
  childStates: CloudSyncState[],
): CloudSyncState {
  if (runtime) return runtime
  if (!isCloudSyncEnabled(meta)) return 'local'
  if (meta?.lastError) return 'error'
  if (childStates.some((s) => s === 'error')) return 'error'
  if (childStates.some((s) => s === 'syncing')) return 'syncing'
  if (childStates.some((s) => s === 'pending') || subtreePending) return 'pending'
  if (childStates.length > 0 && childStates.every((s) => s === 'synced')) {
    return 'synced'
  }
  if (meta?.lastSyncedAt) return 'synced'
  return 'pending'
}

export function resolveFolderCloudSyncState(
  folderId: string,
  meta: CloudSyncMeta | undefined,
  folders: ChatFolder[],
  conversations: Conversation[],
): CloudSyncState {
  const convIds = collectFolderSubtreeConversationIds(
    folderId,
    folders,
    conversations,
  )
  const childStates = conversations
    .filter((c) => convIds.includes(c.id) && isCloudSyncEnabled(c.cloudSync))
    .map((c) =>
      resolveCloudSyncState(
        c.cloudSync,
        cloudSyncService.getRuntimeState(c.id),
        cloudSyncService.hasPendingChanges(c.id),
      ),
    )

  return resolveFolderCloudSyncStateFromSubtree(
    meta,
    cloudSyncService.getRuntimeState(folderId),
    cloudSyncService.hasPendingChanges(folderId),
    childStates,
  )
}

export const FOLDER_CLOUD_SYNC_LABEL: Record<CloudSyncState, string> = {
  local: 'Pasta só neste dispositivo',
  pending: 'Conversas desta pasta por enviar',
  syncing: 'A enviar pasta e conversas…',
  synced: 'Pasta e conversas na nuvem',
  error: 'Erro ao sincronizar esta pasta',
}

export function folderCloudSyncTitle(
  folderName: string,
  enabled: boolean,
  state: CloudSyncState,
  lastError?: string,
): string {
  if (!enabled) return `Sincronizar pasta «${folderName}» e todas as conversas dentro`
  if (state === 'syncing') return FOLDER_CLOUD_SYNC_LABEL.syncing
  if (state === 'pending') return FOLDER_CLOUD_SYNC_LABEL.pending
  if (state === 'error') {
    return lastError
      ? `${FOLDER_CLOUD_SYNC_LABEL.error}: ${lastError}`
      : FOLDER_CLOUD_SYNC_LABEL.error
  }
  if (state === 'synced') {
    return `${FOLDER_CLOUD_SYNC_LABEL.synced} — clique para desligar`
  }
  return `Desligar nuvem da pasta «${folderName}»`
}
