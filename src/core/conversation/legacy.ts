import type { ConversationStore, ConversationStoreSnapshot } from './ConversationStore'

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}



/** Adaptador para estado React legado em useConversations. */

export class LegacyConversationStore implements ConversationStore {

  readonly id = 'legacy'



  private readonly getState: () => ConversationStoreSnapshot

  private readonly actions: {

    createConversation: (opts?: { folderId?: string }) => string

    selectConversation: (id: string) => void

    deleteConversation: (id: string) => void

    renameConversation: (id: string, title: string) => void

    togglePinConversation: (id: string) => void

    moveConversationToFolder: (id: string, folderId: string | null) => void

  }



  constructor(

    getState: () => ConversationStoreSnapshot,

    actions: LegacyConversationStore['actions'],

  ) {

    this.getState = getState

    this.actions = actions

  }



  getSnapshot(): ConversationStoreSnapshot {

    return this.getState()

  }



  getConversations() {

    return this.getState().conversations

  }



  getMessages(convId?: string) {

    const snap = this.getState()

    const id = convId ?? snap.activeId

    if (!id) return []

    return snap.conversations.find((c) => c.id === id)?.messages ?? snap.messages

  }



  createConversation(opts?: { folderId?: string }): string {

    return this.actions.createConversation(opts)

  }



  selectConversation(id: string): void {

    this.actions.selectConversation(id)

  }



  deleteConversation(id: string): void {

    this.actions.deleteConversation(id)

  }



  renameConversation(id: string, title: string): void {

    this.actions.renameConversation(id, title)

  }



  togglePinConversation(id: string): void {

    this.actions.togglePinConversation(id)

  }



  moveConversationToFolder(id: string, folderId: string | null): void {

    this.actions.moveConversationToFolder(id, folderId)

  }



  appendMessage(): void {

    /* legado — use ChatStore */

  }



  updateMessage(): void {

    /* legado */

  }



  getMemoryNotes() {

    return this.getState().userMemory.memoryNotes ?? []

  }



  setMemoryNotes(): void {

    /* legado */

  }



  setMemoryUi(): void {

    /* legado */

  }



  nextId(): string {

    return nextId()

  }

}

