import {
  useCallback,
  useEffect,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import {
  buildMentionSuggestions,
  getMentionTrigger,
  insertMention,
  type MentionSuggestion,
  type MentionTrigger,
} from '../lib/ideMentionAutocomplete'
import { setComposerDraft } from '../lib/composerDraftStore'
import { useLunaWorkspaceOptional } from '../context/LunaWorkspaceContext'

export function useIdeComposerMentions(
  draft: string,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  enabled: boolean,
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void,
) {
  const ws = useLunaWorkspaceOptional()
  const [mentionTrigger, setMentionTrigger] = useState<MentionTrigger | null>(
    null,
  )
  const [mentionSuggestions, setMentionSuggestions] = useState<
    MentionSuggestion[]
  >([])
  const [mentionIndex, setMentionIndex] = useState(0)

  const syncMentionTrigger = useCallback(
    (value: string, cursor: number) => {
      if (!enabled) {
        setMentionTrigger(null)
        return
      }
      setMentionTrigger(getMentionTrigger(value, cursor))
      setMentionIndex(0)
    },
    [enabled],
  )

  const onDraftChange = useCallback(
    (value: string) => {
      setComposerDraft(value)
      const el = textareaRef.current
      const cursor = el?.selectionStart ?? value.length
      syncMentionTrigger(value, cursor)
    },
    [syncMentionTrigger, textareaRef],
  )

  useEffect(() => {
    if (!enabled || !mentionTrigger) {
      setMentionSuggestions([])
      return
    }
    let cancelled = false
    void buildMentionSuggestions(
      ws?.workspaceRoot ?? null,
      ws?.openFiles.map((f) => f.path) ?? [],
      mentionTrigger.query,
    ).then((items) => {
      if (!cancelled) setMentionSuggestions(items)
    })
    return () => {
      cancelled = true
    }
  }, [enabled, mentionTrigger, ws?.workspaceRoot, ws?.openFiles])

  const pickMention = useCallback(
    (item: MentionSuggestion) => {
      if (!mentionTrigger) return
      const { next, cursor } = insertMention(draft, mentionTrigger, item.insert)
      setComposerDraft(next)
      setMentionTrigger(null)
      requestAnimationFrame(() => {
        const el = textareaRef.current
        if (!el) return
        el.focus()
        el.setSelectionRange(cursor, cursor)
        syncMentionTrigger(next, cursor)
      })
    },
    [draft, mentionTrigger, syncMentionTrigger, textareaRef],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionTrigger && mentionSuggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setMentionIndex((i) => (i + 1) % mentionSuggestions.length)
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setMentionIndex(
            (i) =>
              (i - 1 + mentionSuggestions.length) % mentionSuggestions.length,
          )
          return
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          pickMention(mentionSuggestions[mentionIndex]!)
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          setMentionTrigger(null)
          return
        }
      }
      onKeyDown(e)
    },
    [
      mentionTrigger,
      mentionSuggestions,
      mentionIndex,
      pickMention,
      onKeyDown,
    ],
  )

  return {
    mentionTrigger,
    mentionSuggestions,
    mentionIndex,
    onDraftChange,
    handleKeyDown,
    pickMention,
  }
}
