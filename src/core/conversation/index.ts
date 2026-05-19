export type { ConversationStore, ConversationStoreSnapshot } from './ConversationStore'
export { LegacyConversationStore } from './legacy'

let activeStore: import('./ConversationStore').ConversationStore | null = null

export function setConversationStore(
  store: import('./ConversationStore').ConversationStore | null,
): void {
  activeStore = store
}

export function getConversationStore():
  | import('./ConversationStore').ConversationStore
  | null {
  return activeStore
}
