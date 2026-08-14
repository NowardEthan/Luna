import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { useLunaAuthOptional } from '../auth/AuthProvider'
import { getLunaFirestore } from '../../lib/firebase'
import { userDoc, userUsageDoc } from '../../lib/firebase/paths'
import {
  getDaysUntilQuotaReset,
  getWindowTokenLimit,
  getWeeklyTokenLimit,
  computeWindowResetsAt,
  computeWeeklyResetsAt,
} from './lunarPlanQuotas'

// Docs que o Lab/Core grava no Firestore (names iguais aos do quotaService.ts)
export const FREE_USAGE_DOC_ID = '_free_window'
export const WEEKLY_USAGE_DOC_ID = '_weekly'

export interface LunaUsageSnapshot {
  // Tokens (modelo do Lab)
  windowTokens: number
  windowLimit: number | null
  windowResetsAtMs: number | null
  weeklyTokens: number
  weeklyLimit: number | null
  weeklyResetsAtMs: number | null
  bonusTurns: number
  /** true quando o usuário tem flag isOwner no Firestore — uso ilimitado. */
  isOwner: boolean
  // Métricas exibidas
  pct: number // 0–100 (limit mais restritivo)
  resetDays: number
  loading: boolean
}

/**
 * Lê o uso de tokens do Lab/Core via Firestore onSnapshot.
 * Fontes:
 *  - users/{uid}/usage/_free_window → tokens rolling 5h
 *  - users/{uid}/usage/_weekly → tokens semanais
 *  - users/{uid}/usage/{YYYY-MM} → bonusTurns
 *  - users/{uid}.isOwner → se true, ignora limites (criador / owner)
 */
export function useLunaUsage(): LunaUsageSnapshot {
  const auth = useLunaAuthOptional()
  const [windowTokens, setWindowTokens] = useState(0)
  const [windowStartMs, setWindowStartMs] = useState<number | null>(null)
  const [weeklyTokens, setWeeklyTokens] = useState(0)
  const [weekStartMs, setWeekStartMs] = useState<number | null>(null)
  const [bonusTurns, setBonusTurns] = useState(0)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)

  const planId = auth?.plan ?? 'free'
  // Owner sempre ilimitado, independente do plano no Firestore.
  const rawWindowLimit = getWindowTokenLimit(planId)
  const rawWeeklyLimit = getWeeklyTokenLimit(planId)
  const windowLimit = isOwner ? null : rawWindowLimit
  const weeklyLimit = isOwner ? null : rawWeeklyLimit
  const resetDays = getDaysUntilQuotaReset()

  // Calcula qual limite é mais restritivo (menor pct restante)
  const windowPct = windowLimit ? windowTokens / windowLimit : 0
  const weeklyPct = weeklyLimit ? weeklyTokens / weeklyLimit : 0
  const pct = Math.max(windowPct, weeklyPct) * 100

  const windowResetsAtMs = windowStartMs
    ? computeWindowResetsAt(windowStartMs)
    : null
  const weeklyResetsAtMs = weekStartMs
    ? computeWeeklyResetsAt(weekStartMs)
    : null

  useEffect(() => {
    const uid = auth?.user?.uid
    if (!uid) {
      setWindowTokens(0)
      setWeeklyTokens(0)
      setBonusTurns(0)
      setIsOwner(false)
      setWindowStartMs(null)
      setWeekStartMs(null)
      setLoading(false)
      return
    }

    const db = getLunaFirestore()
    if (!db) {
      setLoading(false)
      return
    }

    setLoading(true)

    const windowRef = doc(db, userUsageDoc(uid, FREE_USAGE_DOC_ID))
    const weeklyRef = doc(db, userUsageDoc(uid, WEEKLY_USAGE_DOC_ID))
    const monthRef = doc(db, userUsageDoc(uid, new Date().toISOString().slice(0, 7)))
    const userRef = doc(db, userDoc(uid))

    const unsubs = [
      onSnapshot(
        windowRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data()
            setWindowTokens(typeof data.tokens === 'number' ? data.tokens : 0)
            setWindowStartMs(
              typeof data.windowStart?.toMillis === 'function'
                ? data.windowStart.toMillis()
                : typeof data.windowStart === 'number'
                  ? data.windowStart
                  : null,
            )
          } else {
            setWindowTokens(0)
            setWindowStartMs(null)
          }
        },
        () => {
          // Silent: sem permissão ou offline
        },
      ),
      onSnapshot(
        weeklyRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data()
            setWeeklyTokens(typeof data.tokens === 'number' ? data.tokens : 0)
            setWeekStartMs(
              typeof data.weekStart?.toMillis === 'function'
                ? data.weekStart.toMillis()
                : typeof data.weekStart === 'number'
                  ? data.weekStart
                  : null,
            )
          } else {
            setWeeklyTokens(0)
            setWeekStartMs(null)
          }
        },
        () => {
          // Silent
        },
      ),
      onSnapshot(
        monthRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data()
            setBonusTurns(
              typeof data.bonusTurns === 'number' ? data.bonusTurns : 0,
            )
          } else {
            setBonusTurns(0)
          }
        },
        () => {
          // Silent
        },
      ),
      onSnapshot(
        userRef,
        (snap) => {
          const exists = snap.exists()
          const data = exists ? snap.data() : null
          const owner = data?.isOwner === true
          // eslint-disable-next-line no-console
          console.log('[useLunaUsage] user doc snapshot', {
            exists,
            isOwner: owner,
            keys: data ? Object.keys(data) : null,
            data,
          })
          setIsOwner(owner)
        },
        (err) => {
          // eslint-disable-next-line no-console
          console.warn('[useLunaUsage] user doc error', err.message)
          setIsOwner(false)
        },
      ),
    ]

    // Marca como loaded após um tick pra evitar flash de "0"
    const t = setTimeout(() => setLoading(false), 300)

    return () => {
      unsubs.forEach((u) => u())
      clearTimeout(t)
    }
  }, [auth?.user?.uid])

  return {
    windowTokens,
    windowLimit,
    windowResetsAtMs,
    weeklyTokens,
    weeklyLimit,
    weeklyResetsAtMs,
    bonusTurns,
    isOwner,
    pct,
    resetDays,
    loading,
  }
}

// Debug: expõe no window para inspeção via console.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof window !== 'undefined') (window as any).__lunaDebugUsage = () => {
  // eslint-disable-next-line no-console
  console.log('[debug] isOwner detection: ver logs acima "user doc snapshot"')
}
