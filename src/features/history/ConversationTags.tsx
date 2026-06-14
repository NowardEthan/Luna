import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  MAX_CONVERSATION_TAGS,
  MAX_TAG_LENGTH,
  normalizeTag,
} from './folderTree'

type Props = {
  tags: string[]
  onChange: (tags: string[]) => void
  compact?: boolean
}

export function ConversationTags({ tags, onChange, compact = false }: Props) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const addTag = useCallback(() => {
    const t = normalizeTag(draft)
    setDraft('')
    setAdding(false)
    if (!t || tags.includes(t)) return
    if (tags.length >= MAX_CONVERSATION_TAGS) return
    onChange([...tags, t])
  }, [draft, onChange, tags])

  const removeTag = useCallback(
    (tag: string) => {
      onChange(tags.filter((x) => x !== tag))
    },
    [onChange, tags],
  )

  return (
    <div
      className={`flex items-center gap-1 border-t border-line-subtle px-2 py-1.5 ${
        compact
          ? 'max-w-full flex-nowrap overflow-x-auto overscroll-x-contain'
          : 'flex-wrap'
      }`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-0.5 rounded-full bg-accent-muted px-1.5 py-0.5 text-[9px] font-medium text-accent ${compact ? 'max-w-[5.5rem] shrink-0' : 'max-w-full'}`}
        >
          <span className="truncate">#{tag}</span>
          <button
            type="button"
            className="rounded-full p-0.5 text-accent hover:bg-accent-muted hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
            aria-label={t('history.tagRemove', { tag })}
            onClick={() => removeTag(tag)}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="3" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </span>
      ))}
      {adding ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft.trim()) addTag()
            else setAdding(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag()
            }
            if (e.key === 'Escape') {
              setDraft('')
              setAdding(false)
            }
          }}
          placeholder={t('history.tagNewPlaceholder')}
          className="min-w-[5rem] flex-1 rounded border border-line bg-canvas px-1.5 py-0.5 text-[10px] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-focus"
          autoFocus
          maxLength={MAX_TAG_LENGTH}
          aria-label={t('history.tagNewAria')}
        />
      ) : tags.length < MAX_CONVERSATION_TAGS ? (
        <button
          type="button"
          className="rounded-full border border-dashed border-line px-1.5 py-0.5 text-[9px] text-fg-muted hover:border-accent hover:text-fg-dim focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
          onClick={() => setAdding(true)}
        >
          {t('history.tagAdd')}
        </button>
      ) : null}
    </div>
  )
}
