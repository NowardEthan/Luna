import { BRAND_APP_NAME } from '../../../brand'
import type {
  WelcomeConversationBadge,
  WelcomeTextPart,
} from '../contextualChatWelcome'
import { ChatBubble } from '../../../components/chat/ChatBubble'
import { WelcomePartsInline } from './WelcomePartsInline'

type Props = {
  parts: WelcomeTextPart[]
  conversationBadges: WelcomeConversationBadge[]
  onOpenConversation: (id: string) => void
}

export function WelcomeAssistantMessage({
  parts,
  conversationBadges,
  onOpenConversation,
}: Props) {
  return (
    <li className="group scroll-mt-3 flex flex-col items-start">
      <div className="mb-0.5 flex w-full max-w-[min(100%,42rem)] items-center justify-between gap-2 px-0.5">
        <span className="text-[11px] font-medium text-fg-muted">{BRAND_APP_NAME}</span>
      </div>
      <ChatBubble variant="assistant">
        <p className="text-body leading-relaxed text-fg">
          <WelcomePartsInline parts={parts} />
        </p>
        {conversationBadges.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-subtle pt-3">
            <span className="w-full text-[10px] text-fg-muted">
              Conversas anteriores
            </span>
            {conversationBadges.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onOpenConversation(b.id)}
                className="luna-chip inline-flex max-w-full items-center gap-1.5 text-[11px]"
                title={`Abrir «${b.title}»`}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="shrink-0 stroke-current opacity-70"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path
                    d="M8 10h8M8 14h5M6 4h12a2 2 0 012 2v12l-4-3-4 3V6a2 2 0 012-2z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="truncate">{b.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </ChatBubble>
    </li>
  )
}
