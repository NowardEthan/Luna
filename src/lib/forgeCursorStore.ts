import { useSyncExternalStore } from 'react'

export type ForgeCursorPosition = { line: number; column: number }

let cursor: ForgeCursorPosition = { line: 1, column: 1 }
const listeners = new Set<() => void>()
let pending: ForgeCursorPosition | null = null
let rafId = 0

function emit() {
  for (const fn of listeners) {
    fn()
  }
}

function flushPending() {
  rafId = 0
  if (!pending) return
  const next = pending
  pending = null
  if (cursor.line === next.line && cursor.column === next.column) return
  cursor = next
  emit()
}

export function getForgeCursor(): ForgeCursorPosition {
  return cursor
}

/** Actualiza posição do cursor — só a status bar re-renderiza (rAF durante seleção). */
export function setForgeCursor(pos: ForgeCursorPosition): void {
  pending = pos
  if (rafId) return
  rafId = requestAnimationFrame(flushPending)
}

export function subscribeForgeCursor(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function useForgeCursor(): ForgeCursorPosition {
  return useSyncExternalStore(subscribeForgeCursor, getForgeCursor, getForgeCursor)
}
