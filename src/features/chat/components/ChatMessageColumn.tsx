import { memo, type RefObject } from 'react'
import { BRAND_APP_NAME } from '../../../brand'
import { isAssistantGenerating } from '../../../lib/assistantMessageUi'
import {
  formatMessageTime,
  messageTimestampFromId,
} from '../../../lib/messageTimestamp'
import type { MemoryNote } from '../../../types/memory'
import type { Message } from '../../../types/chat'
import type { ContextualWelcomeBundle } from '../contextualChatWelcome'
import { AssistantMarkdown } from '../../../components/AssistantMarkdown'
import { RedoTurnButton } from '../../../components/RedoTurnButton'
import { AssistantTurn } from '../../../components/chat/AssistantTurn'
import { ChatBubble } from '../../../components/chat/ChatBubble'
import { TranslatedMessageBlock } from '../../../components/chat/TranslatedMessageBlock'
import { CopyMessageButton } from '../../../components/chat/CopyMessageButton'
import { MessageImageGallery } from '../../../components/chat/MessageImageGallery'
import { OnboardingCard } from '../../../components/OnboardingCard'
import { ScrollToBottomFab } from '../../../components/chat/ScrollToBottomFab'
import { ScrollToMessageTopButton } from '../../../components/chat/ScrollToMessageTopButton'
import { WelcomeAssistantMessage } from './WelcomeAssistantMessage'
import { WelcomePartsInline } from './WelcomePartsInline'
import {
  getStarterIdeasChat,
  getStarterIdeasFinances,
  getStarterIdeasIde,
} from './chatStarters'
import { useTranslation } from 'react-i18next'

type Props = {
  variant: 'chat' | 'ide' | 'finances'
  listRef: RefObject<HTMLDivElement | null>
  messages: Message[]
  memoryNotes?: MemoryNote[]
  composerBusy: boolean
  generating: boolean
  canRedoMessage: (id: string) => boolean
  onRedoMessage: (id: string) => void
  onStarterPick: (text: string) => void
  welcomeContext?: ContextualWelcomeBundle | null
  onOpenConversation?: (id: string) => void
  showOnboarding?: boolean
  onDismissOnboarding?: () => void
}

export const ChatMessageColumn = memo(function ChatMessageColumn({
  variant,
  listRef,
  messages,
  memoryNotes,
  composerBusy,
  canRedoMessage,
  onRedoMessage,
  onStarterPick,
  welcomeContext,
  onOpenConversation,
  showOnboarding,
  onDismissOnboarding,
}: Props) {
  const { t } = useTranslation()
  const isChat = variant === 'chat'
  const isFinances = variant === 'finances'
  const hasUserMessage = messages.some((m) => m.role === 'user')
  const showWelcomeUi = !hasUserMessage && welcomeContext
  const firstAssistantId = messages.find((m) => m.role === 'assistant')?.id

  const starterItems = welcomeContext?.starterItems

  const starters =
    welcomeContext?.starters?.length
      ? welcomeContext.starters
      : isFinances
        ? getStarterIdeasFinances()
        : isChat
          ? getStarterIdeasChat()
          : getStarterIdeasIde()

  const panelHint =
    welcomeContext?.panelHint ??
    (isFinances
      ? t('emptyState.finances')
      : isChat
        ? t('emptyState.chat')
        : t('emptyState.ide'))

  const listClass = isChat
    ? 'mx-auto flex max-w-3xl flex-col gap-4 pb-2'
    : 'flex flex-col gap-3 pb-2'
  const shellClass =
    'chat-scroll-shell relative flex min-h-0 flex-1 flex-col overflow-hidden'
  const scrollClass = isChat
    ? 'chat-scroll-region min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3'
    : 'forge-chat-scroll chat-scroll-region min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-2 py-2'

  return (
    <div className={shellClass}>
      <div ref={listRef} className={scrollClass}>
        <ul className={listClass} aria-live="polite">
          {messages.map((m) => {
            if (
              showWelcomeUi &&
              m.role === 'assistant' &&
              m.id === firstAssistantId &&
              welcomeContext &&
              onOpenConversation
            ) {
              return (
                <WelcomeAssistantMessage
                  key={m.id}
                  parts={welcomeContext.assistantParts}
                  conversationBadges={welcomeContext.conversationBadges}
                  onOpenConversation={onOpenConversation}
                />
              )
            }

            const msgGenerating =
              m.role === 'assistant' && isAssistantGenerating(m)
            const ts = messageTimestampFromId(m.id)
            const timeLabel = ts ? formatMessageTime(ts) : undefined
            const copyText =
              m.role === 'user'
                ? m.text
                : m.role === 'assistant'
                  ? m.text
                  : ''

            return (
              <li
                key={m.id}
                data-message-id={m.id}
                className={
                  m.role === 'user'
                    ? 'group relative scroll-mt-3 flex flex-col items-end'
                    : 'group relative scroll-mt-3 flex flex-col items-start'
                }
              >
                {m.role === 'assistant' ? (
                  <ScrollToMessageTopButton
                    messageId={m.id}
                    listRef={listRef}
                  />
                ) : null}
                <div className="mb-0.5 flex w-full max-w-[min(100%,42rem)] items-center justify-between gap-2 px-0.5">
                  <span
                    className="text-[11px] font-medium text-fg-muted"
                    title={timeLabel}
                  >
                    {m.role === 'user' ? t('chat.you') : BRAND_APP_NAME}
                    {timeLabel ? (
                      <span className="ml-1.5 font-normal opacity-0 transition-opacity group-hover:opacity-70">
                        · {timeLabel}
                      </span>
                    ) : null}
                  </span>
                  <CopyMessageButton text={copyText} />
                </div>
                {m.role === 'assistant' ? (
                  <AssistantTurn
                    message={m}
                    generating={msgGenerating}
                    memoryNotes={memoryNotes}
                  />
                ) : (
                  <>
                    {m.imageAttachments?.length ? (
                      <MessageImageGallery
                        images={m.imageAttachments}
                        analyzing={
                          !m.visionDescription?.trim() &&
                          messages.some(
                            (x) =>
                              x.role === 'assistant' &&
                              isAssistantGenerating(x) &&
                              /analisar imagem/i.test(x.text),
                          )
                        }
                        className="mb-1.5"
                      />
                    ) : null}
                    <ChatBubble variant="user">
                      {m.text.trim() !== '(imagem anexada)' ? (
                        <p className={`whitespace-pre-wrap ${isChat ? '' : 'text-body'}`}>
                          <TranslatedMessageBlock content={m.text}>
                            {(translatedText) => <>{translatedText}</>}
                          </TranslatedMessageBlock>
                        </p>
                      ) : null}
                      {m.visionDescription && isChat ? (
                        <details className="mt-2 border-t border-line-subtle pt-2">
                          <summary className="cursor-pointer select-none text-ui text-fg-muted">
                            {t('chat.view_image_desc')}
                          </summary>
                          <div className="mt-2">
                            <AssistantMarkdown
                              content={m.visionDescription}
                              variant="reasoning"
                            />
                          </div>
                        </details>
                      ) : null}
                    </ChatBubble>
                  </>
                )}
                {canRedoMessage(m.id) ? (
                  <RedoTurnButton
                    messageRole={m.role}
                    disabled={composerBusy}
                    onRedo={() => onRedoMessage(m.id)}
                  />
                ) : null}
              </li>
            )
          })}

          {showOnboarding && onDismissOnboarding ? (
            <OnboardingCard onDismiss={onDismissOnboarding} />
          ) : null}

          {showWelcomeUi ? (
            <li className="luna-welcome-card">
              <p className="mb-4 text-body leading-relaxed text-fg-dim">{panelHint}</p>
              <div className="flex flex-col gap-2">
                {(starterItems?.length
                  ? starterItems
                  : starters.map((idea) => ({
                      id: idea,
                      message: idea,
                      parts: [{ type: 'text' as const, value: idea }],
                    }))
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onStarterPick(item.message)}
                    className="luna-chip flex w-full flex-wrap items-center gap-1 py-2.5 leading-snug"
                  >
                    <WelcomePartsInline
                      parts={item.parts}
                      badgeSize="sm"
                      className="text-ui text-fg-dim"
                    />
                  </button>
                ))}
              </div>
            </li>
          ) : null}
        </ul>
      </div>
      <ScrollToBottomFab listRef={listRef} />
    </div>
  )
})
