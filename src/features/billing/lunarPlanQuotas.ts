import type { LunaPlanId } from '../../lib/firebase/entitlements'
import { PLANS } from './plans'

// ─────────────────────────────────────────────────────────────────────────────
//  Tokens (modelo do Lab/Core)
//  Janela rolling 5h + janela semanal. Alinhado com o quotaService.ts do Lab.
// ─────────────────────────────────────────────────────────────────────────────

/** Limite de tokens na janela rolling 5h por plano. null = ilimitado (BYOK). */
export const WINDOW_TOKEN_LIMITS: Record<LunaPlanId, number | null> = {
  free: 35_000,
  plus: 180_000,
  pro: 450_000,
  byok: null,
  team: null,
}

/** Limite de tokens por semana por plano. null = ilimitado (BYOK). */
export const WEEKLY_TOKEN_LIMITS: Record<LunaPlanId, number | null> = {
  free: 150_000,
  plus: 750_000,
  pro: 2_250_000,
  byok: null,
  team: null,
}

/** Tamanho da janela rolling em ms (5h). */
export const WINDOW_MS = 5 * 60 * 60 * 1000

/** Tamanho da semana em ms (7 dias). */
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** Retorna false para planos que não usam janela rolling (BYOK/owner = ilimitado). */
export function usesRollingWindow(planId: LunaPlanId): boolean {
  return planId === 'free' || planId === 'plus' || planId === 'pro'
}

export function getWindowTokenLimit(planId: LunaPlanId): number | null {
  return WINDOW_TOKEN_LIMITS[planId] ?? null
}

export function getWeeklyTokenLimit(planId: LunaPlanId): number | null {
  return WEEKLY_TOKEN_LIMITS[planId] ?? null
}

/** Calcula o timestamp de reset da janela rolling de 5h. */
export function computeWindowResetsAt(windowStartMs: number): number {
  const now = Date.now()
  const elapsed = now - windowStartMs
  if (elapsed >= WINDOW_MS) return now
  return windowStartMs + WINDOW_MS
}

/** Calcula o timestamp de reset da janela semanal. */
export function computeWeeklyResetsAt(weekStartMs: number): number {
  const now = Date.now()
  const elapsed = now - weekStartMs
  if (elapsed >= WEEK_MS) return now
  return weekStartMs + WEEK_MS
}

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
