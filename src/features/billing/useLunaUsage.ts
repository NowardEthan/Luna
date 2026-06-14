import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { useLunaAuthOptional } from '../auth/AuthProvider'
import { getLunaFirestore } from '../../lib/firebase'
import { userUsageDoc } from '../../lib/firebase/paths'
import {
  getPlanTurnQuota,
  getDaysUntilQuotaReset,
  currentMonthKey,
} from './lunarPlanQuotas'

export interface LunaUsageBreakdown {
  baixo: number
  moderado: number
  alto: number
  profundo: number
}

export interface LunaUsageSnapshot {
  used: number
  limit: number | null  // null = ilimitado (BYOK)
  bonusTurns: number
  effectiveLimit: number | null
  pct: number           // 0–100
  resetDays: number
  monthKey: string
  loading: boolean
  breakdown: LunaUsageBreakdown
}

const EMPTY_BREAKDOWN: LunaUsageBreakdown = {
  baixo: 0,
  moderado: 0,
  alto: 0,
  profundo: 0,
}

/** Lê o uso de turns do mês atual via Firestore onSnapshot. */
export function useLunaUsage(): LunaUsageSnapshot {
  const auth = useLunaAuthOptional()
  const [used, setUsed] = useState(0)
  const [bonusTurns, setBonusTurns] = useState(0)
  const [breakdown, setBreakdown] = useState<LunaUsageBreakdown>(EMPTY_BREAKDOWN)
  const [loading, setLoading] = useState(true)

  const planId = auth?.plan ?? 'free'
  const limit = getPlanTurnQuota(planId)
  const effectiveLimit =
    limit !== null ? limit + bonusTurns : null
  const monthKey = currentMonthKey()
  const pct = effectiveLimit
    ? Math.min(100, Math.floor((used / effectiveLimit) * 100))
    : 0
  const resetDays = getDaysUntilQuotaReset()

  useEffect(() => {
    const uid = auth?.user?.uid
    if (!uid) {
      setUsed(0)
      setBonusTurns(0)
      setBreakdown(EMPTY_BREAKDOWN)
      setLoading(false)
      return
    }

    const db = getLunaFirestore()
    if (!db) {
      setLoading(false)
      return
    }

    setLoading(true)
    const ref = doc(db, userUsageDoc(uid, monthKey))
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setUsed(typeof data.turns === 'number' ? data.turns : 0)
          setBonusTurns(
            typeof data.bonusTurns === 'number' ? data.bonusTurns : 0,
          )
          setBreakdown({ ...EMPTY_BREAKDOWN, ...(data.breakdown ?? {}) })
        } else {
          setUsed(0)
          setBonusTurns(0)
          setBreakdown(EMPTY_BREAKDOWN)
        }
        setLoading(false)
      },
      () => {
        // Sem permissão ou offline — silencioso
        setLoading(false)
      },
    )

    return unsub
  }, [auth?.user?.uid, monthKey])

  return {
    used,
    limit,
    bonusTurns,
    effectiveLimit,
    pct,
    resetDays,
    monthKey,
    loading,
    breakdown,
  }
}
