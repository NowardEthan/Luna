import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore'
import { eventBus } from '../../core/events/EventBus'
import { getLunaAuth, getLunaFirestore } from '../../lib/firebase'
import { LUNA_FS, userDoc } from '../../lib/firebase/paths'
import { stripUndefinedForFirestore } from '../../lib/firebase/stripUndefined'
import { isRealLunarUser } from '../../lib/lunarAccount'
import {
  getFinancesState,
  patchMeta,
  replaceFinancesState,
} from './financesStore'
import {
  getCollectionTombstones,
  mergeFinanceTombstones,
  type FinanceTombstoneCollection,
} from './financesTombstones'
import { dedupeFinanceAccounts } from './financesDedup'
import { FINANCES_SCHEMA_VERSION, type FinancesState } from './types'
import { nowIso } from './financesId'

const BATCH_LIMIT = 400

type WithUpdated = { updatedAt: string }

function syncErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Sync falhou'
  if (raw.includes('insufficient permissions') || raw.includes('permission')) {
    return 'Permissões Firestore em falta para Finanças. Corre npm run firebase:deploy-rules e confirma que estás com Conta Lunar (Google, não anónimo).'
  }
  return raw
}

function mergeByUpdatedAt<T extends WithUpdated>(
  local: T[],
  remote: T[],
  tombstones: Record<string, string> = {},
  idField: keyof T = 'id' as keyof T,
): T[] {
  const map = new Map<string, T>()
  for (const item of local) {
    const id = String(item[idField])
    map.set(id, item)
  }
  for (const item of remote) {
    const id = String(item[idField])
    const deletedAt = tombstones[id]
    if (deletedAt && item.updatedAt <= deletedAt) continue
    const prev = map.get(id)
    if (!prev || item.updatedAt >= prev.updatedAt) {
      map.set(id, item)
    }
  }
  return [...map.values()]
}

function mergeCollection<T extends WithUpdated>(
  local: T[],
  remote: T[],
  meta: FinancesState['meta'],
  collection: FinanceTombstoneCollection,
): T[] {
  return mergeByUpdatedAt(local, remote, getCollectionTombstones(meta, collection))
}

async function pullCollection<T extends WithUpdated>(
  uid: string,
  sub: string,
): Promise<T[]> {
  const db = getLunaFirestore()
  if (!db) return []
  const snap = await getDocs(collection(db, userDoc(uid), sub))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as T)
}

/** Escreve itens locais e remove documentos órfãos na subcoleção. */
async function syncCollection<T extends WithUpdated & { id: string }>(
  uid: string,
  sub: string,
  items: T[],
): Promise<void> {
  const db = getLunaFirestore()
  if (!db) return
  const colRef = collection(db, userDoc(uid), sub)
  const snap = await getDocs(colRef)
  const keepIds = new Set(items.map((i) => i.id))

  let batch = writeBatch(db)
  let ops = 0

  const flush = async () => {
    if (ops === 0) return
    await batch.commit()
    batch = writeBatch(db)
    ops = 0
  }

  const enqueue = async (ref: DocumentReference, op: 'set' | 'delete', data?: object) => {
    if (op === 'delete') batch.delete(ref)
    else batch.set(ref, stripUndefinedForFirestore(data ?? {}), { merge: true })
    ops++
    if (ops >= BATCH_LIMIT) await flush()
  }

  for (const d of snap.docs) {
    if (!keepIds.has(d.id)) {
      await enqueue(d.ref, 'delete')
    }
  }

  for (const item of items) {
    const { id, ...rest } = item
    await enqueue(doc(db, userDoc(uid), sub, id), 'set', rest)
  }

  await flush()
}

export function canSyncFinancesCloud(): boolean {
  const auth = getLunaAuth()
  return isRealLunarUser(auth?.currentUser ?? null)
}

export async function pullFinancesFromCloud(): Promise<{
  ok: boolean
  error?: string
}> {
  if (!canSyncFinancesCloud()) {
    return { ok: false, error: 'Conta Lunar necessária para sync.' }
  }
  const auth = getLunaAuth()
  const uid = auth?.currentUser?.uid
  if (!uid) return { ok: false, error: 'Sem sessão.' }

  try {
    const local = getFinancesState()
    const [
      accounts,
      categories,
      transactions,
      budgets,
      goals,
      recurring,
      bills,
      creditCards,
      piggyBanks,
      piggyBankTx,
      tags,
      notifications,
    ] = await Promise.all([
      pullCollection<FinancesState['accounts'][0]>(uid, LUNA_FS.financeAccounts),
      pullCollection<FinancesState['categories'][0]>(uid, LUNA_FS.financeCategories),
      pullCollection<FinancesState['transactions'][0]>(uid, LUNA_FS.financeTransactions),
      pullCollection<FinancesState['budgets'][0]>(uid, LUNA_FS.financeBudgets),
      pullCollection<FinancesState['goals'][0]>(uid, LUNA_FS.financeGoals),
      pullCollection<FinancesState['recurring'][0]>(uid, LUNA_FS.financeRecurring),
      pullCollection<FinancesState['bills'][0]>(uid, LUNA_FS.financeBills),
      pullCollection<FinancesState['creditCards'][0]>(uid, LUNA_FS.financeCreditCards),
      pullCollection<FinancesState['piggyBanks'][0]>(uid, LUNA_FS.financePiggyBanks),
      pullCollection<FinancesState['piggyBankTx'][0]>(uid, LUNA_FS.financePiggyBankTx),
      pullCollection<FinancesState['tags'][0]>(uid, LUNA_FS.financeTags),
      pullCollection<FinancesState['notifications'][0]>(uid, LUNA_FS.financeNotifications),
    ])

    const db = getLunaFirestore()
    let remoteMeta: FinancesState['meta'] | undefined
    if (db) {
      const metaSnap = await getDoc(doc(db, userDoc(uid), LUNA_FS.financeMeta, 'meta'))
      if (metaSnap.exists()) {
        remoteMeta = metaSnap.data() as FinancesState['meta']
      }
    }

    const tombstones = mergeFinanceTombstones(
      local.meta.tombstones,
      remoteMeta?.tombstones,
    )
    let meta: FinancesState['meta'] = {
      ...local.meta,
      ...(remoteMeta?.lastSyncAt &&
      (!local.meta.lastSyncAt || remoteMeta.lastSyncAt > local.meta.lastSyncAt)
        ? {
            lastSyncAt: remoteMeta.lastSyncAt,
            defaultCurrency: remoteMeta.defaultCurrency ?? local.meta.defaultCurrency,
          }
        : {}),
      tombstones,
    }

    const merged: FinancesState = {
      meta,
      accounts: dedupeFinanceAccounts(
        mergeCollection(local.accounts, accounts, meta, 'accounts'),
      ),
      categories: mergeCollection(local.categories, categories, meta, 'categories'),
      transactions: mergeCollection(
        local.transactions,
        transactions,
        meta,
        'transactions',
      ),
      budgets: mergeCollection(local.budgets, budgets, meta, 'budgets'),
      goals: mergeCollection(local.goals, goals, meta, 'goals'),
      recurring: mergeCollection(local.recurring, recurring, meta, 'recurring'),
      bills: mergeCollection(local.bills, bills, meta, 'bills'),
      creditCards: mergeCollection(local.creditCards, creditCards, meta, 'creditCards'),
      piggyBanks: mergeCollection(local.piggyBanks, piggyBanks, meta, 'piggyBanks'),
      piggyBankTx: mergeCollection(local.piggyBankTx, piggyBankTx, meta, 'piggyBankTx'),
      tags: mergeCollection(local.tags, tags, meta, 'tags'),
      notifications: mergeCollection(
        local.notifications,
        notifications,
        meta,
        'notifications',
      ),
    }
    replaceFinancesState(merged)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: syncErrorMessage(err) }
  }
}

export async function pushFinancesToCloud(): Promise<{
  ok: boolean
  error?: string
}> {
  if (!canSyncFinancesCloud()) {
    return { ok: false, error: 'Conta Lunar necessária para sync.' }
  }
  const auth = getLunaAuth()
  const uid = auth?.currentUser?.uid
  if (!uid) return { ok: false, error: 'Sem sessão.' }

  try {
    const state = getFinancesState()
    const syncAt = nowIso()
    await Promise.all([
      syncCollection(uid, LUNA_FS.financeAccounts, state.accounts),
      syncCollection(uid, LUNA_FS.financeCategories, state.categories),
      syncCollection(uid, LUNA_FS.financeTransactions, state.transactions),
      syncCollection(uid, LUNA_FS.financeBudgets, state.budgets),
      syncCollection(uid, LUNA_FS.financeGoals, state.goals),
      syncCollection(uid, LUNA_FS.financeRecurring, state.recurring),
      syncCollection(uid, LUNA_FS.financeBills, state.bills),
      syncCollection(uid, LUNA_FS.financeCreditCards, state.creditCards),
      syncCollection(uid, LUNA_FS.financePiggyBanks, state.piggyBanks),
      syncCollection(uid, LUNA_FS.financePiggyBankTx, state.piggyBankTx),
      syncCollection(uid, LUNA_FS.financeTags, state.tags),
      syncCollection(uid, LUNA_FS.financeNotifications, state.notifications),
    ])
    const db = getLunaFirestore()
    if (db) {
      await setDoc(
        doc(db, userDoc(uid), LUNA_FS.financeMeta, 'meta'),
        stripUndefinedForFirestore({
          ...state.meta,
          lastSyncAt: syncAt,
          schemaVersion: FINANCES_SCHEMA_VERSION,
        }),
        { merge: true },
      )
    }
    patchMeta({ lastSyncAt: syncAt })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: syncErrorMessage(err) }
  }
}

let syncTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleFinancesCloudSync(delayMs = 2500): void {
  if (!canSyncFinancesCloud()) return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    void (async () => {
      const pull = await pullFinancesFromCloud()
      if (!pull.ok) {
        eventBus.emit('finances:sync:complete', pull)
        return
      }
      const push = await pushFinancesToCloud()
      eventBus.emit('finances:sync:complete', push)
    })()
  }, delayMs)
}

export async function syncFinancesNow(): Promise<void> {
  const pull = await pullFinancesFromCloud()
  if (!pull.ok) {
    eventBus.emit('finances:sync:complete', pull)
    return
  }
  const push = await pushFinancesToCloud()
  eventBus.emit('finances:sync:complete', push)
}
