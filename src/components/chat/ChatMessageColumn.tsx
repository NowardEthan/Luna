import type { RefObject } from 'react'
import { BRAND_APP_NAME } from '../../brand'
import { isAssistantGenerating } from '../../lib/assistantMessageUi'
import {
  formatMessageTime,
  messageTimestampFromId,
} from '../../lib/messageTimestamp'
import type { MemoryNote } from '../../types/memory'
import type { Message } from '../../types/chat'
import { AssistantMarkdown } from '../AssistantMarkdown'
import { RedoTurnButton } from '../RedoTurnButton'
import { AssistantTurn } from './AssistantTurn'
import { ChatBubble } from './ChatBubble'
import { CopyMessageButton } from './CopyMessageButton'
import { MessageImageGallery } from './MessageImageGallery'
import { OnboardingCard } from '../OnboardingCard'
import { ScrollToBottomFab } from './ScrollToBottomFab'

export const STARTER_IDEAS_CHAT = [
  'O que você pode fazer por mim?',
  'Me ajude a organizar as ideias para um projeto.',
  'Resuma um texto que vou colar em seguida.',
]

export const STARTER_IDEAS_IDE = [
  'Explica o ficheiro activo no projecto.',
  'Lista os ficheiros na raiz do workspace.',
  'Cria um script simples e testa no terminal.',
]

type Props = {
  variant: 'chat' | 'ide'
  listRef: RefObject<HTMLDivElement | null>
  messages: Message[]
  memoryNotes?: MemoryNote[]
  composerBusy: boolean
  generating: boolean
  canRedoMessage: (id: string) => boolean
  onRedoMessage: (id: string) => void
  onStarterPick: (text: string) => void
  showOnboarding?: boolean
  onDismissOnboarding?: () => void
}

export function ChatMessageColumn({
  variant,
  listRef,
  messages,
  memoryNotes,
  composerBusy,
  generating,
  canRedoMessage,
  onRedoMessage,
  onStarterPick,
  showOnboarding,
  onDismissOnboarding,
}: Props) {
  const isChat = variant === 'chat'
  const hasUserMessage = messages.some((m) => m.role === 'user')
  const starters = isChat ? STARTER_IDEAS_CHAT : STARTER_IDEAS_IDE
  const listClass = isChat
    ? 'mx-auto flex max-w-3xl flex-col gap-6 pb-2'
    : 'flex flex-col gap-4 pb-2'
  const regionClass = isChat
    ? 'chat-scroll-region relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3'
    : 'chat-scroll-region relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2'

  return (
    <div ref={listRef} className={regionClass}>
      <ScrollToBottomFab listRef={listRef} forceVisible={generating} />
      <ul className={listClass} aria-live="polite">
        {messages.map((m) => {
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
                  ? 'group scroll-mt-3 flex flex-col items-end'
                  : 'group scroll-mt-3 flex flex-col items-start'
              }
            >
              <div className="mb-1 flex w-full max-w-[min(100%,42rem)] items-center justify-between gap-2">
                <span
                  className="text-caption font-medium text-fg-muted"
                  title={timeLabel}
                >
                  {m.role === 'user' ? 'Você' : BRAND_APP_NAME}
                  {timeLabel ? (
                    <span className="ml-1.5 font-normal opacity-0 transition-opacity group-hover:opacity-100">
                      · {timeLabel}
                    </span>
                  ) : null}
                </span>
                <CopyMessageButton text={copyText} />
              </div>
              {m.role === 'assistant' ? (
                <AssistantTurn
                  key={`${m.id}-${msgGenerating ? 'loading' : 'ready'}`}
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
                        {m.text}
                      </p>
                    ) : null}
                    {m.visionDescription && isChat ? (
                      <details className="mt-2 border-t border-line-subtle pt-2">
                        <summary className="cursor-pointer select-none text-ui text-fg-muted">
                          Ver descrição da imagem
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

        {!hasUserMessage ? (
          <li className="luna-welcome-card">
            <p className="mb-4 text-body leading-relaxed text-fg-dim">
              {isChat
                ? 'Quer começar? Escolha uma sugestão ou escreva à vontade abaixo.'
                : 'Modo IDE — pede alterações em ficheiros, terminal ou git.'}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {starters.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => onStarterPick(idea)}
                  className="luna-chip"
                >
                  {idea}
                </button>
              ))}
            </div>
          </li>
        ) : null}
      </ul>
    </div>
  )
}
