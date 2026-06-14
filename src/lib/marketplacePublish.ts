import type { MarketplaceCategoryId } from './marketplaceCatalog'
import type { MarketplaceListingProfile } from './marketplaceProfile'
import { getLunarAuthHeaders } from './lunarAuthHeaders'
import { lunaServerBaseUrl, isLunaServerBridgeAvailable } from './lunaServer/config'

export type MarketplacePublishListingDraft = {
  pluginId: string
  name: string
  version: string
  description: string
  author: string
  category: MarketplaceCategoryId
  tags: string
  permissions: string[]
  repositoryUrl: string
  homepageUrl: string
}

export type MarketplacePublishProfileDraft = {
  longDescription: string
  publisherName: string
  publisherHandle: string
  publisherUrl: string
  highlightsText: string
  features: Array<{ title: string; description: string }>
  examples: Array<{ title: string; description: string; code: string }>
  requirementsText: string
  minLunaVersion: string
  releasedAt: string
  documentationUrl: string
}

export type MarketplaceInspectResult = {
  manifest: Record<string, unknown>
  pluginId: string
  name: string
  version: string
  description: string
  permissions: string[]
  trusted: boolean
}

export type MarketplacePublishResult = {
  ok: boolean
  pluginId: string
  version: string
  installUrl: string
  bannerUrl?: string | null
  catalogUrl: string
  publishedByUid?: string
  listing: Record<string, unknown>
}

export type MarketplaceMyPublication = {
  id: string
  pluginId: string
  version: string
  name: string
  installUrl: string
  catalogUrl: string
  publishedAt?: string
  updatedAt?: string
}

const PERMISSION_OPTIONS = [
  'tools',
  'commands',
  'hooks',
  'storage',
  'settings',
  'ui',
] as const

export const MARKETPLACE_PUBLISH_PERMISSIONS = PERMISSION_OPTIONS

async function authHeadersMultipart(): Promise<HeadersInit> {
  const base = await getLunarAuthHeaders()
  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(base)) {
    if (k.toLowerCase() === 'content-type') continue
    headers[k] = v
  }
  return headers
}

function publishBaseUrl(): string {
  if (!isLunaServerBridgeAvailable()) {
    throw new Error('Servidor Luna indisponível. Inicie com npm run dev ou npm run server.')
  }
  return lunaServerBaseUrl().replace(/\/$/, '')
}

export async function inspectMarketplaceZip(file: File): Promise<MarketplaceInspectResult> {
  const fd = new FormData()
  fd.append('package', file, file.name)
  const res = await fetch(`${publishBaseUrl()}/v1/marketplace/inspect`, {
    method: 'POST',
    headers: await authHeadersMultipart(),
    body: fd,
  })
  const json: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail =
      json && typeof json === 'object' && 'detail' in json
        ? String((json as { detail: unknown }).detail)
        : `HTTP ${res.status}`
    throw new Error(detail)
  }
  return json as MarketplaceInspectResult
}

export function buildProfileFromDraft(
  draft: MarketplacePublishProfileDraft,
  screenshotCount: number,
): MarketplaceListingProfile | undefined {
  const highlights = draft.highlightsText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const requirements = draft.requirementsText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const features = draft.features
    .filter((f) => f.title.trim())
    .map((f) => ({
      title: f.title.trim(),
      description: f.description.trim() || undefined,
    }))
  const examples = draft.examples
    .filter((e) => e.title.trim())
    .map((e) => ({
      title: e.title.trim(),
      description: e.description.trim() || undefined,
      code: e.code.trim() || undefined,
    }))
  const screenshots = Array.from({ length: screenshotCount }, (_, i) => ({
    url: `__UPLOAD_SCREENSHOT_${i}__`,
    caption: '',
  }))

  const profile: MarketplaceListingProfile = {
    longDescription: draft.longDescription.trim() || undefined,
    publisher: draft.publisherName.trim()
      ? {
          name: draft.publisherName.trim(),
          handle: draft.publisherHandle.trim() || undefined,
          url: draft.publisherUrl.trim() || undefined,
        }
      : undefined,
    highlights: highlights.length ? highlights : undefined,
    features: features.length ? features : undefined,
    examples: examples.length ? examples : undefined,
    screenshots: screenshots.length ? screenshots : undefined,
    documentationUrl: draft.documentationUrl.trim() || undefined,
    requirements: requirements.length ? requirements : undefined,
    minLunaVersion: draft.minLunaVersion.trim() || undefined,
    releasedAt: draft.releasedAt.trim() || undefined,
    profileUpdatedAt: new Date().toISOString().slice(0, 10),
  }

  const has =
    profile.longDescription ||
    profile.publisher ||
    profile.highlights?.length ||
    profile.features?.length ||
    profile.examples?.length ||
    profile.screenshots?.length ||
    profile.documentationUrl ||
    profile.requirements?.length ||
    profile.minLunaVersion ||
    profile.releasedAt

  return has ? profile : undefined
}

export type PublishMarketplacePayload = {
  zipFile: File
  listing: MarketplacePublishListingDraft
  profile: MarketplacePublishProfileDraft
  bannerFile: File | null
  screenshotFiles: File[]
}

export async function publishMarketplaceAddon(
  payload: PublishMarketplacePayload,
): Promise<MarketplacePublishResult> {
  const { zipFile, listing, profile, bannerFile, screenshotFiles } = payload
  const listingBody = {
    pluginId: listing.pluginId,
    name: listing.name.trim(),
    version: listing.version.trim(),
    description: listing.description.trim(),
    author: listing.author.trim(),
    category: listing.category,
    tags: listing.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    permissions: listing.permissions,
    repositoryUrl: listing.repositoryUrl.trim() || undefined,
    homepageUrl: listing.homepageUrl.trim() || undefined,
  }

  const profileBody = buildProfileFromDraft(profile, screenshotFiles.length)

  const fd = new FormData()
  fd.append('package', zipFile, zipFile.name)
  fd.append('listing', JSON.stringify(listingBody))
  if (profileBody) fd.append('profile', JSON.stringify(profileBody))
  if (bannerFile) fd.append('banner', bannerFile, bannerFile.name)
  screenshotFiles.forEach((file, i) => {
    fd.append(`screenshot_${i}`, file, file.name)
  })

  const res = await fetch(`${publishBaseUrl()}/v1/marketplace/publish`, {
    method: 'POST',
    headers: await authHeadersMultipart(),
    body: fd,
  })
  const json: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail =
      json && typeof json === 'object' && 'detail' in json
        ? String((json as { detail: unknown }).detail)
        : `HTTP ${res.status}`
    throw new Error(detail)
  }
  return json as MarketplacePublishResult
}

export async function fetchMyMarketplacePublications(): Promise<
  MarketplaceMyPublication[]
> {
  const res = await fetch(`${publishBaseUrl()}/v1/marketplace/my-publications`, {
    headers: await getLunarAuthHeaders(),
  })
  const json: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail =
      json && typeof json === 'object' && 'detail' in json
        ? String((json as { detail: unknown }).detail)
        : `HTTP ${res.status}`
    throw new Error(detail)
  }
  const items =
    json && typeof json === 'object' && Array.isArray((json as { items?: unknown }).items)
      ? (json as { items: MarketplaceMyPublication[] }).items
      : []
  return items
}

export function defaultListingDraft(): MarketplacePublishListingDraft {
  return {
    pluginId: '',
    name: '',
    version: '1.0.0',
    description: '',
    author: '',
    category: 'utility',
    tags: '',
    permissions: ['tools'],
    repositoryUrl: '',
    homepageUrl: '',
  }
}

export function defaultProfileDraft(): MarketplacePublishProfileDraft {
  return {
    longDescription: '',
    publisherName: '',
    publisherHandle: '',
    publisherUrl: '',
    highlightsText: '',
    features: [{ title: '', description: '' }],
    examples: [{ title: '', description: '', code: '' }],
    requirementsText: '',
    minLunaVersion: '1.0',
    releasedAt: new Date().toISOString().slice(0, 10),
    documentationUrl: '',
  }
}

export function applyInspectToListing(
  listing: MarketplacePublishListingDraft,
  inspected: MarketplaceInspectResult,
): MarketplacePublishListingDraft {
  const perms = inspected.permissions.filter((p) =>
    MARKETPLACE_PUBLISH_PERMISSIONS.includes(p as (typeof MARKETPLACE_PUBLISH_PERMISSIONS)[number]),
  )
  return {
    ...listing,
    pluginId: inspected.pluginId,
    name: inspected.name,
    version: inspected.version,
    description: inspected.description || listing.description,
    permissions: perms.length ? perms : listing.permissions,
  }
}
