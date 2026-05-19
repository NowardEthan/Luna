import type { MarketplaceCategoryId, MarketplaceListing } from '../../lib/marketplaceCatalog'

export type MarketplaceCoverKey =
  | 'violet'
  | 'cyan'
  | 'amber'
  | 'emerald'
  | 'rose'
  | 'slate'
  | 'indigo'

const BY_CATEGORY: Record<MarketplaceCategoryId, MarketplaceCoverKey> = {
  starter: 'violet',
  demo: 'cyan',
  productivity: 'emerald',
  integration: 'indigo',
  utility: 'slate',
  community: 'rose',
}

/** Classes Tailwind para arte de capa do card (gradiente + brilho). */
export const MARKETPLACE_COVER_CLASS: Record<MarketplaceCoverKey, string> = {
  violet:
    'from-violet-600/90 via-fuchsia-500/70 to-indigo-900/80',
  cyan: 'from-cyan-500/85 via-sky-400/60 to-indigo-800/75',
  amber:
    'from-amber-500/80 via-orange-400/55 to-rose-900/70',
  emerald:
    'from-emerald-500/80 via-teal-400/55 to-slate-900/75',
  rose: 'from-rose-500/85 via-pink-400/50 to-violet-950/80',
  slate:
    'from-slate-500/70 via-slate-400/40 to-slate-950/80',
  indigo:
    'from-indigo-600/90 via-violet-500/65 to-slate-950/85',
}

export function coverKeyForListing(item: MarketplaceListing): MarketplaceCoverKey {
  return BY_CATEGORY[item.category] ?? 'slate'
}

export function coverClassForListing(item: MarketplaceListing): string {
  return MARKETPLACE_COVER_CLASS[coverKeyForListing(item)]
}
