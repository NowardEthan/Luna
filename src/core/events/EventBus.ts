export type LunaEventMap = {
  'agent:turn:start': { convId: string; assistantMsgId: string }
  'agent:turn:complete': { convId: string; assistantMsgId: string; ok: boolean }
  'agent:tool:start': { convId: string; tool: string }
  'agent:tool:complete': { convId: string; tool: string; ok: boolean }
  'workspace:patch:proposed': { path: string; proposalId: string }
  'workspace:patch:accepted': { path: string; proposalId: string }
  'workspace:patch:rejected': { path: string; proposalId: string }
  'rag:sync:complete': {
    paths: string[]
    ok: boolean
    chunksIndexed: number
  }
  'conversation:created': { id: string }
  'conversation:selected': { id: string }
  'plugin:activated': { pluginId: string }
  'plugin:deactivated': { pluginId: string }
  'plugin:discover:complete': { count: number }
  'plugin:installed': { pluginId: string }
  'plugin:settings:registered': { pluginId: string }
  'plugin:settings:changed': { pluginId: string; key: string }
  'plugin:shortcut:registered': { pluginId: string; shortcutId: string }
  'theme:changed': { id: string }
  'auth:signed-in': {
    uid: string
    email: string | null
    isAnonymous: boolean
  }
  'auth:signed-out': Record<string, never>
  'lunar:auth-required': { reason?: string }
  'lunar:sync:start': Record<string, never>
  'lunar:sync:complete': { ok: boolean; error?: string }
}

type Handler<T> = (payload: T) => void

class EventBusImpl {
  private readonly listeners = new Map<
    keyof LunaEventMap,
    Set<Handler<unknown>>
  >()

  on<K extends keyof LunaEventMap>(
    event: K,
    handler: Handler<LunaEventMap[K]>,
  ): () => void {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    set.add(handler as Handler<unknown>)
    return () => set!.delete(handler as Handler<unknown>)
  }

  emit<K extends keyof LunaEventMap>(event: K, payload: LunaEventMap[K]): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const h of set) {
      try {
        ;(h as Handler<LunaEventMap[K]>)(payload)
      } catch (err) {
        console.error(`[Luna EventBus] Erro em ${event}:`, err)
      }
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}

export const eventBus = new EventBusImpl()
