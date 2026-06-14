import type { LunaPlanId } from './firebase/entitlements'

let cachedPlan: LunaPlanId = 'free'

export function setCachedLunarPlan(plan: LunaPlanId): void {
  cachedPlan = plan
}

export function getCachedLunarPlan(): LunaPlanId {
  return cachedPlan
}

export function resetCachedLunarPlan(): void {
  cachedPlan = 'free'
}
