import { useEffect, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { scrollChatToMessageTop } from '../../lib/chatScroll'

type Props = {
  messageId: string
  listRef: RefObject<HTMLDivElement | null>
}

/**
 * Botão flutuante quando o topo da mensagem saiu da área visível (scroll longo).
 */
export function ScrollToMessageTopButton({ messageId, listRef }: Props) {
  const { t } = useTranslation()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [topVisible, setTopVisible] = useState(true)

  useEffect(() => {
    const root = listRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel) return

    const io = new IntersectionObserver(
      ([entry]) => {
        setTopVisible(entry?.isIntersecting ?? true)
      },
      { root, threshold: 0, rootMargin: '-8px 0px 0px 0px' },
    )
    io.observe(sentinel)
    return () => io.disconnect()
  }, [listRef, messageId])

  return (
    <>
      <div
        ref={sentinelRef}
        className="pointer-events-none absolute left-0 top-0 z-0 h-px w-full"
        aria-hidden
      />
      {!topVisible ? (
        <button
          type="button"
          className="luna-btn-secondary absolute right-0 top-1 z-20 flex size-8 items-center justify-center rounded-full shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label={t('chatTurn.scroll_message_top')}
          title={t('chatTurn.scroll_message_top')}
          onClick={() => {
            const el = listRef.current
            if (!el) return
            scrollChatToMessageTop(el, messageId, 'smooth')
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="stroke-current"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M12 19V5" strokeLinecap="round" />
            <path
              d="m5 12 7-7 7 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
    </>
  )
}
