import { useTranslation } from 'react-i18next'
import { ChatSessionToolbar } from './ChatSessionToolbar'
import type { ChatPersonalityId } from '../lib/chatPersonality'

type Props = {
  compact: boolean
  sessionTitle: string
  editingTitle: boolean
  titleDraft: string
  onTitleDraftChange: (value: string) => void
  onCommit: () => void
  onCancel: () => void
  onDoubleClick: () => void
  personalityId: ChatPersonalityId
  onPersonalityChange: (id: ChatPersonalityId) => void
  onNewConversation: () => void
  onExportConversation?: () => void
  disabled?: boolean
}

export function ChatSessionHeader({
  compact,
  sessionTitle,
  editingTitle,
  titleDraft,
  onTitleDraftChange,
  onCommit,
  onCancel,
  onDoubleClick,
  personalityId,
  onPersonalityChange,
  onNewConversation,
  onExportConversation,
  disabled,
}: Props) {
  const { t } = useTranslation()

  return (
    <header
      className={`relative z-20 shrink-0 overflow-visible border-b border-line-subtle bg-canvas ${
        compact ? 'px-2 py-2' : 'px-4 py-2.5'
      }`}
    >
      <div
        className={
          compact
            ? 'flex items-start justify-between gap-2'
            : 'mx-auto flex max-w-3xl items-center justify-between gap-3'
        }
      >
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              value={titleDraft}
              onChange={(e) => onTitleDraftChange(e.target.value)}
              onBlur={onCommit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); onCommit() }
                if (e.key === 'Escape') onCancel()
              }}
              className="w-full rounded-xl bg-surface px-2 py-1 text-[14px] font-semibold text-fg focus:outline-none focus:ring-1 focus:ring-inset focus:ring-accent/40"
              autoFocus
              maxLength={120}
              aria-label={t('shell.rename_conversation')}
            />
          ) : (
            <h1
              className={`line-clamp-1 font-medium text-fg-dim ${
                compact ? 'text-[13px]' : 'text-[14px]'
              }`}
              onDoubleClick={onDoubleClick}
              title={t('shell.rename_hint')}
            >
              {sessionTitle}
            </h1>
          )}
        </div>
        <ChatSessionToolbar
          personalityId={personalityId}
          onPersonalityChange={onPersonalityChange}
          onNewConversation={onNewConversation}
          onExportConversation={onExportConversation}
          disabled={disabled}
        />
      </div>
    </header>
  )
}
