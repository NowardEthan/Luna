import type {
  MarketplaceCatalog,
  MarketplaceListing,
} from './marketplaceCatalog'

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

function parseCatalog(json: unknown): MarketplaceCatalog | null {
  if (!json || typeof json !== 'object') return null
  const o = json as Record<string, unknown>
  if (!Array.isArray(o.items)) return null
  const items = o.items.filter(isListing)
  if (items.length === 0 && o.items.length > 0) return null
  return {
    version: typeof o.version === 'number' ? o.version : 1,
    updatedAt:
      typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toISOString(),
    items,
  }
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
    const res = await fetch(trimmed, {
      ...fetchInit,
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
