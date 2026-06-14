import { eventBus } from '../../core/events/EventBus'
import { registerLunaFinancesTools, unregisterLunaFinancesTools } from './tools'

export type LunaFinancesTrustedBridge = {
  registerTools: () => void
  unregisterTools: () => void
  openFinancesView: () => void
  setOpenFinancesHandler: (handler: (() => void) | null) => void
  notifyActive: (active: boolean) => void
}

declare global {
  interface Window {
    __lunaTrustedFinances?: LunaFinancesTrustedBridge
  }
  // Acedido via `globalThis.__lunaTrustedFinances` — precisa de declaração `var`.
  // eslint-disable-next-line no-var
  var __lunaTrustedFinances: LunaFinancesTrustedBridge | undefined
}

let openFinancesHandler: (() => void) | null = null

export function installLunaFinancesTrustedBridge(): void {
  const bridge: LunaFinancesTrustedBridge = {
    registerTools: registerLunaFinancesTools,
    unregisterTools: unregisterLunaFinancesTools,
    openFinancesView: () => openFinancesHandler?.(),
    setOpenFinancesHandler: (handler) => {
      openFinancesHandler = handler
    },
    notifyActive: (active) => {
      eventBus.emit('luna-finances:availability', { active })
    },
  }
  globalThis.__lunaTrustedFinances = bridge
}

export function setLunaFinancesOpenHandler(handler: (() => void) | null): void {
  openFinancesHandler = handler
}
