import {
  collection,
  deleteDoc,
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
import type { ChatFolder, Conversation } from '../../types/chat'
import type { CloudSyncMeta, CloudSyncState } from '../../types/cloudSync'
import { isCloudSyncEnabled } from '../../types/cloudSync'
import { getLunaAuth, getLunaFirestore } from '../../lib/firebase'
import { userDoc } from '../../lib/firebase/paths'
import {
  applyCloudSettingsSnapshot,
  readCloudSettingsSnapshot,
} from '../../lib/settingsCloudMap'
import { readLunaCloudConfig } from '../../lib/lunaCloud'
import { readUsageMode } from '../../lib/lunarAccount'
import { stripUndefinedForFirestore } from '../../lib/firebase/stripUndefined'
import { loadUserMemory, saveUserMemory } from '../../lib/userMemoryStorage'
import {
  checkStateFitsQuota,
  CLOUD_QUOTA_EXCEEDED_MESSAGE,
} from '../../lib/lunarCloudQuota'
import { getCachedLunarPlan } from '../../lib/lunarPlanCache'
import { fetchRemoteCloudUsage } from './cloudStorageUsage'
import {
  collectFolderSubtreeConversationIds,
  conversationsForCloudSync,
  foldersForCloudSync,
} from './cloudSyncFolders'
import {
  isConversationStale,
  SYNC_DEBOUNCE_MS,
  SYNC_MAX_WAIT_MS,
  SYNC_MIN_INTERVAL_MS,
} from './cloudSyncUtils'
import {
  cloudEnabledConversationIds,
  dedupeConversations,
  normalizeFirestoreConversation,
} from './conversationSyncDedup'

const SETTINGS_DOC = 'app'
const MIGRATION_KEY = 'luna-cloud-migrated'
const BATCH_LIMIT = 450

type CloudSettingsDoc = {
  snapshot: Record<string, string>
  folders?: ChatFolder[]
  activeId?: string | null
  updatedAt: ReturnType<typeof serverTimestamp>
}

type SyncItemKind = 'conversation' | 'folder'

type RuntimeItem = {
  kind: SyncItemKind
  state: CloudSyncState
  error?: string
}

function syncErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Sync falhou'
  return raw.includes('insufficient permissions')
    ? 'Permissões Firestore em falta — corre npm run firebase:deploy-rules e confirma login Google (não anónimo).'
    : raw
}

class CloudSyncServiceImpl {
  private pushTimer: ReturnType<typeof setTimeout> | null = null
  private maxWaitTimer: ReturnType<typeof setTimeout> | null = null
  private pendingState: StoredState | null = null
  private lastSyncAt: number | null = null
  private lastError: string | null = null
  private lastPushFinishedAt = 0
  private pushing = false
  private readonly runtime = new Map<string, RuntimeItem>()
  private readonly dirtyConversationIds = new Set<string>()

  getStatus() {
    return {
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
      pushing: this.pushing,
    }
  }

  /** Uso de armazenamento na nuvem (Firestore). */
  async fetchRemoteUsageStats(): Promise<{
    conversationCount: number
    estimatedBytes: number
  } | null> {
    const usage = await fetchRemoteCloudUsage(getCachedLunarPlan())
    if (!usage) return null
    return {
      conversationCount: usage.conversationCount,
      estimatedBytes: usage.totalBytes,
    }
  }

  private assertQuotaForState(
    state: StoredState,
  ): { ok: true } | { ok: false; message: string } {
    const memoryRaw = JSON.stringify(loadUserMemory())
    const check = checkStateFitsQuota(getCachedLunarPlan(), state, memoryRaw)
    if (!check.ok) {
      this.lastError = check.message ?? CLOUD_QUOTA_EXCEEDED_MESSAGE
      return { ok: false, message: this.lastError }
    }
    return { ok: true }
  }

  isAvailable(): boolean {
    const cfg = readLunaCloudConfig()
    if (!cfg.syncEnabled || !cfg.firebase) return false
    if (readUsageMode() === 'offline') return false
    const user = getLunaAuth()?.currentUser
    return Boolean(user && !user.isAnonymous)
  }

  getRuntimeState(id: string): CloudSyncState | null {
    return this.runtime.get(id)?.state ?? null
  }

  hasPendingChanges(id: string): boolean {
    if (this.dirtyConversationIds.has(id)) return true
    const state = this.pendingState ?? hydrateFromLocalStorage()
    if (!state?.folders.some((f) => f.id === id)) return false
    const convIds = collectFolderSubtreeConversationIds(
      id,
      state.folders,
      state.conversations,
    )
    return convIds.some((cid) => this.dirtyConversationIds.has(cid))
  }

  reset(): void {
    if (this.pushTimer) clearTimeout(this.pushTimer)
    if (this.maxWaitTimer) clearTimeout(this.maxWaitTimer)
    this.pushTimer = null
    this.maxWaitTimer = null
    this.pendingState = null
    this.lastError = null
    this.lastSyncAt = null
    this.lastPushFinishedAt = 0
    this.runtime.clear()
    this.dirtyConversationIds.clear()
    this.emitTick()
  }

  private emitTick(): void {
    eventBus.emit('lunar:sync:tick', {})
  }

  private setRuntime(
    kind: SyncItemKind,
    id: string,
    state: CloudSyncState,
    error?: string,
  ): void {
    if (state === 'local') {
      this.runtime.delete(id)
    } else {
      this.runtime.set(id, { kind, state, error })
    }
    eventBus.emit('lunar:sync:item', { kind, id, state, error })
    this.emitTick()
  }

  /** Agenda envio em segundo plano (debounce ~1 min após a última alteração). */
  schedulePush(state: StoredState): void {
    if (!this.isAvailable()) return
    const enabled = conversationsForCloudSync(state.conversations)
    if (
      enabled.length === 0 &&
      foldersForCloudSync(state.folders, state.conversations).length === 0
    ) {
      return
    }

    this.pendingState = state

    for (const c of enabled) {
      if (isConversationStale(c)) this.dirtyConversationIds.add(c.id)
    }

    if (this.dirtyConversationIds.size === 0) return

    this.emitTick()

    if (this.pushTimer) clearTimeout(this.pushTimer)
    this.pushTimer = setTimeout(() => {
      void this.flushPending()
    }, SYNC_DEBOUNCE_MS)

    if (!this.maxWaitTimer) {
      this.maxWaitTimer = setTimeout(() => {
        this.maxWaitTimer = null
        void this.flushPending()
      }, SYNC_MAX_WAIT_MS)
    }
  }

  private async flushPending(): Promise<void> {
    const state = hydrateFromLocalStorage() ?? this.pendingState
    if (!state || this.dirtyConversationIds.size === 0) return

    const elapsed = Date.now() - this.lastPushFinishedAt
    if (elapsed < SYNC_MIN_INTERVAL_MS) {
      if (this.pushTimer) clearTimeout(this.pushTimer)
      this.pushTimer = setTimeout(
        () => void this.flushPending(),
        SYNC_MIN_INTERVAL_MS - elapsed,
      )
      return
    }

    await this.pushToCloud(state, { background: true })
  }

  async setConversationCloudEnabled(
    state: StoredState,
    conversationId: string,
    enabled: boolean,
  ): Promise<StoredState | null> {
    const conv = state.conversations.find((c) => c.id === conversationId)
    if (!conv) return null

    const conversations = state.conversations.map((c) => {
      if (c.id !== conversationId) return c
      if (!enabled) {
        const next = { ...c }
        delete next.cloudSync
        return next
      }
      return {
        ...c,
        cloudSync: { enabled: true } satisfies CloudSyncMeta,
      }
    })

    const nextState: StoredState = { ...state, conversations }

    if (!enabled) {
      this.setRuntime('conversation', conversationId, 'local')
      await this.removeConversationFromCloud(conversationId)
      await this.pushSettingsOnly(nextState)
      return nextState
    }

    const quota = this.assertQuotaForState(nextState)
    if (!quota.ok) {
      this.setRuntime('conversation', conversationId, 'error', quota.message)
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                cloudSync: {
                  enabled: true,
                  lastError: quota.message,
                },
              }
            : c,
        ),
      }
    }

    const ok = await this.pushSingleConversation(
      conversations.find((c) => c.id === conversationId)!,
    )
    await this.pushSettingsOnly(nextState)
    const synced = Date.now()
    return {
      ...nextState,
      conversations: nextState.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              cloudSync: ok
                ? { enabled: true, lastSyncedAt: synced }
                : {
                    enabled: true,
                    lastError: this.lastError ?? 'Erro ao enviar',
                  },
            }
          : c,
      ),
    }
  }

  private collectDescendantFolderIds(
    folderId: string,
    folders: ChatFolder[],
  ): Set<string> {
    const ids = new Set<string>([folderId])
    const stack = [folderId]
    while (stack.length) {
      const id = stack.pop()!
      for (const f of folders) {
        if (f.parentId === id && !ids.has(f.id)) {
          ids.add(f.id)
          stack.push(f.id)
        }
      }
    }
    return ids
  }

  async setFolderCloudEnabled(
    state: StoredState,
    folderId: string,
    enabled: boolean,
  ): Promise<StoredState | null> {
    if (!state.folders.some((f) => f.id === folderId)) return null

    const subtreeFolderIds = this.collectDescendantFolderIds(folderId, state.folders)
    const convIds = collectFolderSubtreeConversationIds(
      folderId,
      state.folders,
      state.conversations,
    )

    const conversations = state.conversations.map((c) => {
      if (!convIds.includes(c.id)) return c
      if (!enabled) {
        const next = { ...c }
        delete next.cloudSync
        return next
      }
      return { ...c, cloudSync: { enabled: true } satisfies CloudSyncMeta }
    })

    const folders = state.folders.map((f) => {
      if (!subtreeFolderIds.has(f.id)) return f
      if (!enabled) {
        const next = { ...f }
        delete next.cloudSync
        return next
      }
      return { ...f, cloudSync: { enabled: true } satisfies CloudSyncMeta }
    })

    const nextState: StoredState = { ...state, conversations, folders }

    if (!enabled) {
      for (const id of convIds) this.setRuntime('conversation', id, 'local')
      for (const id of subtreeFolderIds) this.setRuntime('folder', id, 'local')
      for (const id of convIds) await this.removeConversationFromCloud(id)
      await this.pushSettingsOnly(nextState)
      return nextState
    }

    const quota = this.assertQuotaForState(nextState)
    if (!quota.ok) {
      for (const id of convIds) {
        this.setRuntime('conversation', id, 'error', quota.message)
      }
      for (const id of subtreeFolderIds) {
        this.setRuntime('folder', id, 'error', quota.message)
      }
      return nextState
    }

    const ok = await this.pushToCloud(nextState, { force: true })
    if (!ok) return nextState

    const synced = Date.now()
    const stamp = (): CloudSyncMeta => ({
      enabled: true,
      lastSyncedAt: synced,
    })

    return {
      ...nextState,
      conversations: nextState.conversations.map((c) =>
        convIds.includes(c.id) ? { ...c, cloudSync: stamp() } : c,
      ),
      folders: nextState.folders.map((f) =>
        subtreeFolderIds.has(f.id) ? { ...f, cloudSync: stamp() } : f,
      ),
    }
  }

  async pullFromCloud(): Promise<void> {
    if (!this.isAvailable()) return

    const db = getLunaFirestore()
    if (!db) return

    const auth = getLunaAuth()
    const user = auth?.currentUser
    if (!user) return

    eventBus.emit('lunar:sync:start', {})

    try {
      const uid = user.uid
      const local = hydrateFromLocalStorage()
      const migrated = localStorage.getItem(MIGRATION_KEY) === uid

      const convCol = collection(db, `${userDoc(uid)}/conversations`)
      const convSnap = await getDocs(convCol)
      const remoteConvs: Conversation[] = []

      for (const d of convSnap.docs) {
        const conv = normalizeFirestoreConversation(d.id, d.data())
        if (conv) remoteConvs.push(conv)
      }

      const settingsRef = doc(db, `${userDoc(uid)}/settings`, SETTINGS_DOC)
      const settingsSnap = await getDoc(settingsRef)
      const settings = settingsSnap.data() as CloudSettingsDoc | undefined

      if (!migrated && local && remoteConvs.length === 0) {
        const hasEnabled =
          local.conversations.some((c) => isCloudSyncEnabled(c.cloudSync)) ||
          local.folders.some((f) => isCloudSyncEnabled(f.cloudSync))
        if (hasEnabled) {
          await this.pushToCloud(local, { skipSchedule: true })
        }
        localStorage.setItem(MIGRATION_KEY, uid)
        this.lastSyncAt = Date.now()
        eventBus.emit('lunar:sync:complete', { ok: true })
        eventBus.emit('lunar:sync:hydrate', {})
        return
      }

      if (remoteConvs.length > 0 || settings?.folders?.length) {
        const merged = dedupeConversations(
          this.mergeConversations(local?.conversations ?? [], remoteConvs),
        )
        const remoteFolders = settings?.folders ?? []
        const localFolders = local?.folders ?? []
        const folderMap = new Map<string, ChatFolder>()
        for (const f of localFolders) folderMap.set(f.id, f)
        for (const r of remoteFolders) {
          const prev = folderMap.get(r.id)
          if (!prev) folderMap.set(r.id, r)
          else if (isCloudSyncEnabled(r.cloudSync) || isCloudSyncEnabled(prev.cloudSync)) {
            folderMap.set(r.id, { ...prev, ...r, cloudSync: r.cloudSync ?? prev.cloudSync })
          }
        }
        const folders = [...folderMap.values()]
        const activeId =
          settings?.activeId ??
          local?.activeId ??
          merged[0]?.id ??
          null

        const stored: StoredState = {
          conversations: sortByUpdated(merged),
          folders,
          activeId: activeId ?? merged[0]?.id ?? '',
        }

        persistToLocalStorage(stored)

        await this.pruneOrphanCloudDocuments(
          cloudEnabledConversationIds(stored.conversations),
        )

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
        await setDoc(
          memRef,
          stripUndefinedForFirestore({
            raw: JSON.stringify(mem),
            updatedAt: serverTimestamp(),
          }),
        )
      }

      localStorage.setItem(MIGRATION_KEY, uid)
      this.lastSyncAt = Date.now()
      this.lastError = null
      this.runtime.clear()
      eventBus.emit('lunar:sync:complete', { ok: true })
      eventBus.emit('lunar:sync:hydrate', {})
    } catch (err) {
      this.lastError = syncErrorMessage(err)
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

    for (const c of local) {
      if (!isCloudSyncEnabled(c.cloudSync)) map.set(c.id, c)
    }

    for (const r of remote) {
      if (!isCloudSyncEnabled(r.cloudSync)) continue
      const prev = map.get(r.id)
      if (!prev || r.updatedAt >= prev.updatedAt) {
        map.set(r.id, r)
      }
    }

    for (const c of local) {
      if (!isCloudSyncEnabled(c.cloudSync)) continue
      const prev = map.get(c.id)
      if (!prev || c.updatedAt >= prev.updatedAt) {
        map.set(c.id, c)
      }
    }

    return [...map.values()]
  }

  /** Remove documentos Firestore que já não estão no estado local sincronizado. */
  private async pruneOrphanCloudDocuments(keepIds: Set<string>): Promise<void> {
    if (!this.isAvailable()) return
    const db = getLunaFirestore()
    const user = getLunaAuth()?.currentUser
    if (!db || !user) return

    const convCol = collection(db, `${userDoc(user.uid)}/conversations`)
    const snap = await getDocs(convCol)

    const deletes: Promise<void>[] = []
    for (const d of snap.docs) {
      if (!keepIds.has(d.id)) {
        deletes.push(
          deleteDoc(d.ref).catch(() => {
            /* ignore */
          }),
        )
      }
    }
    await Promise.all(deletes)
  }

  /** Apaga conversa na nuvem (ex.: utilizador apagou localmente). */
  async removeConversationFromCloudPublic(conversationId: string): Promise<void> {
    await this.removeConversationFromCloud(conversationId)
  }

  private async removeConversationFromCloud(conversationId: string): Promise<void> {
    if (!this.isAvailable()) return
    const db = getLunaFirestore()
    const user = getLunaAuth()?.currentUser
    if (!db || !user) return
    try {
      await deleteDoc(doc(db, `${userDoc(user.uid)}/conversations`, conversationId))
    } catch {
      /* ignore missing doc */
    }
  }

  private async pushSingleConversation(conv: Conversation): Promise<boolean> {
    if (!this.isAvailable() || !isCloudSyncEnabled(conv.cloudSync)) return false
    const db = getLunaFirestore()
    const user = getLunaAuth()?.currentUser
    if (!db || !user) return false

    const state = hydrateFromLocalStorage() ?? this.pendingState
    if (state) {
      const quota = this.assertQuotaForState(state)
      if (!quota.ok) {
        this.setRuntime('conversation', conv.id, 'error', quota.message)
        return false
      }
    }

    this.setRuntime('conversation', conv.id, 'syncing')
    try {
      await setDoc(
        doc(db, `${userDoc(user.uid)}/conversations`, conv.id),
        stripUndefinedForFirestore({
          ...conv,
          cloudUpdatedAt: serverTimestamp(),
        }),
      )
      this.clearRuntime('conversation', conv.id)
      this.dirtyConversationIds.delete(conv.id)
      this.lastSyncAt = Date.now()
      this.lastPushFinishedAt = Date.now()
      this.lastError = null
      return true
    } catch (err) {
      const msg = syncErrorMessage(err)
      this.setRuntime('conversation', conv.id, 'error', msg)
      this.lastError = msg
      return false
    }
  }

  private clearRuntime(_kind: SyncItemKind, id: string): void {
    this.runtime.delete(id)
  }

  private async pushSettingsOnly(state: StoredState): Promise<void> {
    if (!this.isAvailable()) return
    const db = getLunaFirestore()
    const user = getLunaAuth()?.currentUser
    if (!db || !user) return

    const cloudFolders = foldersForCloudSync(state.folders, state.conversations)
    for (const f of cloudFolders) {
      if (isCloudSyncEnabled(f.cloudSync)) {
        this.setRuntime('folder', f.id, 'syncing')
      }
    }

    try {
      await setDoc(
        doc(db, `${userDoc(user.uid)}/settings`, SETTINGS_DOC),
        stripUndefinedForFirestore({
          snapshot: readCloudSettingsSnapshot(),
          folders: cloudFolders,
          activeId: state.activeId,
          updatedAt: serverTimestamp(),
        } satisfies CloudSettingsDoc),
        { merge: true },
      )
      const stampedFolderIds = cloudFolders
        .filter((f) => isCloudSyncEnabled(f.cloudSync))
        .map((f) => f.id)
      for (const f of cloudFolders) {
        if (isCloudSyncEnabled(f.cloudSync)) {
          this.clearRuntime('folder', f.id)
        }
      }
      if (stampedFolderIds.length > 0) {
        this.lastSyncAt = Date.now()
        this.lastError = null
        eventBus.emit('lunar:sync:complete', {
          ok: true,
          folderIds: stampedFolderIds,
        })
      }
    } catch (err) {
      const msg = syncErrorMessage(err)
      for (const f of cloudFolders) {
        if (isCloudSyncEnabled(f.cloudSync)) {
          this.setRuntime('folder', f.id, 'error', msg)
        }
      }
      this.lastError = msg
      const erroredFolderIds = cloudFolders
        .filter((f) => isCloudSyncEnabled(f.cloudSync))
        .map((f) => f.id)
      if (erroredFolderIds.length > 0) {
        eventBus.emit('lunar:sync:complete', {
          ok: false,
          error: msg,
          folderIds: erroredFolderIds,
        })
      }
    }
  }

  async pushToCloud(
    state: StoredState,
    opts?: { force?: boolean; background?: boolean; skipSchedule?: boolean },
  ): Promise<boolean> {
    if (!this.isAvailable()) return false

    const db = getLunaFirestore()
    const user = getLunaAuth()?.currentUser
    if (!db || !user) return false

    const dedupedConversations = dedupeConversations(state.conversations)
    if (dedupedConversations.length !== state.conversations.length) {
      state = { ...state, conversations: dedupedConversations }
      persistToLocalStorage(state)
      eventBus.emit('lunar:sync:hydrate', {})
    }

    const allEnabled = conversationsForCloudSync(state.conversations)
    const toPush = opts?.force
      ? allEnabled
      : allEnabled.filter((c) => isConversationStale(c))

    const cloudFolders = foldersForCloudSync(state.folders, state.conversations)

    if (toPush.length === 0 && !opts?.force) {
      if (cloudFolders.length > 0) {
        await this.pushSettingsOnly(state)
      }
      if (this.maxWaitTimer) {
        clearTimeout(this.maxWaitTimer)
        this.maxWaitTimer = null
      }
      return true
    }

    const quota = this.assertQuotaForState(state)
    if (!quota.ok) {
      for (const c of toPush) {
        this.setRuntime('conversation', c.id, 'error', quota.message)
      }
      eventBus.emit('lunar:sync:complete', {
        ok: false,
        error: quota.message,
        conversationIds: toPush.map((c) => c.id),
      })
      return false
    }

    if (opts?.force && this.pushTimer) {
      clearTimeout(this.pushTimer)
      this.pushTimer = null
    }

    this.pushing = true
    for (const c of toPush) this.setRuntime('conversation', c.id, 'syncing')
    if (!opts?.background) {
      for (const f of cloudFolders) {
        if (isCloudSyncEnabled(f.cloudSync)) {
          this.setRuntime('folder', f.id, 'syncing')
        }
      }
    }

    try {
      const uid = user.uid
      let batch = writeBatch(db)
      let ops = 0

      const commitBatch = async () => {
        if (ops === 0) return
        await batch.commit()
        batch = writeBatch(db)
        ops = 0
      }

      for (const conv of toPush) {
        const ref = doc(db, `${userDoc(uid)}/conversations`, conv.id)
        batch.set(
          ref,
          stripUndefinedForFirestore({
            ...conv,
            cloudUpdatedAt: serverTimestamp(),
          }),
        )
        ops++
        if (ops >= BATCH_LIMIT) await commitBatch()
      }

      const settingsRef = doc(db, `${userDoc(uid)}/settings`, SETTINGS_DOC)
      batch.set(
        settingsRef,
        stripUndefinedForFirestore({
          snapshot: readCloudSettingsSnapshot(),
          folders: cloudFolders,
          activeId: state.activeId,
          updatedAt: serverTimestamp(),
        } satisfies CloudSettingsDoc),
        { merge: true },
      )
      ops++

      const memRef = doc(db, `${userDoc(uid)}/memoryNotes`, 'bundle')
      batch.set(
        memRef,
        stripUndefinedForFirestore({
          raw: JSON.stringify(loadUserMemory()),
          updatedAt: serverTimestamp(),
        }),
      )
      ops++

      await commitBatch()

      const synced = Date.now()
      for (const c of toPush) {
        this.clearRuntime('conversation', c.id)
        this.dirtyConversationIds.delete(c.id)
      }
      for (const f of cloudFolders) {
        if (isCloudSyncEnabled(f.cloudSync)) {
          this.clearRuntime('folder', f.id)
        }
      }

      await this.pruneOrphanCloudDocuments(
        cloudEnabledConversationIds(allEnabled),
      )

      if (this.maxWaitTimer) {
        clearTimeout(this.maxWaitTimer)
        this.maxWaitTimer = null
      }

      this.lastSyncAt = synced
      this.lastPushFinishedAt = synced
      this.lastError = null
      eventBus.emit('lunar:sync:complete', {
        ok: true,
        conversationIds: toPush.map((c) => c.id),
        folderIds: cloudFolders
          .filter((f) => isCloudSyncEnabled(f.cloudSync))
          .map((f) => f.id),
      })
      return true
    } catch (err) {
      const msg = syncErrorMessage(err)
      this.lastError = msg
      for (const c of toPush) this.setRuntime('conversation', c.id, 'error', msg)
      for (const f of cloudFolders) {
        if (isCloudSyncEnabled(f.cloudSync)) {
          this.setRuntime('folder', f.id, 'error', msg)
        }
      }
      eventBus.emit('lunar:sync:complete', {
        ok: false,
        error: msg,
        conversationIds: toPush.map((c) => c.id),
      })
      return false
    } finally {
      this.pushing = false
      this.emitTick()
    }
  }
}

export const cloudSyncService = new CloudSyncServiceImpl()
