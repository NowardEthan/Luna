import { describe, expect, it } from 'vitest'
import { ChatStore } from './chatStore'
import type { ConversationStoreSnapshot } from '../../../core/conversation/ConversationStore'

describe('ChatStore', () => {
  it('implementa getSnapshot e acoes de conversa', () => {
    const snap: ConversationStoreSnapshot = {
      conversations: [
        { id: 'c1', title: 'T', messages: [], updatedAt: 0, folderId: null },
      ],
      folders: [],
      activeId: 'c1',
      messages: [],
      userMemory: {
        memoryNotes: [],
        crossChatEnabled: true,
        conversationSearchEnabled: true,
        memoryUi: {},
      },
      ragEnabled: false,
    }
    let state = snap
    const store = new ChatStore(
      () => state,
      {
        createConversation: () => 'c2',
        selectConversation: (id) => {
          state = { ...state, activeId: id }
        },
        deleteConversation: () => {},
        renameConversation: () => {},
        togglePinConversation: () => {},
        moveConversationToFolder: () => {},
      },
    )
    expect(store.getSnapshot().activeId).toBe('c1')
    store.selectConversation('c2')
    expect(store.getSnapshot().activeId).toBe('c2')
  })
})
