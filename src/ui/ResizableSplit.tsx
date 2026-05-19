import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  readPanelLayout,
  writePanelLayout,
} from '../lib/panelLayoutStorage'

export type ResizableSplitProps = {
  direction?: 'horizontal' | 'vertical'
  leading: ReactNode
  trailing: ReactNode
  /** Largura/altura do painel inicial (px) se não houver valor guardado. */
  defaultLeadingSize: number
  /** Se não houver valor em storage, usa esta fração do contentor (0–1). */
  defaultLeadingRatio?: number
  /** Tamanho actual controlado (opcional). */
  leadingSize?: number
  minLeading?: number
  minTrailing?: number
  /** Persiste em localStorage (`luna-panel-<key>`). */
  storageKey?: string
  onLeadingSizeChange?: (size: number) => void
  className?: string
  /** Se false, não mostra o separador (painel colapsado). */
  resizable?: boolean
}

export function ResizableSplit({
  direction = 'horizontal',
  leading,
  trailing,
  defaultLeadingSize,
  defaultLeadingRatio,
  leadingSize: controlledSize,
  minLeading = 160,
  minTrailing = 200,
  storageKey,
  onLeadingSizeChange,
  className = '',
  resizable = true,
}: ResizableSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isHorizontal = direction === 'horizontal'
  const [internalSize, setInternalSize] = useState(defaultLeadingSize)
  const storedRatioRef = useRef<number | null>(null)
  const hydratedRef = useRef(false)

  const clampLeading = useCallback(
    (total: number, size: number) => {
      const maxLeading = Math.max(minLeading, total - minTrailing)
      return Math.min(maxLeading, Math.max(minLeading, size))
    },
    [minLeading, minTrailing],
  )

  const containerTotal = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return isHorizontal ? rect.width : rect.height
  }, [isHorizontal])

  const persistLayout = useCallback(
    (size: number) => {
      if (!storageKey) return
      const total = containerTotal()
      if (total > 0) {
        const ratio = size / total
        writePanelLayout(storageKey, { ratio, px: size })
        storedRatioRef.current = ratio
      } else {
        writePanelLayout(storageKey, { px: size })
      }
    },
    [storageKey, containerTotal],
  )

  const applyStoredLayout = useCallback(() => {
    if (controlledSize !== undefined) return false
    const total = containerTotal()
    if (total <= 0) return false

    const layout = storageKey ? readPanelLayout(storageKey) : null

    let next: number
    if (layout?.ratio != null) {
      storedRatioRef.current = layout.ratio
      next = clampLeading(total, total * layout.ratio)
    } else if (layout?.px != null) {
      next = clampLeading(total, layout.px)
      storedRatioRef.current = next / total
    } else if (!hydratedRef.current && defaultLeadingRatio != null) {
      storedRatioRef.current = defaultLeadingRatio
      next = clampLeading(total, total * defaultLeadingRatio)
    } else if (!hydratedRef.current) {
      next = clampLeading(total, defaultLeadingSize)
      storedRatioRef.current = next / total
    } else {
      return false
    }

    setInternalSize(next)
    hydratedRef.current = true
    return true
  }, [
    controlledSize,
    storageKey,
    containerTotal,
    clampLeading,
    defaultLeadingRatio,
    defaultLeadingSize,
  ])

  useLayoutEffect(() => {
    if (controlledSize !== undefined) return
    if (!storageKey) {
      if (defaultLeadingRatio != null) {
        const total = containerTotal()
        if (total > 0) {
          setInternalSize(clampLeading(total, total * defaultLeadingRatio))
        }
      }
      return
    }
    applyStoredLayout()
  }, [
    controlledSize,
    storageKey,
    defaultLeadingRatio,
    applyStoredLayout,
    clampLeading,
    containerTotal,
  ])

  useEffect(() => {
    if (!storageKey || controlledSize !== undefined) return
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(() => {
      const total = containerTotal()
      if (total <= 0) return

      if (!hydratedRef.current) {
        applyStoredLayout()
        return
      }

      const ratio = storedRatioRef.current
      if (ratio == null) return
      setInternalSize(clampLeading(total, total * ratio))
    })

    ro.observe(el)
    return () => ro.disconnect()
  }, [
    storageKey,
    controlledSize,
    applyStoredLayout,
    clampLeading,
    containerTotal,
  ])

  const leadingSize = controlledSize ?? internalSize
  const sizeProp = isHorizontal ? 'width' : 'height'

  const setSize = useCallback(
    (next: number, options?: { persist?: boolean }) => {
      if (controlledSize === undefined) {
        setInternalSize(next)
      }
      onLeadingSizeChange?.(next)
      if (options?.persist) persistLayout(next)
    },
    [controlledSize, onLeadingSizeChange, persistLayout],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!resizable || leadingSize <= 0) return
      e.preventDefault()
      const startSize = leadingSize
      const startPos = isHorizontal ? e.clientX : e.clientY
      let lastSize = startSize

      const onMove = (ev: PointerEvent) => {
        const total = containerTotal()
        if (total <= 0) return
        const delta = (isHorizontal ? ev.clientX : ev.clientY) - startPos
        lastSize = clampLeading(total, startSize + delta)
        setSize(lastSize)
      }

      const onUp = () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        persistLayout(lastSize)
      }

      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [
      isHorizontal,
      leadingSize,
      resizable,
      setSize,
      clampLeading,
      containerTotal,
      persistLayout,
    ],
  )

  const nudge = useCallback(
    (delta: number) => {
      const total = containerTotal()
      if (total <= 0) return
      const next = clampLeading(total, leadingSize + delta)
      setSize(next, { persist: true })
    },
    [containerTotal, clampLeading, leadingSize, setSize],
  )

  const showHandle = resizable && leadingSize > 0

  return (
    <div
      ref={containerRef}
      className={`flex min-h-0 min-w-0 ${isHorizontal ? 'flex-row' : 'flex-col'} ${className}`.trim()}
    >
      <div
        className={`min-h-0 min-w-0 shrink-0 overflow-hidden ${
          isHorizontal ? 'flex h-full flex-col self-stretch' : 'flex flex-col'
        }`}
        style={{ [sizeProp]: leadingSize > 0 ? leadingSize : 0 }}
      >
        {leadingSize > 0 ? leading : null}
      </div>

      {showHandle ? (
        <div
          role="separator"
          aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
          aria-label="Redimensionar painéis"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' && isHorizontal) nudge(-16)
            if (e.key === 'ArrowRight' && isHorizontal) nudge(16)
            if (e.key === 'ArrowUp' && !isHorizontal) nudge(-16)
            if (e.key === 'ArrowDown' && !isHorizontal) nudge(16)
          }}
          className={
            isHorizontal
              ? 'luna-resize-handle luna-resize-handle--horizontal'
              : 'luna-resize-handle luna-resize-handle--vertical'
          }
        />
      ) : null}

      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
          isHorizontal ? 'h-full self-stretch' : 'min-h-0'
        }`}
      >
        {trailing}
      </div>
    </div>
  )
}
