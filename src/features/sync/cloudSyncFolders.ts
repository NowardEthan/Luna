import type { ChatFolder, Conversation } from '../../types/chat'
import { getConversationIdsInFolderSubtree } from '../history/folderTree'

/**
 * Cloud-first: todas as pastas são sincronizadas.
 * Mantém a assinatura para compatibilidade.
 */
export function foldersForCloudSync(
  folders: ChatFolder[],
  _conversations: Conversation[],
): ChatFolder[] {
  return folders
}

/**
 * Cloud-first: todas as conversas são sincronizadas.
 * Mantém a assinatura para compatibilidade.
 */
export function conversationsForCloudSync(
  conversations: Conversation[],
): Conversation[] {
  return conversations
}

export function collectFolderSubtreeConversationIds(
  folderId: string,
  folders: ChatFolder[],
  conversations: Conversation[],
): string[] {
  return getConversationIdsInFolderSubtree(folderId, folders, conversations)
}
