import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { eventBus } from '../../core/events/EventBus'
import type { StoredState } from '../chat/state/conversationPersistence'
import {
  hydrateFromLocalStorage,
  persistToLocalStorage,
  sortByUpdated,
} from '../chat/state/conversationPersistence'
import type { Conversation } from '../../types/chat'
import { getLunaAuth, getLunaFirestore } from '../../lib/firebase'
import { userDoc } from '../../lib/firebase/paths'
import {
  applyCloudSettingsSnapshot,
  readCloudSettingsSnapshot,
} from '../../lib/settingsCloudMap'
import { readLunaCloudConfig } from '../../lib/lunaCloud'
import { loadUserMemory, saveUserMemory } from '../../lib/userMemoryStorage'

const SETTINGS_DOC = 'app'
const MIGRATION_KEY = 'luna-cloud-migrated'

type CloudConversationPayload = Conversation

type CloudSettingsDoc = {
  snapshot: Record<string, string>
  folders?: StoredState['folders']
  activeId?: string | null
  updatedAt: ReturnType<typeof serverTimestamp>
}

class CloudSyncServiceImpl {
  private pushTimer: ReturnType<typeof setTimeout> | null = null
  private lastSyncAt: number | null = null
  private lastError: string | null = null
  private pushing = false

  getStatus() {
    return {
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
      pushing: this.pushing,
    }
  }

  reset(): void {
    if (this.pushTimer) clearTimeout(this.pushTimer)
    this.pushTimer = null
  }

  schedulePush(state: StoredState, delayMs = 2000): void {
    const cfg = readLunaCloudConfig()
    if (!cfg.syncEnabled || !cfg.firebase) return
    const user = getLunaAuth()?.currentUser
    if (!user || user.isAnonymous) return

    if (this.pushTimer) clearTimeout(this.pushTimer)
    this.pushTimer = setTimeout(() => {
      void this.pushToCloud(state)
    }, delayMs)
  }

  async pullFromCloud(): Promise<void> {
    const cfg = readLunaCloudConfig()
    if (!cfg.syncEnabled || !cfg.firebase) return

    const auth = getLunaAuth()
    const user = auth?.currentUser
    if (!user || user.isAnonymous) return

    const db = getLunaFirestore()
    if (!db) return

    eventBus.emit('lunar:sync:start', {})

    try {
      const uid = user.uid
      const local = hydrateFromLocalStorage()
      const migrated = localStorage.getItem(MIGRATION_KEY) === uid

      const convCol = collection(db, `${userDoc(uid)}/conversations`)
      const convSnap = await getDocs(convCol)
      const remoteConvs: Conversation[] = []

      for (const d of convSnap.docs) {
        const data = d.data() as CloudConversationPayload
        if (data?.id && Array.isArray(data.messages)) {
          remoteConvs.push(data)
        }
      }

      const settingsRef = doc(db, `${userDoc(uid)}/settings`, SETTINGS_DOC)
      const settingsSnap = await getDoc(settingsRef)
      const settings = settingsSnap.data() as CloudSettingsDoc | undefined

      if (!migrated && local && remoteConvs.length === 0) {
        await this.pushToCloud(local)
        localStorage.setItem(MIGRATION_KEY, uid)
        this.lastSyncAt = Date.now()
        eventBus.emit('lunar:sync:complete', { ok: true })
        return
      }

      if (remoteConvs.length > 0) {
        const merged = this.mergeConversations(
          local?.conversations ?? [],
          remoteConvs,
        )
        const folders =
          settings?.folders?.length ? settings.folders : local?.folders ?? []
        const activeId =
          settings?.activeId ??
          local?.activeId ??
          merged[0]?.id ??
          null

        persistToLocalStorage({
          conversations: sortByUpdated(merged),
          folders,
          activeId: activeId ?? merged[0]?.id ?? '',
        })

        if (settings?.snapshot) {
          applyCloudSettingsSnapshot(settings.snapshot)
        }
      }

      const memRef = doc(db, `${userDoc(uid)}/memoryNotes`, 'bundle')
      const memSnap = await getDoc(memRef)
      if (memSnap.exists()) {
        const bundle = memSnap.data() as { raw?: string }
        if (typeof bundle.raw === 'string') {
          try {
            saveUserMemory(JSON.parse(bundle.raw))
          } catch {
            /* ignore */
          }
        }
      } else if (local && !migrated) {
        const mem = loadUserMemory()
        await setDoc(memRef, {
          raw: JSON.stringify(mem),
          updatedAt: serverTimestamp(),
        })
      }

      localStorage.setItem(MIGRATION_KEY, uid)
      this.lastSyncAt = Date.now()
      this.lastError = null
      eventBus.emit('lunar:sync:complete', { ok: true })
    } catch (err) {
      this.lastError =
        err instanceof Error ? err.message : 'Sync falhou'
      eventBus.emit('lunar:sync:complete', {
        ok: false,
        error: this.lastError,
      })
    }
  }

  private mergeConversations(
    local: Conversation[],
    remote: Conversation[],
  ): Conversation[] {
    const map = new Map<string, Conversation>()
    for (const c of local) map.set(c.id, c)
    for (const r of remote) {
      const prev = map.get(r.id)
      if (!prev || r.updatedAt >= prev.updatedAt) map.set(r.id, r)
    }
    return [...map.values()]
  }

  async pushToCloud(state: StoredState): Promise<void> {
    const cfg = readLunaCloudConfig()
    if (!cfg.syncEnabled || !cfg.firebase) return

    const auth = getLunaAuth()
    const user = auth?.currentUser
    if (!user || user.isAnonymous) return

    const db = getLunaFirestore()
    if (!db) return

    this.pushing = true
    try {
      const uid = user.uid
      const batch = writeBatch(db)

      for (const conv of state.conversations) {
        const ref = doc(db, `${userDoc(uid)}/conversations`, conv.id)
        batch.set(ref, {
          ...conv,
          cloudUpdatedAt: serverTimestamp(),
        })
      }

      const settingsRef = doc(db, `${userDoc(uid)}/settings`, SETTINGS_DOC)
      batch.set(
        settingsRef,
        {
          snapshot: readCloudSettingsSnapshot(),
          folders: state.folders,
          activeId: state.activeId,
          updatedAt: serverTimestamp(),
        } satisfies CloudSettingsDoc,
        { merge: true },
      )

      const memRef = doc(db, `${userDoc(uid)}/memoryNotes`, 'bundle')
      batch.set(memRef, {
        raw: JSON.stringify(loadUserMemory()),
        updatedAt: serverTimestamp(),
      })

      await batch.commit()
      this.lastSyncAt = Date.now()
      this.lastError = null
    } catch (err) {
      this.lastError =
        err instanceof Error ? err.message : 'Push sync falhou'
    } finally {
      this.pushing = false
    }
  }
}

export const cloudSyncService = new CloudSyncServiceImpl()
