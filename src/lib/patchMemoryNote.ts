import { isMemoryKindId } from './memoryKinds'
import {
  MAX_NOTE_DETAIL_LEN,
  MAX_NOTE_TAG_LEN,
  MAX_NOTE_TAGS,
  MAX_NOTE_TITLE_LEN,
} from './userMemoryStorage'
import type { MemoryKindId } from './memoryKinds'
import type { MemoryNote } from '../types/memory'

export type MemoryNotePatch = {
  title?: string
  detail?: string
  kind?: MemoryKindId
  tags?: string[]
}

function sanitizeTags(raw: string[]): string[] {
  const out: string[] = []
  for (const t of raw) {
    const s = t.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE_TAG_LEN)
    if (!s.length) continue
    const key = s.toLowerCase()
    if (out.some((x) => x.toLowerCase() === key)) continue
    out.push(s)
    if (out.length >= MAX_NOTE_TAGS) break
  }
  return out
}

/** Aplica edição manual a uma nota com os mesmos limites da sanitização global. */
export function patchMemoryNote(
  note: MemoryNote,
  patch: MemoryNotePatch,
): MemoryNote | null {
  const title =
    patch.title !== undefined
      ? patch.title.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE_TITLE_LEN)
      : note.title
  const detail =
    patch.detail !== undefined
      ? patch.detail.trim().slice(0, MAX_NOTE_DETAIL_LEN)
      : note.detail
  if (!title.length && !detail.length) return null
  const kind =
    patch.kind !== undefined
      ? isMemoryKindId(patch.kind)
        ? patch.kind
        : note.kind
      : note.kind
  const tags =
    patch.tags !== undefined ? sanitizeTags(patch.tags) : note.tags
  return {
    ...note,
    title: title.length ? title : '(sem título)',
    detail,
    ...(kind ? { kind } : {}),
    ...(tags?.length ? { tags } : {}),
  }
}
