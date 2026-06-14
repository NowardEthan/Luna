import { useCallback, useLayoutEffect, useRef } from 'react'

type Options = {
  minHeightPx?: number
  maxHeightPx?: number
}

export function resizeTextareaElement(
  el: HTMLTextAreaElement,
  minHeightPx = 44,
  maxHeightPx = 240,
): void {
  el.style.height = '0px'
  const contentHeight = el.scrollHeight
  const next = Math.min(Math.max(contentHeight, minHeightPx), maxHeightPx)
  el.style.height = `${next}px`
  el.style.maxHeight = `${maxHeightPx}px`
  el.style.overflowY = contentHeight > maxHeightPx ? 'auto' : 'hidden'
}

/** Ajusta a altura do textarea ao conteúdo (com limite máximo e scroll interno). */
export function useAutoResizeTextarea(value: string, options: Options = {}) {
  const { minHeightPx = 44, maxHeightPx = 240 } = options
  const ref = useRef<HTMLTextAreaElement | null>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    resizeTextareaElement(el, minHeightPx, maxHeightPx)
  }, [minHeightPx, maxHeightPx])

  const setRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      ref.current = node
      if (node) resizeTextareaElement(node, minHeightPx, maxHeightPx)
    },
    [minHeightPx, maxHeightPx],
  )

  useLayoutEffect(() => {
    resize()
  }, [value, resize])

  return { ref, setRef, resize, minHeightPx, maxHeightPx }
}
