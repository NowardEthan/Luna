import { useMemo } from 'react'
import { useLunaAuthOptional } from '../auth/AuthProvider'
import type { LunaPlanId } from '../../lib/firebase/entitlements'
import type { LunaCoreByokMeta } from '../../types/lunaCorePipeline'
import {
  getPlanTurnQuota,
  getWindowTokenLimit,
  getWeeklyTokenLimit,
} from './lunarPlanQuotas'
import { getUsageAlertLevel, usageAlertMessage } from './lunaCloudTurnPolicy'
import { useLunaUsage } from './useLunaUsage'
import { useByokConfig } from './useByokConfig'

export type LunaCoreBillingSnapshot = {
  planId: LunaPlanId
  uid?: string
  windowTokens: number
  windowLimit: number | null
  weeklyTokens: number
  weeklyLimit: number | null
  usagePct: number
  resetDays: number
  usageAlertLevel: ReturnType<typeof getUsageAlertLevel>
  usageAlertMessage: string | null
  /** Actualizado após IPC — Core local não consome cota. */
  isCoreLocal: boolean
  byokUid?: string
  byokMeta?: LunaCoreByokMeta
}

/** Snapshot de billing para turnos Luna Core (P3). */
export function useLunaCoreBilling(): LunaCoreBillingSnapshot {
  const auth = useLunaAuthOptional()
  const usage = useLunaUsage()
  const byok = useByokConfig()

  const planId = auth?.plan ?? 'free'
  // Owner: limites ignorados (mesmo padrão do Lab quando API devolve null).
  const windowLimit = usage.isOwner ? null : getWindowTokenLimit(planId)
  const weeklyLimit = usage.isOwner ? null : getWeeklyTokenLimit(planId)
  const usageAlertLevel = getUsageAlertLevel(usage.pct)
  const uid = auth?.user?.uid

  return useMemo(
    () => ({
      planId,
      uid,
      windowTokens: usage.windowTokens,
      windowLimit,
      weeklyTokens: usage.weeklyTokens,
      weeklyLimit,
      usagePct: usage.pct,
      resetDays: usage.resetDays,
      usageAlertLevel,
      usageAlertMessage: usageAlertMessage(usageAlertLevel, usage.resetDays, {
        hasBonus: usage.bonusTurns > 0,
      }),
      isCoreLocal: false,
      byokUid: planId === 'byok' ? uid : undefined,
      byokMeta:
        planId === 'byok'
          ? {
              activeProviderId: byok.config.activeProviderId,
              providers: byok.config.providers ?? {},
            }
          : undefined,
    }),
    [
      planId,
      uid,
      usage.windowTokens,
      usage.weeklyTokens,
      usage.pct,
      usage.resetDays,
      usage.bonusTurns,
      windowLimit,
      weeklyLimit,
      usageAlertLevel,
      byok.config.activeProviderId,
      byok.config.providers,
    ],
  )
}
