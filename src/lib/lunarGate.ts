import { getLunaAuth } from './firebase'
import { isRealLunarUser, readUsageMode } from './lunarAccount'
import type { LlmProviderId } from './llmModelSelection'
import { eventBus } from '../core/events/EventBus'

export function isLunarCloudSession(): boolean {
  if (readUsageMode() === 'offline') return false
  const user = getLunaAuth()?.currentUser ?? null
  return isRealLunarUser(user)
}

export function requiresLunarAccountForProvider(
  provider: LlmProviderId | string | undefined,
): boolean {
  return Boolean(provider && provider !== 'ollama')
}

export function blockCloudLlmIfNeeded(
  provider: LlmProviderId | string | undefined,
  reason?: string,
): boolean {
  if (!requiresLunarAccountForProvider(provider)) return false
  if (isLunarCloudSession()) return false
  eventBus.emit('lunar:auth-required', {
    reason:
      reason ??
      'Modelos online exigem Conta Lunar. Entre na nuvem ou escolha Ollama (offline).',
  })
  return true
}
