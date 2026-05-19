import { useCallback, useEffect, useRef, useState } from 'react'
import {
  defaultUserMemory,
  loadUserMemory,
  saveUserMemory,
} from '../../../lib/userMemoryStorage'
import { patchMemoryNote, type MemoryNotePatch } from '../../../lib/patchMemoryNote'
import type { UserMemoryState } from '../../../types/memory'

export function useUserMemoryStore(hydrated: boolean) {
  const [userMemory, setUserMemory] = useState<UserMemoryState>(() =>
    defaultUserMemory(),
  )
  const userMemoryRef = useRef(userMemory)

  useEffect(() => {
    userMemoryRef.current = userMemory
  }, [userMemory])

  useEffect(() => {
    queueMicrotask(() => setUserMemory(loadUserMemory()))
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveUserMemory(userMemory)
  }, [userMemory, hydrated])

  const setMemoryCrossChatEnabled = useCallback((enabled: boolean) => {
    setUserMemory((prev) => ({
      ...prev,
      crossChatEnabled: enabled,
      updatedAt: Date.now(),
    }))
  }, [])

  const clearUserProfileMemory = useCallback(() => {
    setUserMemory((prev) => ({
      ...defaultUserMemory(),
      crossChatEnabled: prev.crossChatEnabled,
      conversationSearchEnabled: prev.conversationSearchEnabled,
    }))
  }, [])

  const setConversationSearchEnabled = useCallback((enabled: boolean) => {
    setUserMemory((prev) => ({
      ...prev,
      conversationSearchEnabled: enabled,
      updatedAt: Date.now(),
    }))
  }, [])

  const deleteMemoryNote = useCallback((noteId: string) => {
    setUserMemory((prev) => ({
      ...prev,
      memoryNotes: (prev.memoryNotes ?? []).filter((n) => n.id !== noteId),
      updatedAt: Date.now(),
    }))
  }, [])

  const updateMemoryNote = useCallback(
    (noteId: string, patch: MemoryNotePatch) => {
      setUserMemory((prev) => {
        const notes = prev.memoryNotes ?? []
        const idx = notes.findIndex((n) => n.id === noteId)
        if (idx < 0) return prev
        const next = patchMemoryNote(notes[idx]!, patch)
        if (!next) return prev
        const memoryNotes = [...notes]
        memoryNotes[idx] = next
        return { ...prev, memoryNotes, updatedAt: Date.now() }
      })
    },
    [],
  )

  return {
    userMemory,
    setUserMemory,
    userMemoryRef,
    setMemoryCrossChatEnabled,
    clearUserProfileMemory,
    setConversationSearchEnabled,
    deleteMemoryNote,
    updateMemoryNote,
  }
}
