/**
 * Migração de conversas legadas (schemaVersion < 2, com messages inline)
 * pra schema novo (subcoleção de messages, schemaVersion 2).
 *
 * Chamado por pullFromCloud quando encontra um doc sem schemaVersion=2.
 * Idempotente: se já foi migrado por outro client, o segundo vê
 * schemaVersion=2 e não faz nada.
 */
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
  type Firestore,
  type Timestamp as FsTimestamp,
} from 'firebase/firestore'
import {
  userConversationDoc,
  userConversationMessageDoc,
  userDoc,
} from '../../lib/firebase/paths'
import type { CloudConversationMeta } from '../../lib/firebase/types'
import { messageToCloud } from './cloudSyncAdapters'
import type { Message } from '../../types/chat'

const MAX_MIGRATION_MSGS_PER_BATCH = 449

/**
 * Detecta se um doc é legado do ORBIT-LEGACY (precisa migração).
 * Critério: schemaVersion !== 2 E tem array `messages` inline.
 *
 * NOTA: conversas do OrbitLab NUNCA escrevem schemaVersion, mas seguem
 * estrutura v2 (title, preview, messageCount, lunaSessaoId, sem messages inline).
 * Essas NÃO são legadas — devem ser aceitas como v2 implícito no pull.
 */
export function isLegacyConversationDoc(raw: Record<string, unknown>): boolean {
  const sv = raw.schemaVersion
  if (sv === 2) return false
  if (Array.isArray(raw.messages)) return true
  return false
}

/**
 * Detecta se um doc segue o schema v2 do Lab/Legacy mesmo sem schemaVersion explícito.
 * Critério: tem title + lunaSessaoId (campos escritos pelo Lab em ensureConversation),
 * e NÃO tem array `messages` inline (caso contrário seria legado).
 */
export function isLabCompatibleV2Doc(raw: Record<string, unknown>): boolean {
  if (raw.schemaVersion === 2) return true
  if (Array.isArray(raw.messages)) return false
  // Lab escreve esses campos em ensureConversation
  return typeof raw.title === 'string' && typeof raw.lunaSessaoId === 'string'
}

/**
 * Migra uma conversa legada pra schema v2.
 *
 * @returns true se migrou; false se race com outro client (alguém já migrou)
 */
export async function migrateLegacyConversation(
  db: Firestore,
  uid: string,
  conversationId: string,
  raw: Record<string, unknown>,
): Promise<boolean> {
  const ref = doc(db, userConversationDoc(uid, conversationId))
  const inlineMessages = Array.isArray(raw.messages)
    ? (raw.messages as Array<Record<string, unknown>>)
    : []

  // 1) Cria docs na subcoleção em chunks
  for (let i = 0; i < inlineMessages.length; i += MAX_MIGRATION_MSGS_PER_BATCH) {
    const batch = writeBatch(db)
    const chunk = inlineMessages.slice(i, i + MAX_MIGRATION_MSGS_PER_BATCH)
    chunk.forEach((m, idx) => {
      const id = typeof m.id === 'string' && m.id.length > 0 ? m.id : `m${i + idx}`
      const localMsg = legacyInlineToLocalMessage(m, id)
      batch.set(
        doc(db, userConversationMessageDoc(uid, conversationId, id)),
        stripUndefined(messageToCloud(localMsg, i + idx) as unknown as Record<string, unknown>),
      )
    })
    await batch.commit()
  }

  // 2) Reescreve o doc da conversa SEM messages, COM schemaVersion: 2
  const { messages: _drop, ...rest } = raw
  void _drop

  const newMeta: Partial<CloudConversationMeta> = {
    ...rest,
    schemaVersion: 2 as const,
    messageCount: inlineMessages.length,
    cloudUpdatedAt: serverTimestamp() as unknown as FsTimestamp,
  }

  if (!newMeta.title || typeof newMeta.title !== 'string') {
    newMeta.title = 'Conversa'
  }
  if (typeof newMeta.titleLocked !== 'boolean') {
    newMeta.titleLocked = false
  }
  if (!Array.isArray(newMeta.deletedMessageIds)) {
    newMeta.deletedMessageIds = []
  }
  if (!newMeta.lunaSessaoId) {
    newMeta.lunaSessaoId = conversationId
  }
  if (typeof newMeta.createdAt === 'number') {
    newMeta.createdAt = Timestamp.fromMillis(newMeta.createdAt)
  } else if (!newMeta.createdAt) {
    newMeta.createdAt = Timestamp.now()
  }
  if (typeof newMeta.updatedAt === 'number') {
    newMeta.updatedAt = Timestamp.fromMillis(newMeta.updatedAt)
  } else if (!newMeta.updatedAt) {
    newMeta.updatedAt = Timestamp.now()
  }
  if (newMeta.deletedAt === undefined) {
    newMeta.deletedAt = null
  }

  await setDoc(ref, stripUndefined(newMeta as Record<string, unknown>))

  return true
}

/**
 * Converte um message inline do formato legado pra Message local tipado.
 */
function legacyInlineToLocalMessage(
  m: Record<string, unknown>,
  id: string,
): Message {
  const roleRaw = m.role
  const role: 'user' | 'assistant' =
    roleRaw === 'user' || roleRaw === 'assistant'
      ? roleRaw
      : roleRaw === 'luna'
        ? 'assistant'
        : 'assistant'

  return {
    id,
    role,
    text: typeof m.text === 'string' ? m.text : '',
    streamingActive: false,
  } as Message
}

/** Remove undefined pra não poluir Firestore. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k]
  }
  return out as T
}

/**
 * Hook standalone: migra todas as conversas legadas do usuário.
 * Útil pra debug manual via console do Electron.
 *
 * Expor em window via dev tools se quiser trigger manual.
 */
export async function migrateAllLegacyConversations(
  db: Firestore,
  uid: string,
): Promise<{ migrated: number; skipped: number; errors: string[] }> {
  const snap = await getDocs(collection(db, `${userDoc(uid)}/conversations`))

  let migrated = 0
  let skipped = 0
  const errors: string[] = []

  for (const d of snap.docs) {
    const raw = d.data() as Record<string, unknown>
    if (!isLegacyConversationDoc(raw)) {
      skipped++
      continue
    }
    try {
      const ok = await migrateLegacyConversation(db, uid, d.id, raw)
      if (ok) migrated++
      else skipped++
    } catch (err) {
      errors.push(`${d.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { migrated, skipped, errors }
}

/**
 * Diagnóstico: lista TODAS as conversas do Firestore com estado detalhado.
 * NÃO modifica nada. Útil pra ver o que tá lá antes de qualquer recovery.
 */
export async function listAllRemoteConversations(
  db: Firestore,
  uid: string,
): Promise<
  Array<{
    id: string
    title: string
    messageCount: number
    schemaVersion: number | undefined
    deletedAt: number | null
    deletedMessageIds: string[]
    hasInlineMessages: boolean
    lunaSessaoId: string | undefined
  }>
> {
  const snap = await getDocs(collection(db, `${userDoc(uid)}/conversations`))
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>
    const deletedAtRaw = data.deletedAt
    let deletedAtMs: number | null = null
    if (deletedAtRaw && typeof (deletedAtRaw as { toMillis?: () => number }).toMillis === 'function') {
      deletedAtMs = (deletedAtRaw as { toMillis: () => number }).toMillis()
    } else if (deletedAtRaw instanceof Date) {
      deletedAtMs = deletedAtRaw.getTime()
    } else if (typeof deletedAtRaw === 'number') {
      deletedAtMs = deletedAtRaw
    }
    return {
      id: d.id,
      title: typeof data.title === 'string' ? data.title : '(sem título)',
      messageCount: typeof data.messageCount === 'number' ? data.messageCount : 0,
      schemaVersion: typeof data.schemaVersion === 'number' ? data.schemaVersion : undefined,
      deletedAt: deletedAtMs,
      deletedMessageIds: Array.isArray(data.deletedMessageIds)
        ? (data.deletedMessageIds as string[])
        : [],
      hasInlineMessages: Array.isArray(data.messages),
      lunaSessaoId: typeof data.lunaSessaoId === 'string' ? data.lunaSessaoId : undefined,
    }
  })
}

/**
 * Bypass cache local — lê direto do servidor. Retorna TUDO sem filtro.
 * Use pra debug quando getDocs parece estar retornando cache velho.
 */
export async function listAllRemoteConversationsFromServer(
  db: Firestore,
  uid: string,
): Promise<
  Array<{
    id: string
    title: string
    messageCount: number
    schemaVersion: number | undefined
    deletedAt: number | null
    deletedMessageIds: string[]
    hasInlineMessages: boolean
    lunaSessaoId: string | undefined
  }>
> {
  const { getDocsFromServer, collection } = await import('firebase/firestore')
  const snap = await getDocsFromServer(collection(db, `${userDoc(uid)}/conversations`))
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>
    const deletedAtRaw = data.deletedAt
    let deletedAtMs: number | null = null
    if (deletedAtRaw && typeof (deletedAtRaw as { toMillis?: () => number }).toMillis === 'function') {
      deletedAtMs = (deletedAtRaw as { toMillis: () => number }).toMillis()
    } else if (deletedAtRaw instanceof Date) {
      deletedAtMs = deletedAtRaw.getTime()
    } else if (typeof deletedAtRaw === 'number') {
      deletedAtMs = deletedAtRaw
    }
    return {
      id: d.id,
      title: typeof data.title === 'string' ? data.title : '(sem título)',
      messageCount: typeof data.messageCount === 'number' ? data.messageCount : 0,
      schemaVersion: typeof data.schemaVersion === 'number' ? data.schemaVersion : undefined,
      deletedAt: deletedAtMs,
      deletedMessageIds: Array.isArray(data.deletedMessageIds)
        ? (data.deletedMessageIds as string[])
        : [],
      hasInlineMessages: Array.isArray(data.messages),
      lunaSessaoId: typeof data.lunaSessaoId === 'string' ? data.lunaSessaoId : undefined,
    }
  })
}

/**
 * Recuperação reversa: limpa `deletedAt` de conversas específicas.
 * Use APENAS quando souber que as conversas foram acidentalmente soft-deleted.
 *
 * Por padrão reverte TUDO que tem deletedAt != null. Opcionalmente pode passar
 * uma lista específica de IDs.
 */
export async function restoreDeletedConversations(
  db: Firestore,
  uid: string,
  onlyIds?: string[],
): Promise<{ restored: number; skipped: number; errors: string[] }> {
  const snap = await getDocs(collection(db, `${userDoc(uid)}/conversations`))
  let restored = 0
  let skipped = 0
  const errors: string[] = []

  for (const d of snap.docs) {
    if (onlyIds && !onlyIds.includes(d.id)) continue
    const data = d.data() as Record<string, unknown>
    const hasDeletedAt =
      data.deletedAt !== null &&
      data.deletedAt !== undefined &&
      !(typeof data.deletedAt === 'object' && data.deletedAt && '_methodName' in (data.deletedAt as object) && (data.deletedAt as { _methodName: string })._methodName === 'delete')
    if (!hasDeletedAt) {
      skipped++
      continue
    }
    try {
      // updateDoc com FieldValue.delete() remove o campo
      const { updateDoc, FieldValue, deleteField } = await import('firebase/firestore')
      void FieldValue
      await updateDoc(d.ref, { deletedAt: deleteField() })
      restored++
    } catch (err) {
      errors.push(`${d.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { restored, skipped, errors }
}