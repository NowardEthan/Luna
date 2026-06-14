import type { Conversation, Message } from '../../types/chat'
import { isCloudSyncEnabled } from '../../types/cloudSync'

const WELCOME_PREFIXES = [
  'oi, sou a luna',
  'oi! sou a luna',
  'oi! tô por aqui',
  'bom dia',
  'boa tarde',
  'boa noite',
]

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function hasUserMessages(c: Conversation): boolean {
  return c.messages.some((m) => m.role === 'user')
}

export function isWelcomeOnlyConversation(c: Conversation): boolean {
  if (hasUserMessages(c)) return false
  const first = c.messages.find((m) => m.role === 'assistant')
  if (!first?.text?.trim()) return c.messages.length <= 1
  const t = normalizeText(first.text)
  return WELCOME_PREFIXES.some((p) => t.startsWith(p)) || c.messages.length <= 1
}

/** Chave estável para detectar clones (mesmo conteúdo, ids diferentes). */
export function conversationFingerprint(c: Conversation): string {
  const folder = c.folderId ?? 'root'
  const user = c.messages.find((m) => m.role === 'user')
  if (user) {
    const text = normalizeText(user.text).slice(0, 120)
    const vision = user.visionDescription
      ? normalizeText(user.visionDescription).slice(0, 80)
      : ''
    return `user:${folder}:${text}:${vision}`
  }
  const assistant = c.messages.find((m) => m.role === 'assistant')
  const preview = assistant
    ? normalizeText(assistant.text).slice(0, 80)
    : 'empty'
  return `welcome:${folder}:${preview}`
}

function pickPreferredConversation(
  a: Conversation,
  b: Conversation,
): Conversation {
  const aUser = hasUserMessages(a)
  const bUser = hasUserMessages(b)
  if (aUser && !bUser) return a
  if (bUser && !aUser) return b
  if (a.messages.length !== b.messages.length) {
    return a.messages.length > b.messages.length ? a : b
  }
  if (a.updatedAt !== b.updatedAt) {
    return a.updatedAt >= b.updatedAt ? a : b
  }
  return a.id.localeCompare(b.id) <= 0 ? a : b
}

/** Remove conversas duplicadas (mesmo conteúdo, ids diferentes). */
export function dedupeConversations(conversations: Conversation[]): Conversation[] {
  const byId = new Map<string, Conversation>()
  const byFp = new Map<string, Conversation>()

  for (const c of conversations) {
    const existingId = byId.get(c.id)
    if (existingId) {
      byId.set(c.id, pickPreferredConversation(existingId, c))
      continue
    }

    const fp = conversationFingerprint(c)
    const existingFp = byFp.get(fp)
    if (existingFp) {
      const winner = pickPreferredConversation(existingFp, c)
      byFp.set(fp, winner)
      byId.delete(existingFp.id)
      byId.set(winner.id, winner)
      continue
    }

    byId.set(c.id, c)
    byFp.set(fp, c)
  }

  return [...byId.values()]
}

/** Garante que o id do documento Firestore é o id canónico da conversa. */
export function normalizeFirestoreConversation(
  docId: string,
  raw: unknown,
): Conversation | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const messages = o.messages
  if (!Array.isArray(messages)) return null

  const id =
    typeof o.id === 'string' && o.id.length > 0 ? o.id : docId
  const canonicalId = docId.length > 0 ? docId : id

  const conv: Conversation = {
    id: canonicalId,
    title: typeof o.title === 'string' ? o.title : 'Conversa',
    folderId: typeof o.folderId === 'string' ? o.folderId : null,
    messages: messages as Message[],
    updatedAt: typeof o.updatedAt === 'number' ? o.updatedAt : Date.now(),
    pinned: o.pinned === true,
    titlePinned: o.titlePinned === true,
    tags: Array.isArray(o.tags) ? (o.tags as string[]) : undefined,
    cloudSync:
      o.cloudSync && typeof o.cloudSync === 'object'
        ? (o.cloudSync as Conversation['cloudSync'])
        : undefined,
    memory:
      o.memory && typeof o.memory === 'object'
        ? (o.memory as Conversation['memory'])
        : undefined,
  }

  if (id !== canonicalId) {
    return { ...conv, id: canonicalId }
  }
  return conv
}

export function cloudEnabledConversationIds(
  conversations: Conversation[],
): Set<string> {
  return new Set(
    conversations.filter((c) => isCloudSyncEnabled(c.cloudSync)).map((c) => c.id),
  )
}
