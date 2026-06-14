import type { Conversation } from '../../types/chat'
import { isCloudSyncEnabled } from '../../types/cloudSync'

/** Espera após a última alteração antes de enviar (1 min). */
export const SYNC_DEBOUNCE_MS = 60_000

/** Intervalo mínimo entre dois uploads. */
export const SYNC_MIN_INTERVAL_MS = 30_000

/** Força envio se houver alterações pendentes há este tempo (5 min). */
export const SYNC_MAX_WAIT_MS = 5 * 60_000

export function isConversationStale(c: Conversation): boolean {
  if (!isCloudSyncEnabled(c.cloudSync)) return false
  const last = c.cloudSync?.lastSyncedAt
  if (last == null) return true
  return c.updatedAt > last
}
