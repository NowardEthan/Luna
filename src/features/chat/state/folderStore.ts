import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react'
import type { ChatFolder, Conversation } from '../../../types/chat'
import { nextId, sortByUpdated } from './conversationPersistence'

export function useFolderStore(
  folders: ChatFolder[],
  setFolders: Dispatch<SetStateAction<ChatFolder[]>>,
  setConversations: Dispatch<SetStateAction<Conversation[]>>,
) {
  const createFolder = useCallback(
    (name: string) => {
      const n = name.replace(/\s+/g, ' ').trim().slice(0, 80)
      if (!n.length) return
      const folder: ChatFolder = {
        id: nextId(),
        name: n,
        createdAt: Date.now(),
      }
      setFolders((prev) => [...prev, folder])
    },
    [setFolders],
  )

  const renameFolder = useCallback(
    (folderId: string, nextName: string) => {
      const n = nextName.replace(/\s+/g, ' ').trim().slice(0, 80)
      if (!n.length) return
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, name: n } : f)),
      )
    },
    [setFolders],
  )

  const deleteFolder = useCallback(
    (folderId: string) => {
      setFolders((prev) => prev.filter((f) => f.id !== folderId))
      setConversations((prev) =>
        sortByUpdated(
          prev.map((c) =>
            c.folderId === folderId ? { ...c, folderId: null } : c,
          ),
        ),
      )
    },
    [setFolders, setConversations],
  )

  const foldersSorted = useMemo(
    () =>
      [...folders].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
      ),
    [folders],
  )

  return {
    foldersSorted,
    createFolder,
    renameFolder,
    deleteFolder,
  }
}
