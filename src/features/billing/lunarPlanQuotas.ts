import type { LunaPlanId } from '../../lib/firebase/entitlements'
import { PLANS } from './plans'

/** Turn quota mensal por plano. null = ilimitado (BYOK). */
export function getPlanTurnQuota(planId: LunaPlanId): number | null {
  const plan = PLANS.find((p) => p.id === planId)
  return plan?.cloudTurns ?? null
}

/** Quantos dias faltam para o 1º do próximo mês (reset de quota). */
export function getDaysUntilQuotaReset(): number {
  const now = new Date()
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return Math.max(1, Math.ceil((nextReset.getTime() - now.getTime()) / 86_400_000))
}

/** Chave YYYY-MM para o mês atual. */
export function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Chave YYYY-MM para um mês atrás de um offset (0 = atual, 1 = anterior, …). */
export function monthKeyOffset(offset: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Label legível para uma chave YYYY-MM (ex.: "Mai 2026"). */
export function monthKeyLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  const d = new Date(year, month - 1, 1)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    .replace('.', '')
    .replace(/^\w/, (c) => c.toUpperCase())
}
