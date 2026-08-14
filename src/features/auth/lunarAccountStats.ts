import { hydrateFromLocalStorage } from '../chat/state/conversationPersistence'
import { foldersForCloudSync, conversationsForCloudSync } from '../sync/cloudSyncFolders'
import type { Conversation } from '../../types/chat'

export type LunarLocalCloudStats = {
  conversationsTotal: number
  conversationsInCloud: number
  foldersTotal: number
  foldersInCloud: number
  messagesInCloud: number
  estimatedBytes: number
}

export type LunarRemoteCloudStats = {
  conversationCount: number
  estimatedBytes: number
}

export function readLocalCloudStats(uid?: string | null): LunarLocalCloudStats {
  const state = hydrateFromLocalStorage(uid)
  const conversations = state?.conversations ?? []
  const folders = state?.folders ?? []
  const inCloud = conversationsForCloudSync(conversations)
  const cloudFolders = foldersForCloudSync(folders, conversations)

  let messagesInCloud = 0
  let estimatedBytes = 0
  for (const c of inCloud) {
    messagesInCloud += c.messages.length
    estimatedBytes += estimateConversationBytes(c)
  }
  estimatedBytes += JSON.stringify(cloudFolders).length

  return {
    conversationsTotal: conversations.length,
    conversationsInCloud: inCloud.length,
    foldersTotal: folders.length,
    foldersInCloud: cloudFolders.length,
    messagesInCloud,
    estimatedBytes,
  }
}

function estimateConversationBytes(c: Conversation): number {
  try {
    return JSON.stringify(c).length
  } catch {
    return 0
  }
}
