import type { ChatFolder, Conversation, Message } from '../../types/chat'

import type { MemoryNote, MemoryUiPrefs, UserMemoryState } from '../../types/memory'



export type ConversationStoreSnapshot = {

  conversations: Conversation[]

  folders: ChatFolder[]

  activeId: string | null

  messages: Message[]

  userMemory: UserMemoryState

  ragEnabled: boolean

}



export interface ConversationStore {

  readonly id: string

  getSnapshot(): ConversationStoreSnapshot

  createConversation(opts?: { folderId?: string }): string

  selectConversation(id: string): void

  deleteConversation(id: string): void

  renameConversation(id: string, title: string): void

  togglePinConversation(id: string): void

  moveConversationToFolder(id: string, folderId: string | null): void

  getConversations(): Conversation[]

  getMessages(convId?: string): Message[]

  appendMessage(convId: string, message: Message): void

  updateMessage(

    convId: string,

    messageId: string,

    patch: Partial<Message>,

  ): void

  getMemoryNotes(): MemoryNote[]

  setMemoryNotes(notes: MemoryNote[]): void

  setMemoryUi(ui: MemoryUiPrefs): void

  nextId(): string

}

