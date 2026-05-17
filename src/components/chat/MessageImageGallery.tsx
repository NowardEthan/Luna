import { useState } from 'react'
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (!images.length) return null

  return (
    <>
      <div
        className={`message-image-gallery flex flex-wrap gap-1.5 ${className}`.trim()}
        role="group"
        aria-label="Imagens anexadas"
      >
        {images.map((im, i) => (
          <button
            key={im.id}
            type="button"
            className="group relative overflow-hidden rounded-xl border border-line-subtle bg-sidebar/60 shadow-sm transition hover:border-accent/40 hover:ring-2 hover:ring-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            onClick={() => setLightboxIndex(i)}
            title={im.name}
            aria-label={`Ver imagem: ${im.name}`}
          >
            <img
              src={im.dataUrl}
              alt=""
              className="size-16 object-cover sm:size-[4.25rem]"
              loading="lazy"
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
              <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
                Ampliar
              </span>
            </span>
          </button>
        ))}
        {analyzing ? (
          <span className="inline-flex items-center gap-1.5 self-center rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent">
            <span
              className="inline-block size-1.5 animate-pulse rounded-full bg-accent"
              aria-hidden
            />
            A analisar
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
