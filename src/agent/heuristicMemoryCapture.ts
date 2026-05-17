import { inferMemoryKindFromTitle } from '../lib/memoryKinds'
import {
  extractMemoryCandidates,
  type MemoryCandidate,
} from '../lib/memoryHeuristics'
import { applyOneSaveMemory } from '../lib/saveMemoryTool'
import type { MemoryNote } from '../types/memory'

function noteCoversCandidate(notes: MemoryNote[], c: MemoryCandidate): boolean {
  const needle = c.detail.toLowerCase().slice(0, 48)
  if (needle.length < 10) return false
  return notes.some((n) => {
    const blob = `${n.title} ${n.detail}`.toLowerCase()
    return blob.includes(needle) || needle.includes(blob.slice(0, 48))
  })
}

/**
 * Grava factos óbvios sem segunda chamada LLM (complementa o modelo).
 */
export function applyHeuristicMemoryCapture(
  userText: string,
  notes: MemoryNote[],
  sourceMessageId: string,
  nextId: () => string,
): { notes: MemoryNote[]; saved: boolean; savedCount: number } {
  const candidates = extractMemoryCandidates(userText)
  if (!candidates.length) {
    return { notes, saved: false, savedCount: 0 }
  }

  let next = [...notes]
  let savedCount = 0

  for (const c of candidates) {
    if (noteCoversCandidate(next, c)) continue
    const kind = c.kind ?? inferMemoryKindFromTitle(c.title)
    const r = applyOneSaveMemory(
      next,
      JSON.stringify({ title: c.title, detail: c.detail, kind }),
      sourceMessageId,
      nextId(),
    )
    const ok =
      r.toolPayload &&
      typeof r.toolPayload === 'object' &&
      (r.toolPayload as { ok?: boolean }).ok === true
    if (ok) {
      next = r.notes
      savedCount++
    }
  }

  return { notes: next, saved: savedCount > 0, savedCount }
}
