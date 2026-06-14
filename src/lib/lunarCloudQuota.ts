import type { LunaPlanId } from './firebase/entitlements'
import type { Conversation } from '../types/chat'
import type { StoredState } from '../features/chat/state/conversationPersistence'
import { foldersForCloudSync, conversationsForCloudSync } from '../features/sync/cloudSyncFolders'
import { formatBytes } from './formatBytes'

/** Limite de armazenamento na nuvem por plano (bytes). */
export const LUNA_CLOUD_QUOTA_BYTES: Record<LunaPlanId, number> = {
  free: 25 * 1024 * 1024,
  plus: 1 * 1024 * 1024 * 1024,
  pro: 5 * 1024 * 1024 * 1024,
  byok: 5 * 1024 * 1024 * 1024,
  team: 50 * 1024 * 1024 * 1024,
}

export type CloudQuotaSnapshot = {
  plan: LunaPlanId
  usedBytes: number
  limitBytes: number
  availableBytes: number
  percentUsed: number
  atLimit: boolean
  nearLimit: boolean
}

export const CLOUD_QUOTA_EXCEEDED_MESSAGE =
  'Limite de armazenamento na nuvem atingido. Liberta espaço (remove conversas da nuvem) ou actualiza o plano.'

export function getCloudQuotaLimitBytes(plan: LunaPlanId): number {
  return LUNA_CLOUD_QUOTA_BYTES[plan] ?? LUNA_CLOUD_QUOTA_BYTES.free
}

export function estimateConversationBytes(c: Conversation): number {
  try {
    return JSON.stringify(c).length
  } catch {
    return 0
  }
}

/** Tamanho aproximado do que seria enviado ao Firestore a partir do estado local. */
export function estimateStateCloudBytes(
  state: Pick<StoredState, 'conversations' | 'folders'>,
  memoryRaw?: string,
): number {
  const conversations = conversationsForCloudSync(state.conversations)
  const folders = foldersForCloudSync(state.folders, state.conversations)

  let bytes = JSON.stringify(folders).length
  for (const c of conversations) {
    bytes += estimateConversationBytes(c)
  }
  if (memoryRaw !== undefined) {
    bytes += memoryRaw.length
  }
  bytes += 2048
  return bytes
}

export function buildQuotaSnapshot(
  plan: LunaPlanId,
  usedBytes: number,
): CloudQuotaSnapshot {
  const limitBytes = getCloudQuotaLimitBytes(plan)
  const availableBytes = Math.max(0, limitBytes - usedBytes)
  const percentUsed =
    limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0

  return {
    plan,
    usedBytes,
    limitBytes,
    availableBytes,
    percentUsed,
    atLimit: usedBytes >= limitBytes,
    nearLimit: usedBytes >= limitBytes * 0.85,
  }
}

export function checkStateFitsQuota(
  plan: LunaPlanId,
  state: Pick<StoredState, 'conversations' | 'folders'>,
  memoryRaw?: string,
): { ok: boolean; snapshot: CloudQuotaSnapshot; message?: string } {
  const usedBytes = estimateStateCloudBytes(state, memoryRaw)
  const snapshot = buildQuotaSnapshot(plan, usedBytes)
  if (snapshot.atLimit) {
    return {
      ok: false,
      snapshot,
      message: `${CLOUD_QUOTA_EXCEEDED_MESSAGE} (${formatBytes(usedBytes)} / ${formatBytes(snapshot.limitBytes)}).`,
    }
  }
  return { ok: true, snapshot }
}

export function planLabel(plan: LunaPlanId): string {
  switch (plan) {
    case 'pro':
      return 'Pro'
    case 'team':
      return 'Team'
    default:
      return 'Free'
  }
}
