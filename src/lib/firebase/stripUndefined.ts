/** FieldValue do Firestore (ex.: serverTimestamp) — não percorrer. */
function isFirestoreFieldValue(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_methodName' in (value as object)
  )
}

/**
 * Firestore rejeita `undefined` em qualquer campo. Remove recursivamente.
 */
export function stripUndefinedForFirestore<T>(value: T): T {
  if (value === undefined || value === null) {
    return value
  }
  if (typeof value !== 'object') {
    return value
  }
  if (isFirestoreFieldValue(value)) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedForFirestore(item)) as T
  }
  const out: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry === undefined) continue
    out[key] = stripUndefinedForFirestore(entry)
  }
  return out as T
}
