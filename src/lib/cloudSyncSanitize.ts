import type { CloudSyncMeta } from '../types/cloudSync'

export function sanitizeCloudSyncMeta(raw: unknown): CloudSyncMeta | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  if (o.enabled !== true) return undefined
  const lastSyncedAt =
    typeof o.lastSyncedAt === 'number' && !Number.isNaN(o.lastSyncedAt)
      ? o.lastSyncedAt
      : undefined
  const lastError =
    typeof o.lastError === 'string' && o.lastError.length > 0
      ? o.lastError.slice(0, 500)
      : undefined
  return {
    enabled: true,
    ...(lastSyncedAt != null ? { lastSyncedAt } : {}),
    ...(lastError ? { lastError } : {}),
  }
}
