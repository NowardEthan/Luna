import type { MemoryNote } from '../types/memory'

/** IDs gerados por `nextId()` no cliente (ex.: 1778856699491-z4gp3u9y2). */
export const MEMORY_NOTE_ID_RE = /\d{10,}-[a-z0-9]{4,32}/i

export function isMemoryNoteId(value: string): boolean {
  return MEMORY_NOTE_ID_RE.test(value.trim())
}

const BRACKETED_NOTE_RE = /\[(\d{10,}-[a-z0-9]{4,32})\]/gi

/** Prefixo em inline code para o markdown renderizar badge. */
export const MEMORY_NOTE_CODE_PREFIX = 'mem:'

/**
 * Converte `[note-id]` no pensamento em `` `mem:note-id` `` para badge na UI.
 */
export function enrichMemoryNoteMentionsInMarkdown(text: string): string {
  return text.replace(BRACKETED_NOTE_RE, (_full, id: string) => {
    return `\`${MEMORY_NOTE_CODE_PREFIX}${id}\``
  })
}

export function memoryNoteIdFromInlineCode(raw: string): string | null {
  const t = raw.trim()
  if (t.startsWith(MEMORY_NOTE_CODE_PREFIX)) {
    const id = t.slice(MEMORY_NOTE_CODE_PREFIX.length)
    return isMemoryNoteId(id) ? id : null
  }
  return isMemoryNoteId(t) ? t : null
}

export function buildMemoryNotesById(
  notes: MemoryNote[] | undefined,
): Map<string, MemoryNote> {
  const map = new Map<string, MemoryNote>()
  for (const n of notes ?? []) {
    if (n.id) map.set(n.id, n)
  }
  return map
}

export function memoryNoteTitleForId(
  id: string,
  notesById: Map<string, MemoryNote>,
): string | undefined {
  const title = notesById.get(id)?.title?.replace(/\s+/g, ' ').trim()
  if (!title || title === '(sem título)') return undefined
  return title
}
