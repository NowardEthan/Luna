/** Controlo de cancelamento do turno activo do agente. */
let active: AbortController | null = null

export class AgentTurnAbortedError extends Error {
  override name = 'AgentTurnAbortedError'

  constructor() {
    super('Turno do agente cancelado')
  }
}

export function beginAgentTurn(): AbortSignal {
  active?.abort()
  active = new AbortController()
  return active.signal
}

export function endAgentTurn(): void {
  active = null
}

export function cancelActiveAgentTurn(): boolean {
  if (!active) return false
  active.abort()
  return true
}

export function isAgentTurnInProgress(): boolean {
  return active != null && !active.signal.aborted
}

export function throwIfAgentTurnAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AgentTurnAbortedError()
}
