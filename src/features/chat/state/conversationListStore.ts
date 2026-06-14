import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { ChatFolder, Conversation } from '../../../types/chat'
import {
  MAX_CONVERSATION_TAGS,
  normalizeTag,
} from '../../history/folderTree'
import type { UserMemoryState } from '../../../types/memory'
import { contextualWelcomeMessages } from '../contextualChatWelcome'
import {
  deriveTitle,
  nextId,
  seedStoreAfterDelete,
  sortByUpdated,
  welcomeMessages,
} from './conversationPersistence'

export type CreateConversationOpts = {
  folderId?: string | null
  sourceMode?: Conversation['sourceMode']
  workspaceRoot?: string | null
  welcomeContext?: {
    conversations: Conversation[]
    folders: ChatFolder[]
    userMemory: UserMemoryState
    cloudSyncAvailable: boolean
    variant: 'chat' | 'ide' | 'finances'
  }
}

export type ConversationListActions = {
  setConversations: Dispatch<SetStateAction<Conversation[]>>
}

export function useConversationListStore(
  hydrated: boolean,
  folders: ChatFolder[],
  onStoreReset?: (state: {
    activeId: string
    folders: ChatFolder[]
    activeIdByScope?: Record<string, string>
    recentWorkspaces?: string[]
  }) => void,
) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState('')
  const [activeIdByScope, setActiveIdByScope] = useState<
    Record<string, string>
  >({})
  const [recentWorkspaces, setRecentWorkspaces] = useState<string[]>([])

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId],
  )

  const messages = active?.messages ?? []

  useEffect(() => {
    if (!hydrated || !conversations.length) return
    if (!activeId || !conversations.some((c) => c.id === activeId)) {
      const nextId = sortByUpdated(conversations)[0]?.id
      if (nextId) queueMicrotask(() => setActiveId(nextId))
    }
  }, [hydrated, conversations, activeId])

  const updateConversation = useCallback(
    (
      conversationId: string,
      updater: (c: Conversation) => Conversation | null | undefined,
    ) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === conversationId)
        if (index === -1) return prev
        const patched = updater(prev[index])
        if (patched == null) {
          const minus = [...prev.slice(0, index), ...prev.slice(index + 1)]
          const sorted = sortByUpdated(minus)
          if (!sorted.length) {
            const empty = seedStoreAfterDelete()
            queueMicrotask(() => {
              setActiveId(empty.activeId)
              onStoreReset?.({
                activeId: empty.activeId,
                folders: empty.folders,
              })
            })
            return empty.conversations
          }
          queueMicrotask(() => {
            setActiveId((cur) =>
              sorted.some((c) => c.id === cur) ? cur : sorted[0]?.id ?? cur,
            )
          })
          return sorted
        }
        const copy = [...prev]
        copy[index] = patched
        return sortByUpdated(copy)
      })
    },
    [],
  )

  const createConversation = useCallback(
    (opts?: CreateConversationOpts) => {
      const id = nextId()
      const want = opts?.folderId ?? null
      const folderId =
        want && folders.some((f) => f.id === want) ? want : null
      const msgs = opts?.welcomeContext
        ? contextualWelcomeMessages(nextId, {
            ...opts.welcomeContext,
            conversationId: id,
            folderId,
          })
        : welcomeMessages(nextId)
      const sourceMode =
        opts?.sourceMode ?? (opts?.welcomeContext?.variant === 'ide' ? 'ide' : 'chat')
      const workspaceRoot =
        sourceMode === 'ide' ? (opts?.workspaceRoot ?? null) : undefined

      const convo: Conversation = {
        id,
        lunaSessaoId: id,
        title: deriveTitle(msgs),
        folderId: sourceMode === 'ide' ? null : folderId,
        sourceMode,
        ...(workspaceRoot !== undefined ? { workspaceRoot } : {}),
        messages: msgs,
        updatedAt: Date.now(),
      }
      setConversations((prev) => sortByUpdated([...prev, convo]))
      setActiveId(id)
      if (typeof window !== 'undefined' && window.lunaCore?.prepararSessao) {
        void window.lunaCore.prepararSessao(id)
      }
      return id
    },
    [folders],
  )

  const renameConversation = useCallback(
    (conversationId: string, nextTitle: string) => {
      const t = nextTitle.replace(/\s+/g, ' ').trim()
      updateConversation(conversationId, (c) => {
        const title =
          t.length > 0 ? t.slice(0, 120) : deriveTitle(c.messages)
        return {
          ...c,
          title,
          titlePinned: t.length > 0,
          updatedAt: Date.now(),
        }
      })
    },
    [updateConversation],
  )

  const togglePinConversation = useCallback(
    (conversationId: string) => {
      updateConversation(conversationId, (c) => ({
        ...c,
        pinned: !c.pinned,
        updatedAt: Date.now(),
      }))
    },
    [updateConversation],
  )

  const moveConversationToFolder = useCallback(
    (conversationId: string, folderId: string | null) => {
      const valid =
        folderId && folders.some((f) => f.id === folderId) ? folderId : null
      updateConversation(conversationId, (c) => ({
        ...c,
        folderId: valid,
        updatedAt: Date.now(),
      }))
    },
    [folders, updateConversation],
  )

  const deleteConversationById = useCallback(
    (id: string) => {
      updateConversation(id, () => null)
    },
    [updateConversation],
  )

  const removeActiveConversation = useCallback(() => {
    if (!activeId) return
    deleteConversationById(activeId)
  }, [activeId, deleteConversationById])

  const selectConversation = useCallback((id: string) => {
    setActiveId(id)
  }, [])

  const rememberActiveForScope = useCallback((scopeKey: string, id: string) => {
    if (!scopeKey.trim() || !id.trim()) return
    setActiveIdByScope((prev) =>
      prev[scopeKey] === id ? prev : { ...prev, [scopeKey]: id },
    )
  }, [])

  const pushRecentWorkspace = useCallback((workspaceRoot: string) => {
    const trimmed = workspaceRoot.trim()
    if (!trimmed) return
    setRecentWorkspaces((prev) => {
      const key = trimmed.replace(/\\/g, '/').toLowerCase()
      const next = [
        trimmed,
        ...prev.filter(
          (p) => p.replace(/\\/g, '/').toLowerCase() !== key,
        ),
      ]
      return next.slice(0, 12)
    })
  }, [])

  const setConversationTags = useCallback(
    (conversationId: string, tags: string[]) => {
      const seen = new Set<string>()
      const normalized: string[] = []
      for (const raw of tags) {
        const t = normalizeTag(raw)
        if (!t || seen.has(t)) continue
        seen.add(t)
        normalized.push(t)
        if (normalized.length >= MAX_CONVERSATION_TAGS) break
      }
      updateConversation(conversationId, (c) => ({
        ...c,
        tags: normalized.length ? normalized : undefined,
        updatedAt: Date.now(),
      }))
    },
    [updateConversation],
  )

  const clearActiveConversationMemory = useCallback(() => {
    if (!activeId) return
    updateConversation(activeId, (c) => {
      const { memory: _, ...rest } = c
      void _
      return { ...rest, updatedAt: Date.now() }
    })
  }, [activeId, updateConversation])

  return {
    conversations,
    setConversations,
    activeId,
    setActiveId,
    activeIdByScope,
    setActiveIdByScope,
    recentWorkspaces,
    setRecentWorkspaces,
    pushRecentWorkspace,
    rememberActiveForScope,
    active,
    messages,
    updateConversation,
    createConversation,
    renameConversation,
    togglePinConversation,
    moveConversationToFolder,
    setConversationTags,
    deleteConversationById,
    removeActiveConversation,
    selectConversation,
    clearActiveConversationMemory,
  }
}
