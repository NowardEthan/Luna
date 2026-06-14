import type { LunaPlanId } from '../../lib/firebase/entitlements'
import { isLunaServerBridgeAvailable } from '../../lib/lunaServer/config'

const CHECKOUT_PLAN_IDS = new Set<LunaPlanId>(['plus', 'pro', 'byok'])

/** Checkout disponível: link estático no .env ou API Asaas via servidor Luna. */
export function isPlanCheckoutAvailable(planId: LunaPlanId): boolean {
  if (!CHECKOUT_PLAN_IDS.has(planId)) return false
  const links = getAsaasCheckoutLinks(planId)
  if (links.monthly || links.annual) return true
  return isLunaServerBridgeAvailable()
}

/** Links de checkout Asaas — preenche no Orbit/.env (VITE_ASAAS_LINK_*). */
export function getAsaasCheckoutLinks(planId: LunaPlanId): {
  monthly: string
  annual: string
} {
  const env = import.meta.env

  const map: Record<LunaPlanId, { monthly: string; annual: string }> = {
    free: { monthly: '', annual: '' },
    plus: {
      monthly: env.VITE_ASAAS_LINK_PLUS_MONTHLY ?? '',
      annual: env.VITE_ASAAS_LINK_PLUS_ANNUAL ?? '',
    },
    pro: {
      monthly: env.VITE_ASAAS_LINK_PRO_MONTHLY ?? '',
      annual: env.VITE_ASAAS_LINK_PRO_ANNUAL ?? '',
    },
    byok: {
      monthly: env.VITE_ASAAS_LINK_BYOK_MONTHLY ?? '',
      annual: env.VITE_ASAAS_LINK_BYOK_ANNUAL ?? '',
    },
    team: { monthly: '', annual: '' },
  }

  return map[planId] ?? { monthly: '', annual: '' }
}
