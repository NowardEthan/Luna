import type { ChatFolder, Conversation } from '../../../types/chat'
import {
  STORAGE_KEY,
  deriveTitle,
  initialStore,
  sanitizeState,
  welcomeMessages,
  type StoredState,
} from '../../../lib/conversationStorage'

export {
  STORAGE_KEY,
  deriveTitle,
  initialStore,
  sanitizeState,
  welcomeMessages,
}
export type { StoredState }

export function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function sortByUpdated(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    const ap = a.pinned ? 1 : 0
    const bp = b.pinned ? 1 : 0
    if (ap !== bp) return bp - ap
    return b.updatedAt - a.updatedAt
  })
}

export function seedStoreAfterDelete(): {
  conversations: Conversation[]
  folders: ChatFolder[]
  activeId: string
} {
  const id = nextId()
  const msgs = welcomeMessages(nextId)
  return {
    activeId: id,
    folders: [],
    conversations: sortByUpdated([
      {
        id,
        title: deriveTitle(msgs),
        folderId: null,
        messages: msgs,
        updatedAt: Date.now(),
      },
    ]),
  }
}

export function hydrateFromLocalStorage(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return sanitizeState(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export function persistToLocalStorage(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}
