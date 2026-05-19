import { eventBus } from '../../core/events/EventBus'
import { cloudSyncService } from '../sync/cloudSyncService'

let installed = false

/** Regista listeners globais da Conta Lunar (sync, etc.). */
export function installLunarAccountListeners(): () => void {
  if (installed) return () => undefined
  installed = true

  const unsubs = [
    eventBus.on('auth:signed-in', () => {
      void cloudSyncService.pullFromCloud()
    }),
    eventBus.on('auth:signed-out', () => {
      cloudSyncService.reset()
    }),
  ]

  return () => {
    unsubs.forEach((u) => u())
    installed = false
  }
}
