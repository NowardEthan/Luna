import { useCallback, useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useLunaAuthOptional } from '../auth/AuthProvider'
import { getLunaFirestore } from '../../lib/firebase'
import { userDoc } from '../../lib/firebase/paths'

export type SyncPreferenceKey =
  | 'conversations'
  | 'memory'
  | 'folders'
  | 'modelPrefs'
  | 'plugins'

export type SyncPreferences = Record<SyncPreferenceKey, boolean>

export const DEFAULT_SYNC_PREFERENCES: SyncPreferences = {
  conversations: true,
  memory: true,
  folders: true,
  modelPrefs: false,
  plugins: false,
}

const SYNC_DOC = 'sync'

function userSyncDoc(uid: string): string {
  return `${userDoc(uid)}/settings/${SYNC_DOC}`
}

function parsePrefs(raw: unknown): SyncPreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SYNC_PREFERENCES }
  const o = raw as Record<string, unknown>
  return {
    conversations:
      typeof o.conversations === 'boolean'
        ? o.conversations
        : DEFAULT_SYNC_PREFERENCES.conversations,
    memory:
      typeof o.memory === 'boolean' ? o.memory : DEFAULT_SYNC_PREFERENCES.memory,
    folders:
      typeof o.folders === 'boolean' ? o.folders : DEFAULT_SYNC_PREFERENCES.folders,
    modelPrefs:
      typeof o.modelPrefs === 'boolean'
        ? o.modelPrefs
        : DEFAULT_SYNC_PREFERENCES.modelPrefs,
    plugins:
      typeof o.plugins === 'boolean' ? o.plugins : DEFAULT_SYNC_PREFERENCES.plugins,
  }
}

export function useSyncPreferences(): {
  prefs: SyncPreferences
  loading: boolean
  setPref: (key: SyncPreferenceKey, value: boolean) => Promise<void>
} {
  const auth = useLunaAuthOptional()
  const [prefs, setPrefs] = useState<SyncPreferences>(DEFAULT_SYNC_PREFERENCES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const uid = auth?.user?.uid
    if (!uid) {
      setPrefs(DEFAULT_SYNC_PREFERENCES)
      setLoading(false)
      return
    }

    const db = getLunaFirestore()
    if (!db) {
      setLoading(false)
      return
    }

    setLoading(true)
    const ref = doc(db, userSyncDoc(uid))
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setPrefs(parsePrefs(snap.exists() ? snap.data() : null))
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsub
  }, [auth?.user?.uid])

  const setPref = useCallback(
    async (key: SyncPreferenceKey, value: boolean) => {
      const uid = auth?.user?.uid
      const db = getLunaFirestore()
      if (!uid || !db) return
      if (key === 'modelPrefs' || key === 'plugins') return

      const next = { ...prefs, [key]: value }
      setPrefs(next)
      await setDoc(doc(db, userSyncDoc(uid)), next, { merge: true })
    },
    [auth?.user?.uid, prefs],
  )

  return { prefs, loading, setPref }
}
