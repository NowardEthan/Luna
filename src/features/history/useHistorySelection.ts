import { useCallback, useMemo, useState } from 'react'
import type { ChatFolder } from '../../types/chat'
import { getConversationIdsInFolderSubtree, getDescendantIds } from './folderTree'

export function useHistorySelection(
  folders: ChatFolder[],
  conversations: { id: string; folderId: string | null }[],
) {
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedConversationIds, setSelectedConversationIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(
    () => new Set(),
  )

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false)
    setSelectedConversationIds(new Set())
    setSelectedFolderIds(new Set())
  }, [])

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((on) => {
      if (on) {
        setSelectedConversationIds(new Set())
        setSelectedFolderIds(new Set())
        return false
      }
      return true
    })
  }, [])

  const toggleConversation = useCallback((id: string) => {
    setSelectedConversationIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleFolder = useCallback(
    (folderId: string) => {
      const convoIds = getConversationIdsInFolderSubtree(
        folderId,
        folders,
        conversations,
      )
      setSelectedFolderIds((prevFolders) => {
        const adding = !prevFolders.has(folderId)
        const nextFolders = new Set(prevFolders)
        if (adding) nextFolders.add(folderId)
        else nextFolders.delete(folderId)

        setSelectedConversationIds((prevConvos) => {
          const nextConvos = new Set(prevConvos)
          for (const id of convoIds) {
            if (adding) nextConvos.add(id)
            else nextConvos.delete(id)
          }
          return nextConvos
        })

        return nextFolders
      })
    },
    [conversations, folders],
  )

  const selectAllVisible = useCallback(
    (conversationIds: string[], folderIds: string[]) => {
      setSelectedConversationIds(new Set(conversationIds))
      setSelectedFolderIds(new Set(folderIds))
    },
    [],
  )

  const clearSelection = useCallback(() => {
    setSelectedConversationIds(new Set())
    setSelectedFolderIds(new Set())
  }, [])

  const totalSelected =
    selectedConversationIds.size + selectedFolderIds.size

  const folderIdsToDeleteOrdered = useMemo(() => {
    const ids = [...selectedFolderIds]
    return ids.sort((a, b) => folderDepthForSort(b, folders) - folderDepthForSort(a, folders))
  }, [selectedFolderIds, folders])

  return {
    selectionMode,
    selectedConversationIds,
    selectedFolderIds,
    totalSelected,
    folderIdsToDeleteOrdered,
    toggleSelectionMode,
    exitSelectionMode,
    toggleConversation,
    toggleFolder,
    selectAllVisible,
    clearSelection,
    isConversationSelected: (id: string) => selectedConversationIds.has(id),
    isFolderSelected: (id: string) => selectedFolderIds.has(id),
  }
}

function folderDepthForSort(folderId: string, folders: ChatFolder[]): number {
  let depth = 0
  let current: string | null = folderId
  const seen = new Set<string>()
  while (current) {
    if (seen.has(current)) break
    seen.add(current)
    depth++
    const f = folders.find((x) => x.id === current)
    current = f?.parentId ?? null
  }
  return depth
}

/** Conversas a apagar directamente (exclui as que serão removidas com a pasta) */
export function conversationIdsForBulkDelete(
  selectedConversationIds: Set<string>,
  selectedFolderIds: Set<string>,
  folders: ChatFolder[],
  conversations: { id: string; folderId: string | null }[],
): string[] {
  const foldersBeingDeleted = new Set<string>()
  for (const folderId of selectedFolderIds) {
    foldersBeingDeleted.add(folderId)
    for (const d of getDescendantIds(folderId, folders)) {
      foldersBeingDeleted.add(d)
    }
  }
  return [...selectedConversationIds].filter((id) => {
    const convo = conversations.find((c) => c.id === id)
    if (!convo?.folderId) return true
    return !foldersBeingDeleted.has(convo.folderId)
  })
}
