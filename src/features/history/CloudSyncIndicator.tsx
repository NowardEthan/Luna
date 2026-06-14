import type { ChatFolder, Conversation } from '../../types/chat'
import type { CloudSyncMeta } from '../../types/cloudSync'
import { resolveCloudSyncState } from '../../types/cloudSync'
import { resolveFolderCloudSyncState } from '../sync/folderCloudSyncState'
import {
  conversationCloudSyncLabel,
  folderCloudSyncLabel,
} from './historyCloudSyncLabels'
import { cloudSyncService } from '../sync/cloudSyncService'
import { useCloudSyncTick } from '../sync/useCloudSyncTick'
import {
  CloudDoneIcon,
  CloudErrorIcon,
  CloudOutlineIcon,
  CloudUploadIcon,
} from './cloudIcons'

type Props = {
  id: string
  meta?: CloudSyncMeta
  className?: string
  /** Quando ativo, nunca deixa o botão vazio (estado local inesperado). */
  fallback?: 'outline' | 'upload'
  itemKind?: 'conversation' | 'folder'
  folders?: ChatFolder[]
  conversations?: Conversation[]
}

export function CloudSyncIndicator({
  id,
  meta,
  className = '',
  fallback,
  itemKind = 'conversation',
  folders = [],
  conversations = [],
}: Props) {
  useCloudSyncTick()
  const runtime = cloudSyncService.getRuntimeState(id)
  const pending = cloudSyncService.hasPendingChanges(id)
  const state =
    itemKind === 'folder'
      ? resolveFolderCloudSyncState(id, meta, folders, conversations)
      : resolveCloudSyncState(meta, runtime, pending)

  if (state === 'local') {
    if (!fallback) return null
    const FallbackIcon = fallback === 'upload' ? CloudUploadIcon : CloudOutlineIcon
    return (
      <span
        className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
        role="status"
        aria-hidden
      >
        <FallbackIcon size={15} className="text-current opacity-70" />
      </span>
    )
  }

  const labelFor = itemKind === 'folder' ? folderCloudSyncLabel : conversationCloudSyncLabel
  const title =
    state === 'error' && meta?.lastError
      ? `${labelFor('error')}: ${meta.lastError}`
      : labelFor(state)

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      title={title}
      aria-label={title}
      role="status"
    >
      {state === 'syncing' ? (
        <>
          <CloudOutlineIcon size={15} className="text-current" />
          <span className="absolute -inset-0.5 animate-spin rounded-full border border-current border-t-transparent opacity-50" />
        </>
      ) : state === 'pending' ? (
        <span className="relative">
          <CloudOutlineIcon size={15} className="text-current" />
          <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-current" />
        </span>
      ) : state === 'synced' ? (
        <CloudDoneIcon size={15} className="text-current" />
      ) : state === 'error' ? (
        <CloudErrorIcon size={15} className="text-current" />
      ) : (
        <CloudOutlineIcon size={15} className="text-current opacity-70" />
      )}
    </span>
  )
}
