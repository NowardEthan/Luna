import type { LunaPlanId } from '../../lib/firebase/entitlements'

/** Chave de complexidade por breakdown (escrito pelo recordCloudTurn). */
export type LunaUsageBreakdownKey = 'baixo' | 'moderado' | 'alto' | 'profundo'

/** Turno conta na cota cloud (não local ilimitado, não BYOK). */
export function shouldCountCloudTurn(params: {
  planId: LunaPlanId
  isCoreLocal: boolean
  forceLocal?: boolean
  quotaFallbackLocal?: boolean
}): boolean {
  if (params.forceLocal || params.quotaFallbackLocal || params.isCoreLocal) {
    return false
  }
  if (params.planId === 'byok') return false
  return true
}

export function isQuotaExceeded(
  usedTurns: number,
  turnQuota: number | null,
): boolean {
  if (turnQuota === null) return false
  return usedTurns >= turnQuota
}

export function getUsageAlertLevel(
  pct: number,
): 'none' | 'warn70' | 'warn90' | 'atLimit' {
  if (pct >= 100) return 'atLimit'
  if (pct >= 90) return 'warn90'
  if (pct >= 70) return 'warn70'
  return 'none'
}

export function usageAlertMessage(
  level: ReturnType<typeof getUsageAlertLevel>,
  resetDays: number,
  opts?: { hasBonus?: boolean },
): string | null {
  switch (level) {
    case 'warn70':
      return `Uso avançado acima de 70% — renova em ${resetDays} dias.`
    case 'warn90':
      return opts?.hasBonus
        ? `Cota quase esgotada (90%+). Compre outro pack na aba Uso.`
        : `Cota quase esgotada (90%+). Adicione um pack de créditos na aba Uso.`
    case 'atLimit':
      return 'Cota cloud esgotada — a Luna continua via modelo local.'
    default:
      return null
  }
}
