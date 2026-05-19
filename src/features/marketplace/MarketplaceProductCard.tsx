import {
  MARKETPLACE_CATEGORY_LABELS,
  type MarketplaceListing,
} from '../../lib/marketplaceCatalog'
import { coverClassForListing } from './marketplaceCover'

type Props = {
  item: MarketplaceListing
  installed: boolean
  onSelect: () => void
}

export function MarketplaceProductCard({ item, installed, onSelect }: Props) {
  const cover = coverClassForListing(item)

  return (
    <button
      type="button"
      onClick={onSelect}
      className="luna-marketplace-card group flex w-full flex-col overflow-hidden rounded-2xl border border-line/80 bg-surface text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <div
        className={`relative aspect-[4/3] w-full bg-gradient-to-br ${cover}`}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_55%)]"
          aria-hidden
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {item.featured ? (
            <span className="rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              Destaque
            </span>
          ) : null}
          {installed ? (
            <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
              Instalado
            </span>
          ) : null}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <span className="inline-block max-w-full truncate rounded-lg bg-black/40 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            {MARKETPLACE_CATEGORY_LABELS[item.category]}
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
