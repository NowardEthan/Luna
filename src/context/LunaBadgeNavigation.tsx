import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type BadgeHighlight =
  | { type: 'memory'; noteId: string }
  | { type: 'folder'; folderId: string }
  | { type: 'tool'; messageId: string; toolId: string }

export type LunaBadgeNavigation = {
  focusMemoryNote: (noteId: string) => void
  focusFolder: (folderId: string) => void
  focusToolStep: (messageId: string, toolId: string) => void
  highlight: BadgeHighlight | null
}

const LunaBadgeNavContext = createContext<LunaBadgeNavigation | null>(null)

type ProviderProps = {
  children: ReactNode
  listRef: React.RefObject<HTMLElement | null>
  onOpenMemories: () => void
  onOpenHistory: () => void
  onCloseSidePanels: () => void
}

export function LunaBadgeNavigationProvider({
  children,
  listRef,
  onOpenMemories,
  onOpenHistory,
  onCloseSidePanels,
}: ProviderProps) {
  const [highlight, setHighlight] = useState<BadgeHighlight | null>(null)

  const scrollChatTo = useCallback(
    (selector: string) => {
      const root = listRef.current
      if (!root) return null
      const el = root.querySelector(selector)
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const details = el.querySelector('details')
        if (details instanceof HTMLDetailsElement) {
          details.open = true
        }
      }
      return el
    },
    [listRef],
  )

  const focusMemoryNote = useCallback(
    (noteId: string) => {
      onOpenMemories()
      setHighlight({ type: 'memory', noteId })
      window.setTimeout(() => {
        const el = document.getElementById(`memory-note-${CSS.escape(noteId)}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 220)
    },
    [onOpenMemories],
  )

  const focusFolder = useCallback(
    (folderId: string) => {
      onOpenHistory()
      setHighlight({ type: 'folder', folderId })
      window.setTimeout(() => {
        document
          .getElementById(`history-folder-${CSS.escape(folderId)}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 220)
    },
    [onOpenHistory],
  )

  const focusToolStep = useCallback(
    (messageId: string, toolId: string) => {
      onCloseSidePanels()
      setHighlight({ type: 'tool', messageId, toolId })
      requestAnimationFrame(() => {
        scrollChatTo(
          `[data-message-id="${CSS.escape(messageId)}"] [data-timeline-tool="${CSS.escape(toolId)}"]`,
        )
      })
    },
    [onCloseSidePanels, scrollChatTo],
  )

  useEffect(() => {
    if (!highlight) return
    const t = window.setTimeout(() => setHighlight(null), 2800)
    return () => window.clearTimeout(t)
  }, [highlight])

  const value = useMemo(
    () => ({ focusMemoryNote, focusFolder, focusToolStep, highlight }),
    [focusMemoryNote, focusFolder, focusToolStep, highlight],
  )

  return (
    <LunaBadgeNavContext.Provider value={value}>
      {children}
    </LunaBadgeNavContext.Provider>
  )
}

export function useLunaBadgeNav(): LunaBadgeNavigation | null {
  return useContext(LunaBadgeNavContext)
}

export function isToolHighlight(
  highlight: BadgeHighlight | null,
  messageId: string,
  toolId: string,
): boolean {
  return (
    highlight?.type === 'tool' &&
    highlight.messageId === messageId &&
    highlight.toolId === toolId
  )
}

export function isMemoryNoteHighlight(
  highlight: BadgeHighlight | null,
  noteId: string,
): boolean {
  return highlight?.type === 'memory' && highlight.noteId === noteId
}

export function isFolderHighlight(
  highlight: BadgeHighlight | null,
  folderId: string,
): boolean {
  return highlight?.type === 'folder' && highlight.folderId === folderId
}
