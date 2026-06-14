import {
  useCallback,
  useEffect,
  useRef,
  type RefObject,
} from 'react'
import type { Message } from '../types/chat'
import {
  isNearChatBottom,
  scrollChatToBottom,
} from '../lib/chatScroll'

type Options = {
  /** Desactivar (ex.: painel sem lista de mensagens) */
  enabled?: boolean
  /** Durante geração usa scroll instantâneo para acompanhar o stream */
  generating?: boolean
}

/**
 * Mantém o scroll no fundo enquanto o utilizador não subir manualmente.
 * Substitui o antigo scrollIntoView(block: 'start') que prendia o topo da resposta.
 */
export function useChatScrollFollow(
  listRef: RefObject<HTMLDivElement | null>,
  messages: Message[],
  activeId: string | null,
  options?: Options,
) {
  const enabled = options?.enabled !== false
  const stickToBottomRef = useRef(true)
  const prevLenRef = useRef(0)
  const prevActiveIdRef = useRef<string | null>(activeId)

  const syncStickFromScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    stickToBottomRef.current = isNearChatBottom(el)
  }, [listRef])

  const followBottom = useCallback(
    (behavior: ScrollBehavior) => {
      const el = listRef.current
      if (!el || !stickToBottomRef.current) return
      scrollChatToBottom(el, behavior)
    },
    [listRef],
  )

  useEffect(() => {
    if (!enabled) return
    const el = listRef.current
    if (!el) return

    syncStickFromScroll()
    el.addEventListener('scroll', syncStickFromScroll, { passive: true })

    const ro = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        scrollChatToBottom(el, 'auto')
      }
    })
    ro.observe(el)
    for (const child of el.children) {
      ro.observe(child)
    }

    return () => {
      el.removeEventListener('scroll', syncStickFromScroll)
      ro.disconnect()
    }
  }, [enabled, listRef, syncStickFromScroll, messages.length])

  useEffect(() => {
    if (!enabled) return
    const el = listRef.current
    if (!el) return

    const switchedConv = prevActiveIdRef.current !== activeId
    prevActiveIdRef.current = activeId

    if (switchedConv) {
      stickToBottomRef.current = true
      prevLenRef.current = messages.length
      requestAnimationFrame(() => scrollChatToBottom(el, 'auto'))
      return
    }

    const prevLen = prevLenRef.current
    prevLenRef.current = messages.length

    if (messages.length > prevLen) {
      const added = messages.slice(prevLen)
      if (added.some((m) => m.role === 'user')) {
        stickToBottomRef.current = true
      }
    }

    if (!stickToBottomRef.current) return

    const behavior: ScrollBehavior = options?.generating ? 'auto' : 'smooth'
    requestAnimationFrame(() => scrollChatToBottom(el, behavior))
  }, [enabled, messages, activeId, listRef, options?.generating])

  return { stickToBottomRef, followBottom }
}
