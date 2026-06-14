import { useEffect, useRef, useState } from 'react'

/** Largura abaixo da qual o painel de histórico usa UI compacta */
export const HISTORY_PANEL_COMPACT_WIDTH = 252

export function useHistoryPanelCompact(
  threshold = HISTORY_PANEL_COMPACT_WIDTH,
) {
  const ref = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = (width: number) => {
      setCompact(width < threshold)
    }

    update(el.getBoundingClientRect().width)
    const ro = new ResizeObserver(([entry]) => {
      update(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [threshold])

  return { ref, compact }
}
