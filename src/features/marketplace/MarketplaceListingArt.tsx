import { useState } from 'react'
import type { MarketplaceListing } from '../../lib/marketplaceCatalog'
import { coverClassForListing } from './marketplaceCover'

type Props = {
  item: MarketplaceListing
  variant: 'card' | 'modal'
  className?: string
}

function artImageSrc(url: string, version: string): string {
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}v=${encodeURIComponent(version)}`
}

export function MarketplaceListingArt({ item, variant, className = '' }: Props) {
  const cover = coverClassForListing(item)
  const rawUrl = item.bannerUrl ?? item.iconUrl
  const [failed, setFailed] = useState(false)
  const isModal = variant === 'modal'

  if (rawUrl && !failed) {
    return (
      <div
        className={`absolute inset-0 overflow-hidden bg-[#06060c] ${className}`}
      >
        <img
          src={artImageSrc(rawUrl, item.version)}
          alt=""
          className="size-full object-cover object-center"
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
        />
        {!isModal ? (
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
            aria-hidden
          />
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={`absolute inset-0 bg-gradient-to-br ${cover} ${isModal ? '' : 'min-h-[8rem]'} ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_55%)]"
        aria-hidden
      />
    </div>
  )
}
