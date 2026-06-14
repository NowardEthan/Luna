import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { useLunaAuthOptional } from '../auth/AuthProvider'
import { getLunaFirestore } from '../../lib/firebase'
import { userUsageDoc } from '../../lib/firebase/paths'
import { monthKeyLabel, monthKeyOffset } from './lunarPlanQuotas'

export type LunaUsageHistoryItem = {
  monthKey: string
  monthLabel: string
  used: number
  bonusTurns: number
}

const EMPTY: LunaUsageHistoryItem[] = []

/** Lê uso dos últimos N meses (exclui o mês atual). */
export function useLunaUsageHistory(months = 3): {
  items: LunaUsageHistoryItem[]
  loading: boolean
} {
  const auth = useLunaAuthOptional()
  const [items, setItems] = useState<LunaUsageHistoryItem[]>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const uid = auth?.user?.uid
    if (!uid) {
      setItems(EMPTY)
      setLoading(false)
      return
    }

    const db = getLunaFirestore()
    if (!db) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const keys = Array.from({ length: months }, (_, i) => monthKeyOffset(i + 1))

    void (async () => {
      try {
        const snaps = await Promise.all(
          keys.map((key) => getDoc(doc(db, userUsageDoc(uid, key)))),
        )
        if (cancelled) return
        const next = keys.map((key, idx) => {
          const snap = snaps[idx]
          const data = snap.exists() ? snap.data() : null
          return {
            monthKey: key,
            monthLabel: monthKeyLabel(key),
            used: typeof data?.turns === 'number' ? data.turns : 0,
            bonusTurns:
              typeof data?.bonusTurns === 'number' ? data.bonusTurns : 0,
          }
        })
        setItems(next)
      } catch {
        if (!cancelled) setItems(EMPTY)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [auth?.user?.uid, months])

  return { items, loading }
}
