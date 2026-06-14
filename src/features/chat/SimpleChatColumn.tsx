import type { ReactNode, RefObject } from 'react'
import type { Message } from '../../types/chat'
import { readTurnStatusLabel } from '../../lib/assistantMessageUi'
import { ScrollToBottomFab } from '../../components/chat/ScrollToBottomFab'
import { AssistantMarkdown } from '../../components/AssistantMarkdown'

type Props = {
  listRef: RefObject<HTMLDivElement | null>
  messages: Message[]
  generating: boolean
  footer?: ReactNode
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="chat-bubble chat-bubble--user max-w-[min(100%,36rem)] px-4 py-3 text-[14px] leading-relaxed">
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  )
}

function AssistantBubble({ message: m }: { message: Message }) {
  const streaming = m.streamingActive === true
  const text = m.text.trim()
  const statusHint = readTurnStatusLabel(m)

  if (!text && streaming && statusHint) {
    return (
      <p className="text-[14px] text-fg-muted animate-pulse">{statusHint}</p>
    )
  }

  if (!text && !streaming) {
    return (
      <p className="text-[14px] text-fg-muted animate-pulse">A responder…</p>
    )
  }

  return (
    <div className="chat-bubble chat-bubble--assistant max-w-[min(100%,42rem)] px-5 py-4 text-[14px] leading-relaxed">
      {text ? (
        <AssistantMarkdown content={text} variant="compact" messageId={m.id} />
      ) : null}
      {streaming ? (
        <span
          className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] animate-pulse bg-accent/90"
          aria-hidden
        />
      ) : null}
    </div>
  )
}

export function SimpleChatColumn({ listRef, messages, footer }: Props) {
  return (
    <div className="chat-scroll-shell relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={listRef}
        className="chat-scroll-region min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
      >
        <ul className="mx-auto flex max-w-3xl flex-col gap-4 pb-2" aria-live="polite">
          {messages.map((m) => (
            <li
              key={m.id}
              data-message-id={m.id}
              className={
                m.role === 'user'
                  ? 'flex flex-col items-end scroll-mt-3'
                  : 'flex flex-col items-start scroll-mt-3'
              }
            >
              <span className="mb-1 text-[11px] font-medium text-fg-muted">
                {m.role === 'user' ? 'Tu' : 'Luna'}
              </span>
              {m.role === 'user' ? (
                <UserBubble text={m.text} />
              ) : (
                <AssistantBubble message={m} />
              )}
            </li>
          ))}
          {footer}
        </ul>
      </div>
      <ScrollToBottomFab listRef={listRef} />
    </div>
  )
}
