import { isMemoryKindId } from './memoryKinds'
import { sanitizeMemoryUi } from './configureMemoriesTool'
import type { MemoryNote, UserMemoryState } from '../types/memory'
import { USER_MEMORY_VERSION } from '../types/memory'
export const USER_MEMORY_STORAGE_KEY = 'chat-ia:user-memory:v1'

export const MAX_MEMORY_NOTES = 200
export const MAX_NOTE_TITLE_LEN = 120
export const MAX_NOTE_DETAIL_LEN = 2000
export const MAX_NOTE_TAGS = 8
export const MAX_NOTE_TAG_LEN = 32

function sanitizeMemoryNotes(raw: unknown): MemoryNote[] {
  if (!Array.isArray(raw)) return []
  const out: MemoryNote[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const id =
      typeof r.id === 'string' && r.id.trim().length
        ? r.id.trim().slice(0, 64)
        : ''
    if (!id.length) continue
    const title =
      typeof r.title === 'string'
        ? r.title.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE_TITLE_LEN)
        : ''
    const detail =
      typeof r.detail === 'string'
        ? r.detail.trim().slice(0, MAX_NOTE_DETAIL_LEN)
        : ''
    if (!title.length && !detail.length) continue
    const createdAt =
      typeof r.createdAt === 'number' && !Number.isNaN(r.createdAt)
        ? r.createdAt
        : Date.now()
    const sourceMessageId =
      typeof r.sourceMessageId === 'string'
        ? r.sourceMessageId.trim().slice(0, 64)
        : undefined
    const kind = isMemoryKindId(r.kind) ? r.kind : undefined
    const tags = sanitizeNoteTags(r.tags)
    out.push({
      id,
      title: title.length ? title : '(sem título)',
      detail,
      createdAt,
      ...(kind ? { kind } : {}),
      ...(tags.length ? { tags } : {}),
      ...(sourceMessageId ? { sourceMessageId } : {}),
    })
    if (out.length >= MAX_MEMORY_NOTES) break
  }
  out.sort((a, b) => b.createdAt - a.createdAt)
  return out.slice(0, MAX_MEMORY_NOTES)
}

function sanitizeNoteTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const t of raw) {
    if (typeof t !== 'string') continue
    const s = t.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE_TAG_LEN)
    if (!s.length) continue
    const key = s.toLowerCase()
    if (out.some((x) => x.toLowerCase() === key)) continue
    out.push(s)
    if (out.length >= MAX_NOTE_TAGS) break
  }
  return out
}

export function defaultUserMemory(): UserMemoryState {
  return {
    version: USER_MEMORY_VERSION,
    profileMarkdown: '',
    updatedAt: Date.now(),
    crossChatEnabled: true,
    conversationSearchEnabled: true,
    memoryNotes: [],
  }
}

export function sanitizeUserMemory(raw: unknown): UserMemoryState {
  const base = defaultUserMemory()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  const version =
    typeof o.version === 'number' && o.version === USER_MEMORY_VERSION
      ? USER_MEMORY_VERSION
      : USER_MEMORY_VERSION
  const profileMarkdown =
    typeof o.profileMarkdown === 'string'
      ? o.profileMarkdown.slice(0, 50_000)
      : ''
  const updatedAt =
    typeof o.updatedAt === 'number' && !Number.isNaN(o.updatedAt)
      ? o.updatedAt
      : Date.now()
  const crossChatEnabled = o.crossChatEnabled !== false
  const conversationSearchEnabled = o.conversationSearchEnabled !== false
  const memoryNotes = sanitizeMemoryNotes(o.memoryNotes)
  const memoryUi = sanitizeMemoryUi(o.memoryUi)
  return {
    version,
    profileMarkdown,
    updatedAt,
    crossChatEnabled,
    conversationSearchEnabled,
    memoryNotes,
    ...(memoryUi ? { memoryUi } : {}),
  }
}

export function loadUserMemory(): UserMemoryState {
  try {
    const raw = localStorage.getItem(USER_MEMORY_STORAGE_KEY)
    if (!raw) return defaultUserMemory()
    return sanitizeUserMemory(JSON.parse(raw) as unknown)
  } catch {
    return defaultUserMemory()
  }
}

export function saveUserMemory(state: UserMemoryState): void {
  try {
    localStorage.setItem(USER_MEMORY_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}
