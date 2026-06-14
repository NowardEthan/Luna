import { doc, increment, serverTimestamp, setDoc } from 'firebase/firestore'
import { getLunaFirestore } from '../../lib/firebase'
import { userUsageDoc } from '../../lib/firebase/paths'
import { currentMonthKey } from './lunarPlanQuotas'
import type { LunaUsageBreakdownKey } from './lunaCloudTurnPolicy'

/** Incrementa contador mensal após turno cloud bem-sucedido (P3). */
export async function recordCloudTurn(
  uid: string,
  breakdownKey: LunaUsageBreakdownKey,
): Promise<void> {
  const db = getLunaFirestore()
  if (!db) return

  const ref = doc(db, userUsageDoc(uid, currentMonthKey()))
  await setDoc(
    ref,
    {
      turns: increment(1),
      [`breakdown.${breakdownKey}`]: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
