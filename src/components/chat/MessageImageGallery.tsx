import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MessageImageAttachment } from '../../types/chat'
import { ImageLightbox } from './ImageLightbox'

type Props = {
  images: MessageImageAttachment[]
  /** Enquanto a Lunar Vision ainda não terminou */
  analyzing?: boolean
  className?: string
}

export function MessageImageGallery({
  images,
  analyzing = false,
  className = '',
}: Props) {
  const { t } = useTranslation()
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (!images.length) return null

  return (
    <>
      <div
        className={`message-image-gallery flex flex-wrap gap-1.5 ${className}`.trim()}
        role="group"
        aria-label={t('chatTurn.images_aria')}
      >
        {images.map((im, i) => (
          <button
            key={im.id}
            type="button"
            className="group relative overflow-hidden rounded-xl border border-line-subtle bg-sidebar shadow-sm transition hover:border-accent hover:ring-2 hover:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            onClick={() => setLightboxIndex(i)}
            title={im.name}
            aria-label={t('chatTurn.view_image', { name: im.name })}
          >
            <img
              src={im.dataUrl}
              alt=""
              className="size-16 object-cover sm:size-[4.25rem]"
              loading="lazy"
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-raised-hover group-hover:opacity-100">
              <span className="rounded-full border border-line bg-raised px-2 py-0.5 text-[10px] font-medium text-fg">
                {t('chatTurn.enlarge')}
              </span>
            </span>
          </button>
        ))}
        {analyzing ? (
          <span className="inline-flex items-center gap-1.5 self-center rounded-full border border-accent bg-accent-muted px-2 py-1 text-[10px] font-medium text-accent">
            <span
              className="inline-block size-1.5 animate-pulse rounded-full bg-accent"
              aria-hidden
            />
            {t('chatTurn.analyzing')}
          </span>
        ) : null}
      </div>

      {lightboxIndex != null ? (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  )
}
