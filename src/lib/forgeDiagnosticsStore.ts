import { useSyncExternalStore } from 'react'

export type ForgeDiagnostic = {
  path: string
  line: number
  column: number
  message: string
  severity: 'error' | 'warning' | 'info'
}

const EMPTY_SNAPSHOT: ForgeDiagnostic[] = []

const byPath = new Map<string, ForgeDiagnostic[]>()
const listeners = new Set<() => void>()

let cachedSnapshot: ForgeDiagnostic[] = EMPTY_SNAPSHOT
let cachedCount = 0

function emit() {
  for (const fn of listeners) fn()
}

function diagnosticsEqual(
  a: ForgeDiagnostic[],
  b: ForgeDiagnostic[],
): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!
    const y = b[i]!
    if (
      x.path !== y.path ||
      x.line !== y.line ||
      x.column !== y.column ||
      x.message !== y.message ||
      x.severity !== y.severity
    ) {
      return false
    }
  }
  return true
}

function rebuildSnapshot(): void {
  if (byPath.size === 0) {
    cachedSnapshot = EMPTY_SNAPSHOT
    cachedCount = 0
    return
  }

  const all: ForgeDiagnostic[] = []
  for (const items of byPath.values()) {
    all.push(...items)
  }
  all.sort((a, b) => {
    if (a.path !== b.path) return a.path.localeCompare(b.path)
    return a.line - b.line
  })

  if (diagnosticsEqual(all, cachedSnapshot)) return

  cachedSnapshot = all
  cachedCount = all.length
}

function getAllDiagnosticsSnapshot(): ForgeDiagnostic[] {
  return cachedSnapshot
}

function getDiagnosticCountSnapshot(): number {
  return cachedCount
}

export function setFileDiagnostics(
  path: string,
  items: ForgeDiagnostic[],
): void {
  const prev = byPath.get(path)
  if (prev && diagnosticsEqual(prev, items)) return

  if (items.length === 0) {
    if (!byPath.has(path)) return
    byPath.delete(path)
  } else {
    byPath.set(path, items)
  }

  const before = cachedSnapshot
  rebuildSnapshot()
  if (before !== cachedSnapshot) emit()
}

export function clearFileDiagnostics(path: string): void {
  if (!byPath.delete(path)) return
  const before = cachedSnapshot
  rebuildSnapshot()
  if (before !== cachedSnapshot) emit()
}

export function clearAllDiagnostics(): void {
  if (byPath.size === 0) return
  byPath.clear()
  const before = cachedSnapshot
  rebuildSnapshot()
  if (before !== cachedSnapshot) emit()
}

/** Snapshot estável para leitura fora de React (evitar recriar arrays). */
export function getAllDiagnostics(): readonly ForgeDiagnostic[] {
  return cachedSnapshot
}

export function getDiagnosticCount(): number {
  return cachedCount
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function useForgeDiagnostics(): readonly ForgeDiagnostic[] {
  return useSyncExternalStore(
    subscribe,
    getAllDiagnosticsSnapshot,
    getAllDiagnosticsSnapshot,
  )
}

export function useForgeDiagnosticCount(): number {
  return useSyncExternalStore(
    subscribe,
    getDiagnosticCountSnapshot,
    getDiagnosticCountSnapshot,
  )
}
