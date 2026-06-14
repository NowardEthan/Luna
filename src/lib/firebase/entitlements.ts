export type LunaPlanId = 'free' | 'plus' | 'pro' | 'byok' | 'team'

export type LunaEntitlements = {
  hostedLlm: boolean
  sync: boolean
  marketplaceRemote: boolean
  /** Publicar add-ons na Luna Store com a Conta Lunar. */
  marketplacePublish: boolean
  webSearch: boolean
}

export const DEFAULT_LUNA_ENTITLEMENTS: LunaEntitlements = {
  hostedLlm: true,
  sync: true,
  marketplaceRemote: true,
  marketplacePublish: true,
  webSearch: true,
}

export function parsePlanId(raw: unknown): LunaPlanId {
  const p = raw
  if (p === 'plus' || p === 'pro' || p === 'byok' || p === 'team') return p
  return 'free'
}

export function parseEntitlements(raw: unknown): LunaEntitlements {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_LUNA_ENTITLEMENTS }
  const o = raw as Record<string, unknown>
  return {
    hostedLlm: o.hostedLlm !== false,
    sync: o.sync !== false,
    marketplaceRemote: o.marketplaceRemote !== false,
    marketplacePublish: o.marketplacePublish !== false,
    webSearch: o.webSearch !== false,
  }
}
