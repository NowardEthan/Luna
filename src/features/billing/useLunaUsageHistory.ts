import { useEffect, useState } from 'react'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { useLunaAuthOptional } from '../auth/AuthProvider'
import { getLunaFirestore } from '../../lib/firebase'
import { userUsageDoc } from '../../lib/firebase/paths'
import { monthKeyLabel, monthKeyOffset } from './lunarPlanQuotas'

export interface LunaUsageHistoryItem {
  monthKey: string
  monthLabel: string
  windowTokens: number
  weeklyTokens: number
  bonusTurns: number
}

/** Lê histórico mensal de uso (até `months` meses para trás, exclui mês atual). */
export function useLunaUsageHistory(months = 3): {
  items: LunaUsageHistoryItem[]
  loading: boolean
} {
  const auth = useLunaAuthOptional()
  const [items, setItems] = useState<LunaUsageHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const uid = auth?.user?.uid
    if (!uid) {
      setItems([])
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

    // Gera chaves dos meses anteriores (exclui offset 0 = mês atual)
    const keys = Array.from({ length: months }, (_, i) => monthKeyOffset(i + 1))

    void (async () => {
      try {
        const snaps = await Promise.all(
          keys.map((key) =>
            getDocs(
              query(
                collection(db, userUsageDoc(uid)),
                where('__name__', '==', key),
                limit(1),
              ),
            ),
          ),
        )
        if (cancelled) return
        const next: LunaUsageHistoryItem[] = keys.map((key, idx) => {
          const snap = snaps[idx]
          const doc = snap.docs[0]
          const d = doc?.exists() ? doc.data() : null
          return {
            monthKey: key,
            monthLabel: monthKeyLabel(key),
            windowTokens: typeof d?.windowTokens === 'number' ? d.windowTokens : 0,
            weeklyTokens: typeof d?.weeklyTokens === 'number' ? d.weeklyTokens : 0,
            bonusTurns: typeof d?.bonusTurns === 'number' ? d.bonusTurns : 0,
          }
        })
        setItems(next)
      } catch {
        if (!cancelled) setItems([])
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
