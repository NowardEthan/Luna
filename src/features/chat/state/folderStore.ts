import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react'
import type {
  ChatFolder,
  Conversation,
  FolderColorId,
  FolderIconId,
} from '../../../types/chat'
import {
  canNestUnder,
  getDescendantIds,
  wouldCreateCycle,
} from '../../history/folderTree'
import { nextId, sortByUpdated } from './conversationPersistence'

export type FolderCreateOptions = {
  parentId?: string | null
  icon?: FolderIconId
  color?: FolderColorId
}

export type FolderUpdatePatch = {
  name?: string
  icon?: FolderIconId
  customIcon?: string | null
  color?: FolderColorId
  parentId?: string | null
}

export function useFolderStore(
  folders: ChatFolder[],
  setFolders: Dispatch<SetStateAction<ChatFolder[]>>,
  setConversations: Dispatch<SetStateAction<Conversation[]>>,
) {
  const createFolder = useCallback(
    (name: string, opts?: FolderCreateOptions) => {
      const n = name.replace(/\s+/g, ' ').trim().slice(0, 80)
      if (!n.length) return
      const wantParent = opts?.parentId ?? null
      setFolders((prev) => {
        const parentId =
          wantParent && prev.some((f) => f.id === wantParent) ? wantParent : null
        if (parentId && !canNestUnder(parentId, prev)) return prev
        const folder: ChatFolder = {
          id: nextId(),
          name: n,
          createdAt: Date.now(),
          parentId,
          ...(opts?.icon ? { icon: opts.icon } : {}),
          ...(opts?.color ? { color: opts.color } : {}),
        }
        return [...prev, folder]
      })
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

  const updateFolder = useCallback(
    (folderId: string, patch: FolderUpdatePatch) => {
      setFolders((prev) => {
        const current = prev.find((f) => f.id === folderId)
        if (!current) return prev

        let parentId = current.parentId ?? null
        if (patch.parentId !== undefined) {
          const nextParent = patch.parentId
          if (
            nextParent &&
            (!prev.some((f) => f.id === nextParent) ||
              wouldCreateCycle(folderId, nextParent, prev) ||
              !canNestUnder(nextParent, prev))
          ) {
            return prev
          }
          parentId = nextParent
        }

        const name =
          patch.name != null
            ? patch.name.replace(/\s+/g, ' ').trim().slice(0, 80)
            : current.name
        if (!name.length) return prev

        return prev.map((f) => {
          if (f.id !== folderId) return f
          const next: ChatFolder = { ...f, name, parentId }
          if (patch.icon !== undefined) {
            next.icon = patch.icon
            delete next.customIcon
          }
          if (patch.customIcon !== undefined) {
            if (patch.customIcon) next.customIcon = patch.customIcon
            else delete next.customIcon
          }
          if (patch.color !== undefined) next.color = patch.color
          return next
        })
      })
    },
    [setFolders],
  )

  const deleteFolder = useCallback(
    (folderId: string) => {
      setFolders((prev) => {
        const target = prev.find((f) => f.id === folderId)
        if (!target) return prev
        const descendants = getDescendantIds(folderId, prev)
        const removed = new Set([folderId, ...descendants])
        const reassignTo = target.parentId ?? null

        setConversations((convos) =>
          sortByUpdated(
            convos.map((c) =>
              c.folderId && removed.has(c.folderId)
                ? { ...c, folderId: reassignTo }
                : c,
            ),
          ),
        )

        return prev.filter((f) => !removed.has(f.id))
      })
    },
    [setFolders, setConversations],
  )

  const foldersSorted = useMemo(() => [...folders], [folders])

  return {
    foldersSorted,
    createFolder,
    renameFolder,
    updateFolder,
    deleteFolder,
  }
}
