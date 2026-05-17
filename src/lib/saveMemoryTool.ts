import { inferMemoryKindFromTitle, normalizeMemoryKind } from './memoryKinds'
import type { MemoryKindId } from './memoryKinds'
import type { MemoryNote } from '../types/memory'
import type { LlmToolCallMessage } from './togetherClient'
import {
  MAX_MEMORY_NOTES,
  MAX_NOTE_DETAIL_LEN,
  MAX_NOTE_TAGS,
  MAX_NOTE_TAG_LEN,
  MAX_NOTE_TITLE_LEN,
} from './userMemoryStorage'

export type SaveMemoryToolResult = {
  notes: MemoryNote[]
  createdIds: string[]
  /** Corpo JSON para mensagem role=tool */
  toolPayload: Record<string, unknown>
}

function clampTitle(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE_TITLE_LEN)
}

function clampDetail(s: string): string {
  return s.trim().slice(0, MAX_NOTE_DETAIL_LEN)
}

function parseTags(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
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
  return out.length ? out : undefined
}

/**
 * Normaliza o JSON de argumentos de `save_memory`: a API pode rejeitar `replace_of_note_id: null`
 * ao reenviar mensagens; remover o campo equivale a “nova nota”.
 */
export function sanitizeSaveMemoryArguments(argsJson: string): string {
  try {
    const o = JSON.parse(argsJson) as Record<string, unknown>
    const v = o.replace_of_note_id
    if (v === null || v === undefined) {
      delete o.replace_of_note_id
    } else if (typeof v === 'string' && !v.trim()) {
      delete o.replace_of_note_id
    }
    return JSON.stringify(o)
  } catch {
    return argsJson
  }
}

export function sanitizeSaveMemoryToolCalls(
  toolCalls: LlmToolCallMessage[],
): LlmToolCallMessage[] {
  return toolCalls.map((tc) => {
    const name = tc.function?.name ?? ''
    if (name !== 'save_memory') return tc
    return {
      ...tc,
      function: {
        ...tc.function,
        arguments: sanitizeSaveMemoryArguments(tc.function.arguments ?? '{}'),
      },
    }
  })
}

/**
 * Aplica um único `save_memory` à lista de notas (imutável).
 */
export function applyOneSaveMemory(
  notes: MemoryNote[],
  argsJson: string,
  sourceMessageId: string,
  newNoteId: string,
): SaveMemoryToolResult {
  let parsed: {
    title?: unknown
    detail?: unknown
    kind?: unknown
    tags?: unknown
    replace_of_note_id?: unknown
  }
  try {
    parsed = JSON.parse(argsJson) as typeof parsed
  } catch {
    return {
      notes,
      createdIds: [],
      toolPayload: { ok: false, error: 'JSON inválido nos argumentos.' },
    }
  }
  const title = clampTitle(
    typeof parsed.title === 'string' ? parsed.title : '',
  )
  const detail = clampDetail(
    typeof parsed.detail === 'string' ? parsed.detail : '',
  )
  if (!title.length && !detail.length) {
    return {
      notes,
      createdIds: [],
      toolPayload: { ok: false, error: 'title e detail vazios.' },
    }
  }
  const replaceId =
    typeof parsed.replace_of_note_id === 'string'
      ? parsed.replace_of_note_id.trim().slice(0, 64)
      : ''
  const now = Date.now()
  const nextTitle = title.length ? title : '(sem título)'

  let next = [...notes]

  if (replaceId.length) {
    const idx = next.findIndex((n) => n.id === replaceId)
    if (idx !== -1) {
      const prev = next[idx]
      const nextKind: MemoryKindId =
        parsed.kind !== undefined
          ? normalizeMemoryKind(parsed.kind)
          : prev.kind ?? inferMemoryKindFromTitle(nextTitle)
      const nextTags =
        parsed.tags !== undefined ? parseTags(parsed.tags) : prev.tags
      const updated: MemoryNote = {
        ...prev,
        title: nextTitle,
        detail,
        kind: nextKind,
        createdAt: now,
        sourceMessageId,
      }
      if (nextTags?.length) updated.tags = nextTags
      else delete updated.tags
      next[idx] = updated
      next.sort((a, b) => b.createdAt - a.createdAt)
      return {
        notes: next.slice(0, MAX_MEMORY_NOTES),
        createdIds: [replaceId],
        toolPayload: {
          ok: true,
          action: 'replaced',
          note_id: replaceId,
        },
      }
    }
  }

  const noteKind: MemoryKindId =
    parsed.kind !== undefined
      ? normalizeMemoryKind(parsed.kind)
      : inferMemoryKindFromTitle(nextTitle)
  const noteTags = parseTags(parsed.tags)
  const note: MemoryNote = {
    id: newNoteId,
    title: nextTitle,
    detail,
    kind: noteKind,
    createdAt: now,
    sourceMessageId,
    ...(noteTags?.length ? { tags: noteTags } : {}),
  }
  next = [note, ...next.filter((n) => n.id !== newNoteId)]
  next.sort((a, b) => b.createdAt - a.createdAt)
  next = next.slice(0, MAX_MEMORY_NOTES)

  return {
    notes: next,
    createdIds: [newNoteId],
    toolPayload: { ok: true, action: 'created', note_id: newNoteId },
  }
}

/**
 * Várias chamadas na mesma resposta — aplica em sequência sobre o mesmo estado.
 */
export function applySaveMemoryToolCalls(
  initialNotes: MemoryNote[],
  toolCalls: LlmToolCallMessage[],
  sourceMessageId: string,
  newId: () => string,
): {
  notes: MemoryNote[]
  allCreatedIds: string[]
  toolResponses: { tool_call_id: string; content: string }[]
} {
  let notes = [...initialNotes]
  const allCreatedIds: string[] = []
  const toolResponses: { tool_call_id: string; content: string }[] = []

  for (const call of toolCalls) {
    const name = call.function?.name ?? ''
    if (name !== 'save_memory') {
      toolResponses.push({
        tool_call_id: call.id,
        content: JSON.stringify({
          ok: false,
          error: `Ferramenta não suportada: ${name || '(sem nome)'}`,
        }),
      })
      continue
    }
    const r = applyOneSaveMemory(
      notes,
      call.function.arguments ?? '{}',
      sourceMessageId,
      newId(),
    )
    notes = r.notes
    allCreatedIds.push(...r.createdIds)
    toolResponses.push({
      tool_call_id: call.id,
      content: JSON.stringify(r.toolPayload),
    })
  }

  return { notes, allCreatedIds, toolResponses }
}

const MEMORY_BADGE_PREVIEW_MAX = 180

/** Texto curto para o badge (títulos ou trecho do detalhe). */
export function formatMemorySaveBadgePreview(
  notes: MemoryNote[],
  ids: string[],
): string {
  if (!ids.length) return ''
  const parts: string[] = []
  for (const id of ids) {
    const n = notes.find((x) => x.id === id)
    if (!n) continue
    const title = n.title.replace(/\s+/g, ' ').trim()
    const detail = n.detail.replace(/\s+/g, ' ').trim()
    const line =
      title && title !== '(sem título)'
        ? title
        : detail
          ? detail.length > 90
            ? `${detail.slice(0, 87)}…`
            : detail
          : ''
    if (line) parts.push(line)
  }
  if (!parts.length) return ''
  const s = parts.join(' · ')
  return s.length > MEMORY_BADGE_PREVIEW_MAX
    ? `${s.slice(0, MEMORY_BADGE_PREVIEW_MAX - 1)}…`
    : s
}
