import catalogJson from '../data/marketplace-catalog.json'
import i18n from '../i18n'
import { profileSearchText, type MarketplaceListingProfile } from './marketplaceProfile'

export type {
  MarketplaceListingProfile,
  MarketplacePublisher,
  MarketplaceScreenshot,
  MarketplaceFeature,
  MarketplaceExample,
  MarketplaceVersionEntry,
  MarketplaceDocLink,
} from './marketplaceProfile'

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
  /** Capa do card e drawer (URL público, ex. Firebase Hosting). */
  bannerUrl?: string
  /** Ícone quadrado opcional; se omitido, usa bannerUrl. */
  iconUrl?: string
  repositoryUrl?: string
  homepageUrl?: string
  /** Perfil alargado (autor, exemplos, capturas, changelog, etc.). */
  profile?: MarketplaceListingProfile
  /** UID Firebase de quem publicou (Conta Lunar). */
  publishedByUid?: string
  publishedByEmail?: string
}

/** Arte estática no Hosting: /marketplace/{pluginId}-banner.png */
export function marketplaceHostingAssetUrl(
  projectId: string,
  fileName: string,
): string {
  return `https://${projectId}.web.app/marketplace/${fileName}`
}

/** URL pública de download (Firebase Storage) para um pacote `.zip` de add-on. */
export function marketplacePluginStorageUrl(
  storageBucket: string,
  pluginId: string,
  version: string,
): string {
  const objectPath = `marketplace/plugins/${pluginId}/${pluginId}-${version}.zip`
  const encoded = encodeURIComponent(objectPath)
  return `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encoded}?alt=media`
}

export type MarketplaceCatalog = {
  version: number
  updatedAt: string
  items: MarketplaceListing[]
}

/** @deprecated Use marketplaceCategoryLabel() for i18n */
export const MARKETPLACE_CATEGORY_IDS: MarketplaceCategoryId[] = [
  'starter',
  'demo',
  'productivity',
  'integration',
  'utility',
  'community',
]

export function marketplaceCategoryLabel(id: MarketplaceCategoryId): string {
  return i18n.t(`marketplace.category.${id}`)
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
      profileSearchText(item.profile),
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
    marketplaceCategoryLabel(a).localeCompare(marketplaceCategoryLabel(b), i18n.language),
  )
}
