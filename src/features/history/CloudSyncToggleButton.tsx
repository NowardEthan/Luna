import type { ChatFolder, Conversation } from '../../types/chat'
import type { CloudSyncMeta } from '../../types/cloudSync'
import { isCloudSyncEnabled, resolveCloudSyncState } from '../../types/cloudSync'
import { resolveFolderCloudSyncState } from '../sync/folderCloudSyncState'
import {
  conversationCloudSyncTitle,
  folderCloudSyncTitle,
} from './historyCloudSyncLabels'
import { cloudSyncService } from '../sync/cloudSyncService'
import { useCloudSyncTick } from '../sync/useCloudSyncTick'
import { CloudSyncIndicator } from './CloudSyncIndicator'
import { CloudUploadIcon } from './cloudIcons'
import {
  lunaCloudSyncBtnClass,
  lunaCloudSyncVisualState,
  type LunaCloudSyncSurface,
} from '../../lib/lunaVisual'

type Props = {
  id: string
  meta?: CloudSyncMeta
  available: boolean
  onToggle: (enabled: boolean) => void
  itemLabel: string
  itemKind?: 'conversation' | 'folder'
  folders?: ChatFolder[]
  conversations?: Conversation[]
  /** Fundo neutro (listas) ou saturado (pasta seleccionada / drop). */
  surface?: LunaCloudSyncSurface
}

export function CloudSyncToggleButton({
  id,
  meta,
  available,
  onToggle,
  itemLabel,
  itemKind = 'conversation',
  folders = [],
  conversations = [],
  surface = 'neutral',
}: Props) {
  useCloudSyncTick()

  if (!available) return null

  const enabled = isCloudSyncEnabled(meta)
  const runtime = cloudSyncService.getRuntimeState(id)
  const pending = cloudSyncService.hasPendingChanges(id)
  const state =
    itemKind === 'folder'
      ? resolveFolderCloudSyncState(id, meta, folders, conversations)
      : resolveCloudSyncState(meta, runtime, pending)
  const title =
    itemKind === 'folder'
      ? folderCloudSyncTitle(itemLabel, enabled, state, meta?.lastError)
      : conversationCloudSyncTitle(itemLabel, enabled, state, meta?.lastError)
  const busy = state === 'syncing'
  const visual = lunaCloudSyncVisualState(enabled, state)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        if (!busy) onToggle(!enabled)
      }}
      disabled={busy}
      aria-pressed={enabled}
      aria-label={title}
      title={title}
      className={lunaCloudSyncBtnClass(surface, visual)}
    >
      {enabled ? (
        <CloudSyncIndicator
          id={id}
          meta={meta}
          fallback="outline"
          itemKind={itemKind}
          folders={folders}
          conversations={conversations}
        />
      ) : (
        <CloudUploadIcon size={15} className="shrink-0" />
      )}
    </button>
  )
}
