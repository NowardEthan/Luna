import { useCallback, useEffect, useState } from 'react'
import type { ChatFolder } from '../types/chat'
import { setConversationStore } from '../core/conversation'
import { eventBus } from '../core/events/EventBus'
import { isChatMemoryAvailable, syncChatMemoryFromConversations } from '../lib/chatMemoryClient'
import { ChatStore } from '../features/chat/state/chatStore'
import {
  hydrateFromLocalStorage,
  initialStore,
  nextId,
  persistToLocalStorage,
  sortByUpdated,
} from '../features/chat/state/conversationPersistence'
import { useConversationListStore } from '../features/chat/state/conversationListStore'
import { useFolderStore } from '../features/chat/state/folderStore'
import { useUserMemoryStore } from '../features/chat/state/userMemoryStore'
import { useModelCatalogStore } from '../features/chat/state/modelCatalogStore'
import { useAgentTurnService } from '../features/chat/state/agentTurnService'
import { cloudSyncService } from '../features/sync/cloudSyncService'

export type { SendMessageOptions } from '../features/chat/state/agentTurnService'

export function useConversations() {
  const [hydrated, setHydrated] = useState(false)
  const [folders, setFolders] = useState<ChatFolder[]>([])

  const list = useConversationListStore(hydrated, folders, (reset) => {
    setFolders(reset.folders)
  })
  const folder = useFolderStore(folders, setFolders, list.setConversations)
  const memory = useUserMemoryStore(hydrated)
  const model = useModelCatalogStore()

  useEffect(() => {
    queueMicrotask(() => {
      const parsed = hydrateFromLocalStorage()
      if (parsed) {
        list.setConversations(parsed.conversations)
        setFolders(parsed.folders)
        list.setActiveId(parsed.activeId)
      } else {
        const init = initialStore(nextId)
        list.setConversations(init.conversations)
        setFolders(init.folders)
        list.setActiveId(init.activeId)
      }
      setHydrated(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once on mount
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const snapshot = {
      conversations: list.conversations,
      folders,
      activeId: list.activeId,
    }
    persistToLocalStorage(snapshot)
    cloudSyncService.schedulePush(snapshot)
  }, [list.conversations, folders, list.activeId, hydrated])

  useEffect(() => {
    if (!hydrated || !isChatMemoryAvailable()) return
    const t = window.setTimeout(() => {
      void syncChatMemoryFromConversations(list.conversations)
    }, 2200)
    return () => window.clearTimeout(t)
  }, [hydrated, list.conversations])

  const turn = useAgentTurnService({
    activeId: list.activeId,
    conversations: list.conversations,
    messages: list.messages,
    personalityId: model.personalityId,
    ragEnabled: model.ragEnabled,
    reasoningEnabled: model.reasoningEnabled,
    llmSelection: model.llmSelection,
    updateConversation: list.updateConversation,
    userMemoryRef: memory.userMemoryRef,
    setUserMemory: memory.setUserMemory,
  })

  useEffect(() => {
    const store = new ChatStore(
      () => ({
        conversations: list.conversations,
        folders: folder.foldersSorted,
        activeId: list.activeId,
        messages: list.messages,
        userMemory: memory.userMemory,
        ragEnabled: model.ragEnabled,
      }),
      {
        createConversation: list.createConversation,
        selectConversation: list.selectConversation,
        deleteConversation: list.deleteConversationById,
        renameConversation: list.renameConversation,
        togglePinConversation: list.togglePinConversation,
        moveConversationToFolder: list.moveConversationToFolder,
        appendMessage: (convId, message) => {
          list.updateConversation(convId, (c) => ({
            ...c,
            messages: [...c.messages, message],
            updatedAt: Date.now(),
          }))
        },
        updateMessage: (convId, messageId, patch) => {
          list.updateConversation(convId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === messageId ? { ...m, ...patch } : m,
            ),
            updatedAt: Date.now(),
          }))
        },
        setMemoryNotes: (notes) => {
          memory.setUserMemory((prev) => ({
            ...prev,
            memoryNotes: notes,
            updatedAt: Date.now(),
          }))
        },
        setMemoryUi: (ui) => {
          memory.setUserMemory((prev) => ({
            ...prev,
            memoryUi: ui,
            updatedAt: Date.now(),
          }))
        },
      },
    )
    setConversationStore(store)
    return () => setConversationStore(null)
  }, [
    list.conversations,
    folder.foldersSorted,
    list.activeId,
    list.messages,
    memory.userMemory,
    model.ragEnabled,
    list.createConversation,
    list.selectConversation,
    list.deleteConversationById,
    list.renameConversation,
    list.togglePinConversation,
    list.moveConversationToFolder,
    list.updateConversation,
    memory.setUserMemory,
  ])

  const createConversationWithEvent = useCallback(
    (opts?: { folderId?: string }) => {
      const id = list.createConversation(opts)
      eventBus.emit('conversation:created', { id })
      return id
    },
    [list.createConversation],
  )

  const selectConversationWithEvent = useCallback(
    (id: string) => {
      list.selectConversation(id)
      eventBus.emit('conversation:selected', { id })
    },
    [list.selectConversation],
  )

  return {
    hydrated,
    conversations: sortByUpdated(list.conversations),
    folders: folder.foldersSorted,
    activeId: list.activeId,
    messages: list.messages,
    createConversation: createConversationWithEvent,
    selectConversation: selectConversationWithEvent,
    deleteConversationById: list.deleteConversationById,
    removeActiveConversation: list.removeActiveConversation,
    sendMessage: turn.sendMessage,
    redoRegenerateAt: turn.redoRegenerateAt,
    canRedoMessage: turn.canRedoMessage,
    cancelAgentTurn: turn.cancelAgentTurn,
    renameConversation: list.renameConversation,
    togglePinConversation: list.togglePinConversation,
    moveConversationToFolder: list.moveConversationToFolder,
    createFolder: folder.createFolder,
    renameFolder: folder.renameFolder,
    deleteFolder: folder.deleteFolder,
    ragEnabled: model.ragEnabled,
    setRagEnabled: model.setRagEnabled,
    reasoningEnabled: model.reasoningEnabled,
    setReasoningEnabled: model.setReasoningEnabled,
    personalityId: model.personalityId,
    setPersonality: model.setPersonality,
    memoryCrossChatEnabled: memory.userMemory.crossChatEnabled,
    setMemoryCrossChatEnabled: memory.setMemoryCrossChatEnabled,
    memoryConversationSearchEnabled:
      memory.userMemory.conversationSearchEnabled,
    setConversationSearchEnabled: memory.setConversationSearchEnabled,
    clearUserProfileMemory: memory.clearUserProfileMemory,
    clearActiveConversationMemory: list.clearActiveConversationMemory,
    userMemory: memory.userMemory,
    deleteMemoryNote: memory.deleteMemoryNote,
    updateMemoryNote: memory.updateMemoryNote,
    modelCatalog: model.modelCatalog,
    selectedModelId: model.selectedModelId,
    setSelectedModelId: model.setSelectedModelId,
    modelCatalogLoading: model.modelCatalogLoading,
    modelCatalogError: model.modelCatalogError,
    llmSelection: model.llmSelection,
  }
}
