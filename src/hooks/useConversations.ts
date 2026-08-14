import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { useChatPreferencesStore } from '../features/chat/state/chatPreferencesStore'
import { useChatTurn } from '../features/chat/useChatTurn'
import { cloudSyncService } from '../features/sync/cloudSyncService'
import { dedupeConversations } from '../features/sync/conversationSyncDedup'
import type { CreateConversationOpts } from '../features/chat/state/conversationListStore'
import { isCloudSyncEnabled } from '../types/cloudSync'
import type { LunaWorkbenchMode } from '../lib/workbenchMode'
import { loadWorkspaceConfig, primaryPath } from '../lib/workspaceConfig'
import { useLunaAuthOptional } from '../features/auth/AuthProvider'

export type { SendMessageOptions } from '../features/chat/useChatTurn'

export function useConversations() {
  const [hydrated, setHydrated] = useState(false)
  const [folders, setFolders] = useState<ChatFolder[]>([])
  const skipCloudScheduleRef = useRef(false)
  const auth = useLunaAuthOptional()
  const uid = auth?.user?.uid ?? null

  const list = useConversationListStore(hydrated, folders, (reset) => {
    setFolders(reset.folders)
  })
  const folder = useFolderStore(folders, setFolders, list.setConversations)
  const memory = useUserMemoryStore(hydrated)
  const model = useChatPreferencesStore()

  useEffect(() => {
    queueMicrotask(() => {
      // Sem UID (deslogado) → estado limpo. Sem chave global pra evitar
      // reaparecer conversas da última conta logada neste aparelho.
      if (!uid) {
        const init = initialStore(nextId)
        list.setConversations(init.conversations)
        setFolders(init.folders)
        list.setActiveId(init.activeId)
        list.setActiveIdByScope({})
        list.setRecentWorkspaces([])
        setHydrated(true)
        return
      }
      const parsed = hydrateFromLocalStorage(uid)
      if (parsed) {
        const conversations = dedupeConversations(parsed.conversations)
        if (conversations.length !== parsed.conversations.length) {
          persistToLocalStorage(
            {
              conversations,
              folders: parsed.folders,
              activeId: parsed.activeId,
              activeIdByScope: parsed.activeIdByScope,
              recentWorkspaces: parsed.recentWorkspaces,
            },
            uid,
          )
        }
        list.setConversations(conversations)
        setFolders(parsed.folders)
        list.setActiveId(
          conversations.some((c) => c.id === parsed.activeId)
            ? parsed.activeId
            : conversations[0]?.id ?? parsed.activeId,
        )
        if (parsed.activeIdByScope) {
          list.setActiveIdByScope(parsed.activeIdByScope)
        }
        if (parsed.recentWorkspaces?.length) {
          list.setRecentWorkspaces(parsed.recentWorkspaces)
        }
      } else {
        const init = initialStore(nextId)
        list.setConversations(init.conversations)
        setFolders(init.folders)
        list.setActiveId(init.activeId)
      }
      setHydrated(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per uid
  }, [uid])

  useEffect(() => {
    if (!hydrated) return
    const snapshot = {
      conversations: list.conversations,
      folders,
      activeId: list.activeId,
      activeIdByScope: list.activeIdByScope,
      recentWorkspaces: list.recentWorkspaces,
    }
    persistToLocalStorage(snapshot, uid)
    if (skipCloudScheduleRef.current) {
      skipCloudScheduleRef.current = false
      return
    }
    const hasCloud =
      snapshot.conversations.some((c) => isCloudSyncEnabled(c.cloudSync)) ||
      snapshot.folders.some((f) => isCloudSyncEnabled(f.cloudSync))
    if (hasCloud) cloudSyncService.schedulePush(snapshot)
  }, [
    list.conversations,
    folders,
    list.activeId,
    list.activeIdByScope,
    list.recentWorkspaces,
    hydrated,
    uid,
  ])

  useEffect(() => {
    if (!hydrated) return
    return eventBus.on('lunar:sync:hydrate', () => {
      const parsed = hydrateFromLocalStorage(uid)
      if (!parsed) return
      list.setConversations(parsed.conversations)
      setFolders(parsed.folders)
      list.setActiveId(parsed.activeId)
    })
  }, [hydrated, list.setConversations, list.setActiveId, uid])

  // Limpa o estado in-memory no logout para evitar flash de dados da conta
  // antiga até o useEffect de hidratação re-rodar.
  useEffect(() => {
    if (uid) return // só limpa se deslogado
    const reset = initialStore(nextId)
    list.setConversations(reset.conversations)
    setFolders(reset.folders)
    list.setActiveId(reset.activeId)
  }, [uid, list.setConversations, list.setActiveId])

  useEffect(() => {
    if (!hydrated) return
    return eventBus.on('lunar:sync:complete', ({ ok, conversationIds, folderIds }) => {
      skipCloudScheduleRef.current = true
      const err = cloudSyncService.getStatus().lastError
      const synced = Date.now()
      const convIds = conversationIds ? new Set(conversationIds) : null
      const foldIds = folderIds ? new Set(folderIds) : null

      list.setConversations((prev) =>
        prev.map((c) => {
          if (!isCloudSyncEnabled(c.cloudSync)) return c
          if (convIds && !convIds.has(c.id)) return c
          if (!ok) {
            return {
              ...c,
              cloudSync: {
                enabled: true,
                lastError: err ?? 'Erro ao sincronizar',
                lastSyncedAt: c.cloudSync?.lastSyncedAt,
              },
            }
          }
          return {
            ...c,
            cloudSync: { enabled: true, lastSyncedAt: synced },
          }
        }),
      )
      setFolders((prev) =>
        prev.map((f) => {
          if (!isCloudSyncEnabled(f.cloudSync)) return f
          if (foldIds && !foldIds.has(f.id)) return f
          if (!ok) {
            return {
              ...f,
              cloudSync: {
                enabled: true,
                lastError: err ?? 'Erro ao sincronizar',
                lastSyncedAt: f.cloudSync?.lastSyncedAt,
              },
            }
          }
          return { ...f, cloudSync: { enabled: true, lastSyncedAt: synced } }
        }),
      )
    })
  }, [hydrated, list.setConversations])

  useEffect(() => {
    if (!hydrated || !isChatMemoryAvailable()) return
    const t = window.setTimeout(() => {
      void syncChatMemoryFromConversations(list.conversations)
    }, 2200)
    return () => window.clearTimeout(t)
  }, [hydrated, list.conversations])

  const turn = useChatTurn({
    activeId: list.activeId,
    conversations: list.conversations,
    messages: list.messages,
    personalityId: model.personalityId,
    ragEnabled: model.ragEnabled,
    reasoningEnabled: model.reasoningEnabled,
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

  const buildWelcomeContext = useCallback(
    (variant: LunaWorkbenchMode | 'finances' = 'chat') => ({
      conversations: list.conversations,
      folders,
      userMemory: memory.userMemory,
      cloudSyncAvailable: cloudSyncService.isAvailable(),
      variant,
    }),
    [list.conversations, folders, memory.userMemory],
  )

  const deleteConversationById = useCallback(
    (id: string) => {
      const conv = list.conversations.find((c) => c.id === id)
      const sessaoId = conv?.lunaSessaoId ?? id
      if (conv && isCloudSyncEnabled(conv.cloudSync)) {
        void cloudSyncService.removeConversationFromCloudPublic(id)
      }
      if (typeof window !== 'undefined' && window.lunaCore?.refletirSessao) {
        void window.lunaCore.refletirSessao(sessaoId)
      }
      list.deleteConversationById(id)
    },
    [list.conversations, list.deleteConversationById],
  )

  const createConversationWithEvent = useCallback(
    (opts?: {
      folderId?: string | null
      variant?: LunaWorkbenchMode | 'finances'
      workspaceRoot?: string | null
      sourceMode?: 'chat' | 'ide'
    }) => {
      const variant = opts?.variant ?? 'chat'
      const sourceMode =
        opts?.sourceMode ?? (variant === 'ide' ? 'ide' : 'chat')
      let workspaceRoot: string | null | undefined
      if (sourceMode === 'ide') {
        workspaceRoot = opts?.workspaceRoot ?? null
        if (!workspaceRoot) {
          try {
            workspaceRoot = primaryPath(loadWorkspaceConfig())
          } catch {
            workspaceRoot = null
          }
        }
      }
      const payload: CreateConversationOpts = {
        folderId: opts?.folderId,
        sourceMode,
        workspaceRoot,
        welcomeContext: buildWelcomeContext(
          variant === 'finances' ? 'finances' : variant === 'ide' ? 'ide' : 'chat',
        ),
      }
      const id = list.createConversation(payload)
      eventBus.emit('conversation:created', { id })
      return id
    },
    [list.createConversation, buildWelcomeContext],
  )

  const selectConversationWithEvent = useCallback(
    (id: string) => {
      list.selectConversation(id)
      eventBus.emit('conversation:selected', { id })
    },
    [list.selectConversation],
  )

  const setConversationCloudEnabled = useCallback(
    (id: string, enabled: boolean) => {
      // Cloud-first: não há mais opt-out. Mantém a assinatura para
      // compatibilidade, mas não faz nada.
      void id
      void enabled
    },
    [],
  )

  const setFolderCloudEnabled = useCallback(
    (folderId: string, enabled: boolean) => {
      // Cloud-first: não há mais opt-out. Mantém a assinatura para
      // compatibilidade, mas não faz nada.
      void folderId
      void enabled
    },
    [],
  )

  const sortedConversations = useMemo(
    () => sortByUpdated(list.conversations),
    [list.conversations],
  )

  const conv = useMemo(
    () => ({
      conversations: sortedConversations,
      activeId: list.activeId,
      messages: list.messages,
      createConversation: createConversationWithEvent,
      selectConversation: selectConversationWithEvent,
      deleteConversationById,
      removeActiveConversation: list.removeActiveConversation,
      renameConversation: list.renameConversation,
      togglePinConversation: list.togglePinConversation,
      moveConversationToFolder: list.moveConversationToFolder,
      setConversationTags: list.setConversationTags,
      clearActiveConversationMemory: list.clearActiveConversationMemory,
      sendMessage: turn.sendMessage,
      redoRegenerateAt: turn.redoRegenerateAt,
      canRedoMessage: turn.canRedoMessage,
      cancelAgentTurn: turn.cancelAgentTurn,
      activeIdByScope: list.activeIdByScope,
      rememberActiveForScope: list.rememberActiveForScope,
      pushRecentWorkspace: list.pushRecentWorkspace,
      recentWorkspaces: list.recentWorkspaces,
      setActiveId: list.setActiveId,
    }),
    [
      sortedConversations,
      list.activeId,
      list.messages,
      createConversationWithEvent,
      selectConversationWithEvent,
      deleteConversationById,
      list.removeActiveConversation,
      list.renameConversation,
      list.togglePinConversation,
      list.moveConversationToFolder,
      list.setConversationTags,
      list.clearActiveConversationMemory,
      turn.sendMessage,
      turn.redoRegenerateAt,
      turn.canRedoMessage,
      turn.cancelAgentTurn,
      list.activeIdByScope,
      list.rememberActiveForScope,
      list.pushRecentWorkspace,
      list.recentWorkspaces,
      list.setActiveId,
    ],
  )

  const foldersState = useMemo(
    () => ({
      folders: folder.foldersSorted,
      createFolder: (name: string, parentId?: string | null) =>
        folder.createFolder(name, { parentId: parentId ?? null }),
      renameFolder: folder.renameFolder,
      updateFolder: folder.updateFolder,
      deleteFolder: folder.deleteFolder,
    }),
    [
      folder.foldersSorted,
      folder.createFolder,
      folder.renameFolder,
      folder.updateFolder,
      folder.deleteFolder,
    ],
  )

  const modelState = useMemo(
    () => ({
      ragEnabled: model.ragEnabled,
      setRagEnabled: model.setRagEnabled,
      reasoningEnabled: model.reasoningEnabled,
      setReasoningEnabled: model.setReasoningEnabled,
      personalityId: model.personalityId,
      setPersonality: model.setPersonality,
    }),
    [
      model.ragEnabled,
      model.setRagEnabled,
      model.reasoningEnabled,
      model.setReasoningEnabled,
      model.personalityId,
      model.setPersonality,
    ],
  )

  const memoryState = useMemo(
    () => ({
      userMemory: memory.userMemory,
      memoryCrossChatEnabled: memory.userMemory.crossChatEnabled,
      setMemoryCrossChatEnabled: memory.setMemoryCrossChatEnabled,
      memoryConversationSearchEnabled: memory.userMemory.conversationSearchEnabled,
      setConversationSearchEnabled: memory.setConversationSearchEnabled,
      clearUserProfileMemory: memory.clearUserProfileMemory,
      deleteMemoryNote: memory.deleteMemoryNote,
      updateMemoryNote: memory.updateMemoryNote,
    }),
    [
      memory.userMemory,
      memory.setMemoryCrossChatEnabled,
      memory.setConversationSearchEnabled,
      memory.clearUserProfileMemory,
      memory.deleteMemoryNote,
      memory.updateMemoryNote,
    ],
  )

  // Cloud-first: sync sempre disponível quando o usuário está logado.
  // syncState mantido para compatibilidade da API exportada.
  const syncState = useMemo(
    () => ({
      cloudSyncAvailable: cloudSyncService.isAvailable(),
      setConversationCloudEnabled,
      setFolderCloudEnabled,
    }),
    [setConversationCloudEnabled, setFolderCloudEnabled],
  )

  return {
    hydrated,
    buildWelcomeContext,
    conv,
    foldersState,
    model: modelState,
    memory: memoryState,
    sync: syncState,
  }
}
