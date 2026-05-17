import type { RefObject } from 'react'
import { useCallback, useEffect, useState } from 'react'

type Props = {
  listRef: RefObject<HTMLDivElement | null>
  /** Mostrar quando há geração ou scroll acima do fundo */
  forceVisible?: boolean
}

const THRESHOLD_PX = 80

export function ScrollToBottomFab({ listRef, forceVisible }: Props) {
  const [awayFromBottom, setAwayFromBottom] = useState(false)

  const check = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    setAwayFromBottom(dist > THRESHOLD_PX)
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

  const visible = forceVisible || awayFromBottom
  if (!visible) return null

  return (
    <button
      type="button"
      aria-label="Ir para mensagens recentes"
      title="Ir para o fim"
      className="absolute bottom-3 right-3 z-10 flex size-9 items-center justify-center rounded-full border border-line bg-surface/95 text-fg shadow-lg backdrop-blur-sm transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      onClick={() => {
        const el = listRef.current
        if (!el) return
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2" aria-hidden>
        <path d="M12 5v14" strokeLinecap="round" />
        <path d="m19 12-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
