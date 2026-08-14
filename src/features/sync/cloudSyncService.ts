import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
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
import {
  userConversationDoc,
  userConversationMessageCol,
  userConversationMessageDoc,
  userDoc,
} from '../../lib/firebase/paths'
import {
  applyCloudSettingsSnapshot,
  readCloudSettingsSnapshot,
} from '../../lib/settingsCloudMap'
import { readLunaCloudConfig } from '../../lib/lunaCloud'
import { isRealLunarUser } from '../../lib/lunarAccount'
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
} from './conversationSyncDedup'
import {
  buildCloudMeta,
  buildCloudMetaIncrement,
  conversationFromCloud,
  messageFromCloud,
  messageToCloud,
} from './cloudSyncAdapters'
import {
  isLabCompatibleV2Doc,
  isLegacyConversationDoc,
  migrateLegacyConversation,
} from './cloudSyncMigration'
import type { CloudConversationMeta, CloudMessage } from '../../lib/firebase/types'

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

/** UID atual do Firebase Auth (null se deslogado). */
function getCurrentUid(): string | null {
  return getLunaAuth()?.currentUser?.uid ?? null
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

  // Realtime sync (onSnapshot)
  private realtimeUnsub: Unsubscribe | null = null
  private isReceivingRemote = false // Flag para evitar loops de sync

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
    const user = getLunaAuth()?.currentUser
    return isRealLunarUser(user)
  }

  getRuntimeState(id: string): CloudSyncState | null {
    return this.runtime.get(id)?.state ?? null
  }

  hasPendingChanges(id: string): boolean {
    if (this.dirtyConversationIds.has(id)) return true
    const state = this.pendingState ?? hydrateFromLocalStorage(getCurrentUid())
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
    this.stopRealtimeSync()
    this.emitTick()
  }

  // ─── Realtime Sync (onSnapshot) ─────────────────────────────────────────────

  /** Inicia listener onSnapshot para sync em tempo real. */
  startRealtimeSync(): void {
    if (!this.isAvailable()) return
    if (this.realtimeUnsub) return // Já está ativo

    const db = getLunaFirestore()
    const user = getLunaAuth()?.currentUser
    if (!db || !user) return

    const uid = user.uid
    const convCol = collection(db, `${userDoc(uid)}/conversations`)

    this.realtimeUnsub = onSnapshot(
      convCol,
      { includeMetadataChanges: false },
      async (snap) => {
        // Ignora mudanças que acabamos de fazer (evita loops)
        if (this.isReceivingRemote) return
        if (snap.metadata.hasPendingWrites) return // Ainda escrevendo localmente

        const changes = snap.docChanges()
        if (changes.length === 0) return

        console.info('[cloudSync:realtime] Mudanças detectadas:', changes.length)

        // Marca que estamos recebendo remote pra não fazer push de volta
        this.isReceivingRemote = true

        try {
          await this.pullFromCloud()
        } finally {
          this.isReceivingRemote = false
        }
      },
      (err) => {
        console.error('[cloudSync:realtime] Erro no listener:', err)
        this.stopRealtimeSync()
      },
    )

    console.info('[cloudSync:realtime] Listener iniciado')
  }

  /** Para o listener onSnapshot. */
  stopRealtimeSync(): void {
    if (this.realtimeUnsub) {
      this.realtimeUnsub()
      this.realtimeUnsub = null
      console.info('[cloudSync:realtime] Listener parado')
    }
  }

  /** Retorna se o realtime sync está ativo. */
  isRealtimeActive(): boolean {
    return this.realtimeUnsub !== null
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
    const state = hydrateFromLocalStorage(getCurrentUid()) ?? this.pendingState
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

  /** Marca conversa como cloud-enabled (cloud-first: sempre true). */
  async setConversationCloudEnabled(
    state: StoredState,
    conversationId: string,
    enabled: boolean,
  ): Promise<StoredState | null> {
    // Cloud-first: não há mais opt-out. Mantém o método para compatibilidade.
    void enabled
    if (!state.conversations.some((c) => c.id === conversationId)) return null
    return state
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

  /** Marca pasta como cloud-enabled (cloud-first: sempre true). */
  async setFolderCloudEnabled(
    state: StoredState,
    folderId: string,
    enabled: boolean,
  ): Promise<StoredState | null> {
    // Cloud-first: não há mais opt-out. Mantém o método para compatibilidade.
    void enabled
    if (!state.folders.some((f) => f.id === folderId)) return null
    return state
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
      const local = hydrateFromLocalStorage(getCurrentUid())
      const migrated = localStorage.getItem(MIGRATION_KEY) === uid

      const convCol = collection(db, `${userDoc(uid)}/conversations`)
      const convSnap = await getDocs(convCol)
      const remoteConvs: Conversation[] = []

      for (const d of convSnap.docs) {
        const raw = d.data() as Record<string, unknown>
        const meta = raw as Partial<CloudConversationMeta>

        // Schema v2 (legacy escreve): sem messages inline, subcoleção de messages.
        // OU conversa Lab/Railway: mesma estrutura mas sem schemaVersion explícito.
        if (meta.schemaVersion === 2 || isLabCompatibleV2Doc(raw)) {
          if (meta.deletedAt) continue // soft-deleted, esconde

          // Se o doc não tem schemaVersion=2 (caso Lab), marca pra coerência
          const normalizedMeta: CloudConversationMeta = {
            schemaVersion: 2,
            title: typeof meta.title === 'string' ? meta.title : 'Conversa',
            preview: typeof meta.preview === 'string' ? meta.preview : '',
            lunaSessaoId:
              typeof meta.lunaSessaoId === 'string'
                ? meta.lunaSessaoId
                : d.id,
            createdAt:
              (meta.createdAt as CloudConversationMeta['createdAt']) ??
              (serverTimestamp() as unknown as CloudConversationMeta['createdAt']),
            updatedAt:
              (meta.updatedAt as CloudConversationMeta['updatedAt']) ??
              (serverTimestamp() as unknown as CloudConversationMeta['updatedAt']),
            messageCount: typeof meta.messageCount === 'number' ? meta.messageCount : 0,
            titleLocked: meta.titleLocked === true,
            deletedAt: (meta.deletedAt as CloudConversationMeta['deletedAt']) ?? null,
            deletedMessageIds: Array.isArray(meta.deletedMessageIds)
              ? (meta.deletedMessageIds as string[])
              : [],
            ...(meta.sourceMode && { sourceMode: meta.sourceMode }),
            ...(meta.workspaceRoot !== undefined && { workspaceRoot: meta.workspaceRoot }),
            ...(meta.folderId !== undefined && { folderId: meta.folderId }),
            ...(typeof meta.pinned === 'boolean' && { pinned: meta.pinned }),
            ...(meta.tags && { tags: meta.tags }),
            ...(meta.cloudUpdatedAt && {
              cloudUpdatedAt: meta.cloudUpdatedAt as CloudConversationMeta['cloudUpdatedAt'],
            }),
          }

          const msgSnap = await getDocs(
            query(
              collection(db, userConversationMessageCol(uid, d.id)),
              orderBy('createdAt', 'asc'),
            ),
          )
          const messages = msgSnap.docs.map((md) =>
            messageFromCloud(md.id, md.data() as CloudMessage),
          )
          const conv = conversationFromCloud(d.id, normalizedMeta, messages)
          remoteConvs.push(conv)
        } else if (isLegacyConversationDoc(raw)) {
          // Doc legado (schemaVersion < 2, com messages inline).
          // Migra pra schema novo na primeira puxada. Idempotente.
          console.info(
            `[cloudSync] migrando conversa legada ${d.id}...`,
          )
          try {
            await migrateLegacyConversation(db, uid, d.id, raw)
            // Após migração, lê a versão nova e inclui no resultado
            const msgSnap = await getDocs(
              query(
                collection(db, userConversationMessageCol(uid, d.id)),
                orderBy('createdAt', 'asc'),
              ),
            )
            const messages = msgSnap.docs.map((md) =>
              messageFromCloud(md.id, md.data() as CloudMessage),
            )
            // Re-lê o doc atualizado (agora schemaVersion=2)
            const updatedSnap = await getDoc(
              doc(db, userConversationDoc(uid, d.id)),
            )
            const updatedMeta = updatedSnap.data() as CloudConversationMeta | undefined
            if (updatedMeta) {
              const conv = conversationFromCloud(d.id, updatedMeta, messages)
              remoteConvs.push(conv)
            }
          } catch (err) {
            console.warn(
              `[cloudSync] falha ao migrar ${d.id}:`,
              err instanceof Error ? err.message : err,
            )
          }
        } else {
          // Doc vazio ou desconhecido — pula
          console.warn(
            `[cloudSync] conversa ${d.id} em formato desconhecido — ignorada`,
          )
        }
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

        persistToLocalStorage(stored, getCurrentUid())

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

  /** Remove documentos Firestore que já não estão no estado local sincronizado.
   *  ATENÇÃO: BUG HISTÓRICO — esta função apagava conversas Lab que não estavam
   *  no estado local do legacy (causando perda de dados). Foi DESABILITADA em
   *  2026-08-09. Substituir por track explícito de deletes em conversa/folder.
   *
   *  Por enquanto é no-op com warning quando chamada.
   */
  private async pruneOrphanCloudDocuments(_keepIds: Set<string>): Promise<void> {
    if (!this.isAvailable()) return
    console.warn(
      '[cloudSync] pruneOrphanCloudDocuments desabilitado (vai causar inconsistência se houver conversas cloud-only)',
    )
    // ANTIGO (BUG — apaga conversas Lab-only):
    //   const db = getLunaFirestore()
    //   const user = getLunaAuth()?.currentUser
    //   ...
    //   for (const d of snap.docs) {
    //     if (!keepIds.has(d.id)) await deleteDoc(d.ref)
    //   }
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

    const state = hydrateFromLocalStorage(getCurrentUid()) ?? this.pendingState
    if (state) {
      const quota = this.assertQuotaForState(state)
      if (!quota.ok) {
        this.setRuntime('conversation', conv.id, 'error', quota.message)
        return false
      }
    }

    this.setRuntime('conversation', conv.id, 'syncing')
    try {
      // Schema v2: metadata sem messages; messages na subcoleção
      const metaRef = doc(db, userConversationDoc(user.uid, conv.id))
      // P1: se conversa já existe no Firestore, atualiza messageCount via
      // increment(delta) — alinha com Lab, evita race de sobrescrita absoluta.
      const existingSnap = await getDoc(metaRef)
      const remoteCount =
        existingSnap.exists() && typeof existingSnap.data()?.messageCount === 'number'
          ? (existingSnap.data() as { messageCount: number }).messageCount
          : 0
      const delta = conv.messages.length - remoteCount

      if (existingSnap.exists()) {
        await setDoc(
          metaRef,
          stripUndefinedForFirestore(buildCloudMetaIncrement(conv, delta)) as Record<string, unknown>,
          { merge: true },
        )
      } else {
        await setDoc(
          metaRef,
          stripUndefinedForFirestore(buildCloudMeta(conv)) as Record<string, unknown>,
        )
      }

      // Messages: chunks de 449 pra respeitar BATCH_LIMIT (450)
      const messages = conv.messages
      for (let i = 0; i < messages.length; i += 449) {
        const batch = writeBatch(db)
        const chunk = messages.slice(i, i + 449)
        chunk.forEach((m, idx) => {
          const cloudMsg = messageToCloud(m, i + idx)
          batch.set(
            doc(db, userConversationMessageDoc(user.uid, conv.id, m.id)),
            stripUndefinedForFirestore(cloudMsg as unknown as Record<string, unknown>),
          )
        })
        await batch.commit()
      }

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
      persistToLocalStorage(state, getCurrentUid())
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
      // P1: lê messageCount remoto de cada conversa antes do batch pra
      // decidir entre full create (buildCloudMeta) e increment patch
      // (buildCloudMetaIncrement). Alinha com Lab que também usa increment.
      const remoteCounts = new Map<string, number>()
      await Promise.all(
        toPush.map(async (c) => {
          try {
            const snap = await getDoc(doc(db, userConversationDoc(uid, c.id)))
            if (snap.exists()) {
              const cnt = snap.data()?.messageCount
              remoteCounts.set(c.id, typeof cnt === 'number' ? cnt : 0)
            }
          } catch {
            /* ignore — vai tratar como nova */
          }
        }),
      )

      let batch = writeBatch(db)
      let ops = 0

      const commitBatch = async () => {
        if (ops === 0) return
        await batch.commit()
        batch = writeBatch(db)
        ops = 0
      }

      // Schema v2: meta + subcoleção de messages
      for (const conv of toPush) {
        const metaRef = doc(db, userConversationDoc(uid, conv.id))
        const remoteCount = remoteCounts.get(conv.id)
        if (remoteCount === undefined) {
          // Conversa nova no Firestore — full create
          batch.set(
            metaRef,
            stripUndefinedForFirestore(buildCloudMeta(conv)) as Record<string, unknown>,
          )
        } else {
          // Conversa já existe — usa increment(delta) pra messageCount
          const delta = conv.messages.length - remoteCount
          batch.set(
            metaRef,
            stripUndefinedForFirestore(
              buildCloudMetaIncrement(conv, delta),
            ) as Record<string, unknown>,
            { merge: true },
          )
        }
        ops++

        for (let i = 0; i < conv.messages.length; i++) {
          const m = conv.messages[i]
          batch.set(
            doc(db, userConversationMessageDoc(uid, conv.id, m.id)),
            stripUndefinedForFirestore(
              messageToCloud(m, i) as unknown as Record<string, unknown>,
            ),
          )
          ops++

          if (ops >= BATCH_LIMIT - 2) {
            // -2 pra dar espaço pro settings + memory abaixo
            await commitBatch()
          }
        }

        if (ops >= BATCH_LIMIT - 2) {
          await commitBatch()
        }
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

// ─── Auth Event Listeners (realtime sync) ────────────────────────────────────

eventBus.on('auth:signed-in', () => {
  // Inicia realtime sync após login
  cloudSyncService.startRealtimeSync()
})

eventBus.on('auth:signed-out', () => {
  // Para realtime sync ao deslogar
  cloudSyncService.stopRealtimeSync()
  cloudSyncService.reset()
})
