import catalogJson from '../data/marketplace-catalog.json'

export type MarketplaceInstallType = 'bundled' | 'disk' | 'url'

export type MarketplaceCategoryId =
  | 'starter'
  | 'demo'
  | 'productivity'
  | 'integration'
  | 'utility'
  | 'community'

export type MarketplaceListing = {
  id: string
  pluginId: string
  name: string
  description: string
  version: string
  author: string
  category: MarketplaceCategoryId
  tags: string[]
  featured: boolean
  install: { type: MarketplaceInstallType; url?: string }
  permissions: string[]
  trusted: boolean
  repositoryUrl?: string
  homepageUrl?: string
}

export type MarketplaceCatalog = {
  version: number
  updatedAt: string
  items: MarketplaceListing[]
}

export const MARKETPLACE_CATEGORY_LABELS: Record<MarketplaceCategoryId, string> =
  {
    starter: 'Para começar',
    demo: 'Demonstrações',
    productivity: 'Produtividade',
    integration: 'Integrações',
    utility: 'Utilitários',
    community: 'Comunidade',
  }

const CATALOG = catalogJson as MarketplaceCatalog

export function getMarketplaceCatalog(): MarketplaceCatalog {
  return CATALOG
}

export function marketplaceListings(): MarketplaceListing[] {
  return CATALOG.items
}

export function marketplaceListingById(id: string): MarketplaceListing | undefined {
  return CATALOG.items.find((item) => item.id === id)
}

export function filterMarketplaceListings(
  items: MarketplaceListing[],
  query: string,
  category: MarketplaceCategoryId | 'all',
  featuredOnly: boolean,
): MarketplaceListing[] {
  const q = query.trim().toLowerCase()
  return items.filter((item) => {
    if (featuredOnly && !item.featured) return false
    if (category !== 'all' && item.category !== category) return false
    if (!q) return true
    const hay = [
      item.name,
      item.description,
      item.author,
      item.pluginId,
      ...item.tags,
    ]
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}

export function marketplaceCategories(
  items: MarketplaceListing[],
): MarketplaceCategoryId[] {
  const set = new Set<MarketplaceCategoryId>()
  for (const item of items) {
    set.add(item.category)
  }
  return [...set].sort((a, b) =>
    (MARKETPLACE_CATEGORY_LABELS[a] ?? a).localeCompare(
      MARKETPLACE_CATEGORY_LABELS[b] ?? b,
      'pt',
    ),
  )
}
