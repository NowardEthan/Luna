import i18n from '../../i18n'
import type { CloudSyncState } from '../../types/cloudSync'

export function conversationCloudSyncLabel(state: CloudSyncState): string {
  const map: Record<CloudSyncState, string> = {
    local: 'history.syncLocal',
    pending: 'history.syncPending',
    syncing: 'history.syncSyncing',
    synced: 'history.syncSynced',
    error: 'history.syncError',
  }
  return i18n.t(map[state])
}

export function folderCloudSyncLabel(state: CloudSyncState): string {
  const map: Record<CloudSyncState, string> = {
    local: 'history.syncFolderLocal',
    pending: 'history.syncFolderPending',
    syncing: 'history.syncFolderSyncing',
    synced: 'history.syncFolderSynced',
    error: 'history.syncFolderError',
  }
  return i18n.t(map[state])
}

export function conversationCloudSyncTitle(
  itemLabel: string,
  enabled: boolean,
  state: CloudSyncState,
  lastError?: string,
): string {
  if (!enabled) return i18n.t('history.syncSaveItem', { name: itemLabel })
  if (state === 'syncing') return i18n.t('history.syncSyncing')
  if (state === 'pending') return i18n.t('history.syncPending')
  if (state === 'error') {
    return lastError
      ? i18n.t('history.syncErrorDetail', { error: lastError })
      : i18n.t('history.syncError')
  }
  if (state === 'synced') return i18n.t('history.syncInCloudRemove')
  return i18n.t('history.removeFromCloud')
}

export function folderCloudSyncTitle(
  folderName: string,
  enabled: boolean,
  state: CloudSyncState,
  lastError?: string,
): string {
  if (!enabled) return i18n.t('history.syncSyncFolder', { name: folderName })
  if (state === 'syncing') return i18n.t('history.syncFolderSyncing')
  if (state === 'pending') return i18n.t('history.syncFolderPending')
  if (state === 'error') {
    return lastError
      ? `${i18n.t('history.syncFolderError')}: ${lastError}`
      : i18n.t('history.syncFolderError')
  }
  if (state === 'synced') {
    return i18n.t('history.syncFolderSyncedOff', {
      label: i18n.t('history.syncFolderSynced'),
    })
  }
  return i18n.t('history.syncTurnOffFolder', { name: folderName })
}
