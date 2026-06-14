import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  computeCropRect,
  cropLoadedImage,
  loadImage,
  type CropParams,
} from './folderCustomIcon'

const VIEWPORT_PX = 160
const MIN_SCALE = 1
const MAX_SCALE = 4

type Props = {
  open: boolean
  imageSrc: string | null
  onClose: () => void
  onApply: (dataUrl: string) => void
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export function FolderIconCropModal({
  open,
  imageSrc,
  onClose,
  onApply,
}: Props) {
  const { t } = useTranslation()
  const [scale, setScale] = useState(1.15)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [ready, setReady] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const imgRef = useRef<HTMLImageElement | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    ox: number
    oy: number
  } | null>(null)
  const scaleRef = useRef(scale)
  const offsetRef = useRef(offset)

  scaleRef.current = scale
  offsetRef.current = offset

  const params: CropParams = { scale, offsetX: offset.x, offsetY: offset.y }

  useEffect(() => {
    if (!open || !imageSrc) return
    let cancelled = false
    setReady(false)
    setScale(1.15)
    setOffset({ x: 0, y: 0 })
    setError(null)
    void loadImage(imageSrc).then((img) => {
      if (cancelled) return
      imgRef.current = img
      setReady(true)
    }).catch(() => {
      if (!cancelled) setError(t('history.folderLoadError'))
    })
    return () => {
      cancelled = true
    }
  }, [open, imageSrc])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const getImageSize = useCallback(() => {
    const img = imgRef.current
    if (!img) return null
    return { iw: img.naturalWidth, ih: img.naturalHeight }
  }, [])

  const panFromPixelDelta = useCallback((dx: number, dy: number, ox: number, oy: number) => {
    const size = getImageSize()
    if (!size) return { x: ox, y: oy }
    const { iw, ih } = size
    const { cropSize } = computeCropRect(iw, ih, {
      scale: scaleRef.current,
      offsetX: ox,
      offsetY: oy,
    })
    const displayScale = VIEWPORT_PX / cropSize
    const rangeX = Math.max(1, (iw - cropSize) * 0.5 * displayScale)
    const rangeY = Math.max(1, (ih - cropSize) * 0.5 * displayScale)
    return {
      x: clamp(ox - dx / rangeX, -1, 1),
      y: clamp(oy - dy / rangeY, -1, 1),
    }
  }, [getImageSize])

  const endDrag = useCallback((pointerId?: number) => {
    const d = dragRef.current
    if (d && pointerId != null && d.pointerId !== pointerId) return
    dragRef.current = null
    setDragging(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointerMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || d.pointerId !== e.pointerId) return
      const next = panFromPixelDelta(
        e.clientX - d.startX,
        e.clientY - d.startY,
        d.ox,
        d.oy,
      )
      offsetRef.current = next
      setOffset(next)
    }
    const onPointerUp = (e: PointerEvent) => endDrag(e.pointerId)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [open, panFromPixelDelta, endDrag])

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !ready) return
    e.preventDefault()
    viewportRef.current?.setPointerCapture(e.pointerId)
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      ox: offset.x,
      oy: offset.y,
    }
    setDragging(true)
  }

  const onWheel = (e: React.WheelEvent) => {
    if (!ready) return
    e.preventDefault()
    e.stopPropagation()
    const factor = e.deltaY < 0 ? 1.06 : 1 / 1.06
    setScale((s) => clamp(s * factor, MIN_SCALE, MAX_SCALE))
  }

  const resetView = () => {
    setScale(1.15)
    setOffset({ x: 0, y: 0 })
  }

  const handleApply = () => {
    const img = imgRef.current
    if (!img) return
    setBusy(true)
    setError(null)
    try {
      const url = cropLoadedImage(img, {
        scale: scaleRef.current,
        offsetX: offsetRef.current.x,
        offsetY: offsetRef.current.y,
      })
      onApply(url)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('history.folderSaveError'))
    } finally {
      setBusy(false)
    }
  }

  if (!open || !imageSrc) return null

  const size = getImageSize()
  const rect = size ? computeCropRect(size.iw, size.ih, params) : null
  const displayScale = rect ? VIEWPORT_PX / rect.cropSize : 1

  return (
    <div
      className="luna-overlay-scrim fixed inset-0 z-[95] flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="crop-icon-title"
        className="luna-dialog flex w-full max-w-sm flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line px-4 py-3">
          <h2 id="crop-icon-title" className="text-title font-semibold text-fg">
            {t('history.folderCropTitle')}
          </h2>
          <p className="mt-0.5 text-[11px] text-fg-muted">
            {t('history.folderCropHint')}
          </p>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div
            ref={viewportRef}
            className={`relative mx-auto touch-none select-none overflow-hidden rounded-xl border border-line bg-canvas shadow-inner ${
              dragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{ width: VIEWPORT_PX, height: VIEWPORT_PX }}
            onPointerDown={onPointerDown}
            onWheel={onWheel}
          >
            {ready && rect && imageSrc ? (
              <img
                src={imageSrc}
                alt=""
                draggable={false}
                className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
                style={{
                  width: size!.iw * displayScale,
                  height: size!.ih * displayScale,
                  transform: `translate3d(${-rect.sx * displayScale}px, ${-rect.sy * displayScale}px, 0)`,
                  willChange: dragging ? 'transform' : 'auto',
                }}
              />
            ) : (
              <div className="flex size-full items-center justify-center text-[11px] text-fg-muted">
                {t('history.folderLoading')}
              </div>
            )}

            <div
              className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-line"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-3 rounded-lg border border-white/25"
              aria-hidden
            />
          </div>

          <label className="block">
            <span className="mb-1 flex justify-between text-[10px] text-fg-muted">
              <span>{t('history.folderZoom')}</span>
              <span>{Math.round(scale * 100)}%</span>
            </span>
            <input
              type="range"
              min={MIN_SCALE}
              max={MAX_SCALE}
              step={0.01}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </label>

          <button
            type="button"
            onClick={resetView}
            className="w-full text-center text-[10px] text-fg-muted hover:text-fg-dim"
          >
            {t('history.folderResetView')}
          </button>

          {error ? (
            <p className="text-[11px] text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-line px-4 py-3">
          <button
            type="button"
            className="luna-btn-secondary flex-1 py-2"
            onClick={onClose}
            disabled={busy}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="luna-btn-primary flex-1 py-2 disabled:opacity-50"
            onClick={handleApply}
            disabled={busy || !ready}
          >
            {busy ? t('history.folderSaving') : t('history.folderApply')}
          </button>
        </div>
      </div>
    </div>
  )
}
