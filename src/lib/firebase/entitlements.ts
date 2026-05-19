export type LunaPlanId = 'free' | 'pro' | 'team'

export type LunaEntitlements = {
  hostedLlm: boolean
  sync: boolean
  marketplaceRemote: boolean
  webSearch: boolean
}

export const DEFAULT_LUNA_ENTITLEMENTS: LunaEntitlements = {
  hostedLlm: true,
  sync: true,
  marketplaceRemote: true,
  webSearch: true,
}

export function parseEntitlements(raw: unknown): LunaEntitlements {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_LUNA_ENTITLEMENTS }
  const o = raw as Record<string, unknown>
  return {
    hostedLlm: o.hostedLlm !== false,
    sync: o.sync !== false,
    marketplaceRemote: o.marketplaceRemote !== false,
    webSearch: o.webSearch !== false,
  }
}
