import { useCallback, useEffect, useState } from 'react'
import type { MessageImageAttachment } from '../../types/chat'

type Props = {
  images: MessageImageAttachment[]
  initialIndex?: number
  onClose: () => void
}

export function ImageLightbox({
  images,
  initialIndex = 0,
  onClose,
}: Props) {
  const [index, setIndex] = useState(
    Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1)),
  )
  const current = images[index]

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? images.length - 1 : i - 1))
  }, [images.length])

  const goNext = useCallback(() => {
    setIndex((i) => (i >= images.length - 1 ? 0 : i + 1))
  }, [images.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, goPrev, goNext])

  if (!current) return null

  return (
    <div
      className="image-lightbox fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Visualização da imagem"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-lg text-white/90 transition-colors hover:bg-black/70"
        aria-label="Fechar"
        onClick={onClose}
      >
        ×
      </button>

      {images.length > 1 ? (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 px-2.5 py-3 text-white/90 hover:bg-black/60 sm:left-4"
            aria-label="Imagem anterior"
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 px-2.5 py-3 text-white/90 hover:bg-black/60 sm:right-4"
            aria-label="Próxima imagem"
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
          >
            ›
          </button>
          <p className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[11px] text-white/80">
            {index + 1} / {images.length}
          </p>
        </>
      ) : null}

      <div
        className="flex max-h-[min(90vh,900px)] max-w-[min(96vw,1100px)] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={current.dataUrl}
          alt={current.name}
          className="max-h-[min(82vh,820px)] max-w-full rounded-lg object-contain shadow-2xl ring-1 ring-white/10"
          draggable={false}
        />
        <p className="mt-2 max-w-full truncate px-2 text-center text-[12px] text-white/70">
          {current.name}
        </p>
      </div>
    </div>
  )
}
