import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      className="image-lightbox luna-overlay-scrim fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('chatTurn.lightbox_aria')}
      onClick={onClose}
    >
      <button
        type="button"
        className="luna-modal-close absolute right-3 top-3 z-10 !size-9 text-lg"
        aria-label={t('chatTurn.close')}
        onClick={onClose}
      >
        ×
      </button>

      {images.length > 1 ? (
        <>
          <button
            type="button"
            className="luna-btn-secondary absolute left-2 top-1/2 z-10 -translate-y-1/2 !rounded-full !px-2.5 !py-3 sm:left-4"
            aria-label={t('chatTurn.prev_image')}
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="luna-btn-secondary absolute right-2 top-1/2 z-10 -translate-y-1/2 !rounded-full !px-2.5 !py-3 sm:right-4"
            aria-label={t('chatTurn.next_image')}
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
          >
            ›
          </button>
          <p className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-raised px-3 py-1 text-[11px] text-fg-dim">
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
          className="max-h-[min(82vh,820px)] max-w-full rounded-lg object-contain shadow-overlay ring-1 ring-line"
          draggable={false}
        />
        <p className="mt-2 max-w-full truncate px-2 text-center text-[12px] text-white/70">
          {current.name}
        </p>
      </div>
    </div>
  )
}
