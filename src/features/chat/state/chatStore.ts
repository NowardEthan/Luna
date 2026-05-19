import type {

  ConversationStore,

  ConversationStoreSnapshot,

} from '../../../core/conversation/ConversationStore'

import type { Message } from '../../../types/chat'

import type { MemoryNote, MemoryUiPrefs } from '../../../types/memory'

import { nextId } from './conversationPersistence'



export class ChatStore implements ConversationStore {

  readonly id = 'chat'



  private readonly getState: () => ConversationStoreSnapshot

  private readonly actions: {

    createConversation: (opts?: { folderId?: string }) => string

    selectConversation: (id: string) => void

    deleteConversation: (id: string) => void

    renameConversation: (id: string, title: string) => void

    togglePinConversation: (id: string) => void

    moveConversationToFolder: (id: string, folderId: string | null) => void

    appendMessage?: (convId: string, message: Message) => void

    updateMessage?: (

      convId: string,

      messageId: string,

      patch: Partial<Message>,

    ) => void

    setMemoryNotes?: (notes: MemoryNote[]) => void

    setMemoryUi?: (ui: MemoryUiPrefs) => void

  }



  constructor(

    getState: () => ConversationStoreSnapshot,

    actions: ChatStore['actions'],

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



  getMessages(convId?: string): Message[] {

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



  appendMessage(convId: string, message: Message): void {

    this.actions.appendMessage?.(convId, message)

  }



  updateMessage(

    convId: string,

    messageId: string,

    patch: Partial<Message>,

  ): void {

    this.actions.updateMessage?.(convId, messageId, patch)

  }



  getMemoryNotes(): MemoryNote[] {

    return this.getState().userMemory.memoryNotes ?? []

  }



  setMemoryNotes(notes: MemoryNote[]): void {

    this.actions.setMemoryNotes?.(notes)

  }



  setMemoryUi(ui: MemoryUiPrefs): void {

    this.actions.setMemoryUi?.(ui)

  }



  nextId(): string {

    return nextId()

  }

}

