import type {
  MarketplaceCatalog,
  MarketplaceListing,
} from './marketplaceCatalog'
import { normalizeMarketplaceProfile } from './marketplaceProfile'

function isListing(value: unknown): value is MarketplaceListing {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.pluginId === 'string' &&
    typeof o.name === 'string' &&
    typeof o.description === 'string' &&
    typeof o.install === 'object' &&
    o.install !== null &&
    typeof (o.install as { type?: unknown }).type === 'string'
  )
}

function normalizeListing(raw: unknown): MarketplaceListing | null {
  if (!isListing(raw)) return null
  const o = raw as Record<string, unknown>
  const install = o.install as MarketplaceListing['install']
  return {
    id: o.id as string,
    pluginId: o.pluginId as string,
    name: o.name as string,
    description: o.description as string,
    version: typeof o.version === 'string' ? o.version : '1.0.0',
    author: typeof o.author === 'string' ? o.author : 'Luna',
    category: (o.category as MarketplaceListing['category']) ?? 'utility',
    tags: Array.isArray(o.tags)
      ? o.tags.filter((t): t is string => typeof t === 'string')
      : [],
    featured: Boolean(o.featured),
    install,
    permissions: Array.isArray(o.permissions)
      ? o.permissions.filter((p): p is string => typeof p === 'string')
      : [],
    trusted: Boolean(o.trusted),
    bannerUrl:
      typeof o.bannerUrl === 'string' && o.bannerUrl.trim()
        ? o.bannerUrl.trim()
        : undefined,
    iconUrl:
      typeof o.iconUrl === 'string' && o.iconUrl.trim()
        ? o.iconUrl.trim()
        : undefined,
    repositoryUrl:
      typeof o.repositoryUrl === 'string' ? o.repositoryUrl : undefined,
    homepageUrl: typeof o.homepageUrl === 'string' ? o.homepageUrl : undefined,
    profile: normalizeMarketplaceProfile(o.profile),
    publishedByUid:
      typeof o.publishedByUid === 'string' ? o.publishedByUid : undefined,
    publishedByEmail:
      typeof o.publishedByEmail === 'string' ? o.publishedByEmail : undefined,
  }
}

function parseCatalog(json: unknown): MarketplaceCatalog | null {
  if (!json || typeof json !== 'object') return null
  const o = json as Record<string, unknown>
  if (!Array.isArray(o.items)) return null
  const items = o.items
    .map(normalizeListing)
    .filter((item): item is MarketplaceListing => item !== null)
  if (items.length === 0 && o.items.length > 0) return null
  return {
    version: typeof o.version === 'number' ? o.version : 1,
    updatedAt:
      typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toISOString(),
    items,
  }
}

/** Evita JSON em cache do browser/CDN após deploy do Hosting. */
export function marketplaceCatalogFetchUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim()
  if (!trimmed) return trimmed
  const sep = trimmed.includes('?') ? '&' : '?'
  return `${trimmed}${sep}cb=${Date.now()}`
}

/**
 * Carrega catálogo da marketplace a partir de JSON público (Firebase Hosting, Storage, etc.).
 */
export type FetchRemoteCatalogOptions = RequestInit & {
  /** Evita warn na consola (ex.: catálogo remoto opcional em dev). */
  quiet?: boolean
}

export async function fetchRemoteMarketplaceCatalog(
  url: string,
  init?: FetchRemoteCatalogOptions,
): Promise<MarketplaceCatalog | null> {
  const { quiet, ...fetchInit } = init ?? {}
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    const res = await fetch(marketplaceCatalogFetchUrl(trimmed), {
      ...fetchInit,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...fetchInit.headers,
      },
    })
    if (!res.ok) {
      if (!quiet && import.meta.env.DEV) {
        console.debug(
          `[Luna] Catálogo remoto HTTP ${res.status} — usa catálogo local.`,
        )
      }
      return null
    }
    const json: unknown = await res.json()
    return parseCatalog(json)
  } catch (err) {
    if (!quiet) {
      console.warn('[Luna] Catálogo remoto da marketplace indisponível:', err)
    }
    return null
  }
}
