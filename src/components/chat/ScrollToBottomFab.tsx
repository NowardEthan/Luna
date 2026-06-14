import type { RefObject } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isNearChatBottom, scrollChatToBottom } from '../../lib/chatScroll'

type Props = {
  listRef: RefObject<HTMLDivElement | null>
}

export function ScrollToBottomFab({ listRef }: Props) {
  const { t } = useTranslation()
  const [awayFromBottom, setAwayFromBottom] = useState(false)

  const check = useCallback(() => {
    const el = listRef.current
    if (!el) return
    setAwayFromBottom(!isNearChatBottom(el))
  }, [listRef])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    check()
    el.addEventListener('scroll', check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', check)
      ro.disconnect()
    }
  }, [listRef, check])

  if (!awayFromBottom) return null

  return (
    <button
      type="button"
      aria-label={t('chatTurn.scroll_recent')}
      title={t('chatTurn.scroll_end')}
      className="luna-btn-secondary pointer-events-auto absolute bottom-3 right-3 z-10 flex size-9 items-center justify-center rounded-full shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      onClick={() => {
        const el = listRef.current
        if (!el) return
        scrollChatToBottom(el, 'smooth')
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2" aria-hidden>
        <path d="M12 5v14" strokeLinecap="round" />
        <path d="m19 12-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
