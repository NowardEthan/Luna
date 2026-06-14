/** Perfil rico de um add-on na marketplace (opcional no catálogo JSON). */

export type MarketplacePublisher = {
  name: string
  handle?: string
  avatarUrl?: string
  url?: string
}

export type MarketplaceScreenshot = {
  url: string
  caption?: string
}

export type MarketplaceFeature = {
  title: string
  description?: string
}

export type MarketplaceExample = {
  title: string
  description?: string
  /** Exemplo de prompt ou comando */
  code?: string
}

export type MarketplaceVersionEntry = {
  version: string
  date?: string
  notes?: string
}

export type MarketplaceDocLink = {
  label: string
  url: string
}

export type MarketplaceListingProfile = {
  /** Descrição longa (Markdown). */
  longDescription?: string
  publisher?: MarketplacePublisher
  /** Frases curtas em destaque. */
  highlights?: string[]
  features?: MarketplaceFeature[]
  examples?: MarketplaceExample[]
  screenshots?: MarketplaceScreenshot[]
  documentationUrl?: string
  docs?: MarketplaceDocLink[]
  changelog?: MarketplaceVersionEntry[]
  requirements?: string[]
  minLunaVersion?: string
  releasedAt?: string
  profileUpdatedAt?: string
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

function normalizeFeature(raw: unknown): MarketplaceFeature | null {
  if (!raw || typeof raw !== 'object') return null
  const x = raw as Record<string, unknown>
  const title = str(x.title)
  if (!title) return null
  return { title, description: str(x.description) }
}

function normalizeExample(raw: unknown): MarketplaceExample | null {
  if (!raw || typeof raw !== 'object') return null
  const x = raw as Record<string, unknown>
  const title = str(x.title)
  if (!title) return null
  return {
    title,
    description: str(x.description),
    code: str(x.code),
  }
}

function normalizeScreenshot(raw: unknown): MarketplaceScreenshot | null {
  if (!raw || typeof raw !== 'object') return null
  const x = raw as Record<string, unknown>
  const url = str(x.url)
  if (!url) return null
  return { url, caption: str(x.caption) }
}

function normalizeDocLink(raw: unknown): MarketplaceDocLink | null {
  if (!raw || typeof raw !== 'object') return null
  const x = raw as Record<string, unknown>
  const label = str(x.label)
  const url = str(x.url)
  if (!label || !url) return null
  return { label, url }
}

function normalizeVersionEntry(raw: unknown): MarketplaceVersionEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const x = raw as Record<string, unknown>
  const version = str(x.version)
  if (!version) return null
  return {
    version,
    date: str(x.date),
    notes: str(x.notes),
  }
}

export function normalizeMarketplaceProfile(
  raw: unknown,
): MarketplaceListingProfile | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>

  const publisherRaw = o.publisher
  let publisher: MarketplacePublisher | undefined
  if (publisherRaw && typeof publisherRaw === 'object') {
    const p = publisherRaw as Record<string, unknown>
    const name = str(p.name)
    if (name) {
      publisher = {
        name,
        handle: str(p.handle),
        avatarUrl: str(p.avatarUrl),
        url: str(p.url),
      }
    }
  }

  const features = Array.isArray(o.features)
    ? o.features
        .map(normalizeFeature)
        .filter((x): x is MarketplaceFeature => x !== null)
    : []

  const examples = Array.isArray(o.examples)
    ? o.examples
        .map(normalizeExample)
        .filter((x): x is MarketplaceExample => x !== null)
    : []

  const screenshots = Array.isArray(o.screenshots)
    ? o.screenshots
        .map(normalizeScreenshot)
        .filter((x): x is MarketplaceScreenshot => x !== null)
    : []

  const docs = Array.isArray(o.docs)
    ? o.docs
        .map(normalizeDocLink)
        .filter((x): x is MarketplaceDocLink => x !== null)
    : []

  const changelog = Array.isArray(o.changelog)
    ? o.changelog
        .map(normalizeVersionEntry)
        .filter((x): x is MarketplaceVersionEntry => x !== null)
    : []

  const profile: MarketplaceListingProfile = {
    longDescription: str(o.longDescription),
    publisher,
    highlights: strArray(o.highlights),
    features,
    examples,
    screenshots,
    documentationUrl: str(o.documentationUrl),
    docs,
    changelog,
    requirements: strArray(o.requirements),
    minLunaVersion: str(o.minLunaVersion),
    releasedAt: str(o.releasedAt),
    profileUpdatedAt: str(o.profileUpdatedAt),
  }

  const hasContent =
    profile.longDescription ||
    profile.publisher ||
    profile.highlights?.length ||
    profile.features?.length ||
    profile.examples?.length ||
    profile.screenshots?.length ||
    profile.documentationUrl ||
    profile.docs?.length ||
    profile.changelog?.length ||
    profile.requirements?.length ||
    profile.minLunaVersion ||
    profile.releasedAt

  return hasContent ? profile : undefined
}

export function profileSearchText(profile?: MarketplaceListingProfile): string {
  if (!profile) return ''
  return [
    profile.longDescription,
    profile.publisher?.name,
    profile.publisher?.handle,
    ...(profile.highlights ?? []),
    ...(profile.features?.map((f) => `${f.title} ${f.description ?? ''}`) ?? []),
    ...(profile.examples?.map((e) => `${e.title} ${e.description ?? ''}`) ?? []),
    ...(profile.requirements ?? []),
  ]
    .filter(Boolean)
    .join(' ')
}
