import type { ChatFolder, Conversation } from '../../types/chat'
import { isCloudSyncEnabled } from '../../types/cloudSync'
import { getConversationIdsInFolderSubtree } from '../history/folderTree'

/** Pastas que devem ir no doc de settings na nuvem. */
export function foldersForCloudSync(
  folders: ChatFolder[],
  conversations: Conversation[],
): ChatFolder[] {
  const ids = new Set<string>()

  for (const f of folders) {
    if (isCloudSyncEnabled(f.cloudSync)) ids.add(f.id)
  }

  for (const c of conversations) {
    if (!isCloudSyncEnabled(c.cloudSync) || !c.folderId) continue
    let current: string | null = c.folderId
    const seen = new Set<string>()
    while (current) {
      if (seen.has(current)) break
      seen.add(current)
      ids.add(current)
      const folder = folders.find((x) => x.id === current)
      current = folder?.parentId ?? null
    }
  }

  return folders.filter((f) => ids.has(f.id))
}

export function conversationsForCloudSync(
  conversations: Conversation[],
): Conversation[] {
  return conversations.filter((c) => isCloudSyncEnabled(c.cloudSync))
}

export function collectFolderSubtreeConversationIds(
  folderId: string,
  folders: ChatFolder[],
  conversations: Conversation[],
): string[] {
  return getConversationIdsInFolderSubtree(folderId, folders, conversations)
}
