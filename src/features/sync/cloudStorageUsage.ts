import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import type { StoredState } from '../chat/state/conversationPersistence'
import { getLunaAuth, getLunaFirestore } from '../../lib/firebase'
import { userDoc } from '../../lib/firebase/paths'
import type { LunaPlanId } from '../../lib/firebase/entitlements'
import {
  buildQuotaSnapshot,
  estimateStateCloudBytes,
  type CloudQuotaSnapshot,
} from '../../lib/lunarCloudQuota'
import { getCachedLunarPlan } from '../../lib/lunarPlanCache'
import { loadUserMemory } from '../../lib/userMemoryStorage'
import { readCloudSettingsSnapshot } from '../../lib/settingsCloudMap'
import { readUsageMode } from '../../lib/lunarAccount'
import { readLunaCloudConfig } from '../../lib/lunaCloud'

const SETTINGS_DOC = 'app'

export type CloudStorageBreakdown = {
  conversationsBytes: number
  settingsBytes: number
  memoryBytes: number
  totalBytes: number
  conversationCount: number
}

export type CloudStorageUsage = CloudStorageBreakdown & {
  quota: CloudQuotaSnapshot
}

function docBytes(data: unknown): number {
  try {
    return JSON.stringify(data).length
  } catch {
    return 0
  }
}

export function estimateLocalCloudUsage(
  state: Pick<StoredState, 'conversations' | 'folders'>,
  plan: LunaPlanId = getCachedLunarPlan(),
): CloudStorageUsage {
  const memoryRaw = JSON.stringify(loadUserMemory())
  const settingsBytes = docBytes({
    snapshot: readCloudSettingsSnapshot(),
    folders: state.folders,
  })
  const totalBytes = estimateStateCloudBytes(state, memoryRaw)
  const conversationsBytes = Math.max(
    0,
    totalBytes - memoryRaw.length - settingsBytes - 2048,
  )
  return {
    conversationsBytes,
    settingsBytes,
    memoryBytes: memoryRaw.length,
    totalBytes,
    conversationCount: state.conversations.filter((c) => c.cloudSync?.enabled).length,
    quota: buildQuotaSnapshot(plan, totalBytes),
  }
}

export async function fetchRemoteCloudUsage(
  plan: LunaPlanId = getCachedLunarPlan(),
): Promise<CloudStorageUsage | null> {
  const cfg = readLunaCloudConfig()
  if (!cfg.syncEnabled || !cfg.firebase || readUsageMode() === 'offline') {
    return null
  }

  const db = getLunaFirestore()
  const user = getLunaAuth()?.currentUser
  if (!db || !user || user.isAnonymous) return null

  const uid = user.uid
  let conversationsBytes = 0
  let conversationCount = 0

  const convCol = collection(db, `${userDoc(uid)}/conversations`)
  const convSnap = await getDocs(convCol)
  for (const d of convSnap.docs) {
    conversationsBytes += docBytes(d.data())
    conversationCount += 1
  }

  let settingsBytes = 0
  const settingsSnap = await getDoc(doc(db, `${userDoc(uid)}/settings`, SETTINGS_DOC))
  if (settingsSnap.exists()) {
    settingsBytes = docBytes(settingsSnap.data())
  }

  let memoryBytes = 0
  const memSnap = await getDoc(doc(db, `${userDoc(uid)}/memoryNotes`, 'bundle'))
  if (memSnap.exists()) {
    memoryBytes = docBytes(memSnap.data())
  }

  const totalBytes = conversationsBytes + settingsBytes + memoryBytes

  return {
    conversationsBytes,
    settingsBytes,
    memoryBytes,
    totalBytes,
    conversationCount,
    quota: buildQuotaSnapshot(plan, totalBytes),
  }
}
