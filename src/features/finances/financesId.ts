export function newFinanceId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `fin-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function currentMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
