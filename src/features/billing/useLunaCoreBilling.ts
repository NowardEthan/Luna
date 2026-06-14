import { useMemo } from 'react'
import { useLunaAuthOptional } from '../auth/AuthProvider'
import type { LunaPlanId } from '../../lib/firebase/entitlements'
import type { LunaCoreByokMeta } from '../../types/lunaCorePipeline'
import { getPlanTurnQuota } from './lunarPlanQuotas'
import { getUsageAlertLevel, usageAlertMessage } from './lunaCloudTurnPolicy'
import { useLunaUsage } from './useLunaUsage'
import { useByokConfig } from './useByokConfig'

export type LunaCoreBillingSnapshot = {
  planId: LunaPlanId
  uid?: string
  usedTurns: number
  turnQuota: number | null
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
  const baseQuota = getPlanTurnQuota(planId)
  const turnQuota =
    baseQuota !== null ? baseQuota + usage.bonusTurns : null
  const usageAlertLevel = getUsageAlertLevel(usage.pct)
  const uid = auth?.user?.uid

  return useMemo(
    () => ({
      planId,
      uid,
      usedTurns: usage.used,
      turnQuota,
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
      usage.used,
      turnQuota,
      usage.pct,
      usage.resetDays,
      usage.bonusTurns,
      usageAlertLevel,
      byok.config.activeProviderId,
      byok.config.providers,
    ],
  )
}
