import { eventBus } from '../../core/events/EventBus'
import { registerLunaIdeTools, unregisterLunaIdeTools } from './tools'

export type LunaIdeTrustedBridge = {
  registerTools: () => void
  unregisterTools: () => void
  toggleWorkbench: () => void
  setWorkbenchToggle: (handler: (() => void) | null) => void
  notifyActive: (active: boolean) => void
}

declare global {
  interface Window {
    __lunaTrustedIde?: LunaIdeTrustedBridge
  }
  // Acedido via `globalThis.__lunaTrustedIde` — precisa de declaração `var`.
  // eslint-disable-next-line no-var
  var __lunaTrustedIde: LunaIdeTrustedBridge | undefined
}

let workbenchToggle: (() => void) | null = null

/** Ponte para o pacote remoto `luna-ide` (zip da marketplace). */
export function installLunaIdeTrustedBridge(): void {
  const bridge: LunaIdeTrustedBridge = {
    registerTools: registerLunaIdeTools,
    unregisterTools: unregisterLunaIdeTools,
    toggleWorkbench: () => workbenchToggle?.(),
    setWorkbenchToggle: (handler) => {
      workbenchToggle = handler
    },
    notifyActive: (active) => {
      eventBus.emit('luna-ide:availability', { active })
    },
  }
  globalThis.__lunaTrustedIde = bridge
}

export function setLunaIdeWorkbenchToggle(handler: (() => void) | null): void {
  workbenchToggle = handler
}
