import { useTranslation } from 'react-i18next'
import {
  marketplaceCategoryLabel,
  type MarketplaceListing,
} from '../../lib/marketplaceCatalog'
import { MarketplaceListingArt } from './MarketplaceListingArt'

type Props = {
  item: MarketplaceListing
  installed: boolean
  onSelect: () => void
}

export function MarketplaceProductCard({ item, installed, onSelect }: Props) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onSelect}
      className="luna-marketplace-card group flex w-full flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <div className="relative aspect-[4/3] w-full">
        <MarketplaceListingArt item={item} variant="card" className="absolute inset-0" />
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
          {item.featured ? (
            <span className="rounded-full bg-raised px-2 py-0.5 text-[10px] font-semibold text-white ">
              {t('marketplace.card.featured')}
            </span>
          ) : null}
          {installed ? (
            <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
              {t('marketplace.card.installed')}
            </span>
          ) : null}
        </div>
        <div className="absolute bottom-3 left-3 right-3 z-10">
          <span className="inline-block max-w-full truncate rounded-lg border border-line bg-raised px-2 py-1 text-[11px] font-medium text-fg">
            {marketplaceCategoryLabel(item.category)}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3.5 py-3">
        <h3 className="line-clamp-1 text-[13px] font-semibold text-fg group-hover:text-accent">
          {item.name}
        </h3>
        <p className="line-clamp-2 min-h-[2.5rem] text-[11px] leading-snug text-fg-muted">
          {item.description}
        </p>
        <p className="mt-auto pt-1 text-[10px] text-fg-muted">
          {item.author} · v{item.version}
        </p>
      </div>
    </button>
  )
}
