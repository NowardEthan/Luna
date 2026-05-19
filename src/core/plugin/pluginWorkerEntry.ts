/// <reference lib="webworker" />
import type { LunaPluginApi } from '../../../packages/luna-sdk/src'
import type {
  HostToWorkerMessage,
  WorkerToHostMessage,
} from './pluginWorkerProtocol'

const toolHandlers = new Map<
  string,
  (args: Record<string, unknown>) => Promise<unknown>
>()

let pluginId = ''
let permissions = new Set<string>()
const settingsCache: Record<string, unknown> = {}

function post(msg: WorkerToHostMessage): void {
  self.postMessage(msg)
}

function assertPerm(action: string, perm: string): void {
  if (!permissions.has(perm)) {
    throw new Error(
      `Plugin «${pluginId}» não tem permissão «${perm}» para ${action}.`,
    )
  }
}

function createApi(id: string, perms: string[]): LunaPluginApi {
  pluginId = id
  permissions = new Set(perms)

  return {
    id,
    registerTool: (tool) => {
      assertPerm('registerTool', 'tools')
      const t = tool as {
        name: string
        description?: string
        parameters?: Record<string, unknown>
        schema?: { function?: { description?: string; parameters?: Record<string, unknown> } }
        handler: (args: Record<string, unknown>) => Promise<unknown>
      }
      if (!t?.name || typeof t.handler !== 'function') {
        throw new Error('registerTool requer name e handler.')
      }
      toolHandlers.set(t.name, t.handler)
      post({
        type: 'registerTool',
        name: t.name,
        description:
          t.description ?? t.schema?.function?.description,
        parameters:
          t.parameters ?? t.schema?.function?.parameters,
      })
    },
    registerPanel: () => {
      post({ type: 'unsupported', action: 'registerPanel' })
    },
    registerCommand: () => {
      post({ type: 'unsupported', action: 'registerCommand' })
    },
    registerSettings: () => {
      post({ type: 'unsupported', action: 'registerSettings' })
    },
    registerShortcut: () => {
      post({ type: 'unsupported', action: 'registerShortcut' })
    },
    on: (event, handler) => {
      assertPerm('on', 'hooks')
      post({ type: 'subscribe', event })
      const listener = (e: MessageEvent<HostToWorkerMessage>) => {
        const msg = e.data
        if (msg.type === 'event' && msg.event === event) {
          handler(msg.payload)
        }
      }
      self.addEventListener('message', listener)
      return () => self.removeEventListener('message', listener)
    },
    readSetting: <T,>(key: string, fallback?: T): T => {
      const v = settingsCache[key]
      return (v !== undefined ? v : fallback) as T
    },
    writeSetting: (key, value) => {
      settingsCache[key] = value
      post({ type: 'writeSetting', key, value })
    },
    storage: {
      get: async (key) => {
        assertPerm('storage', 'storage')
        const callId = `sg-${Date.now()}-${Math.random()}`
        return new Promise((resolve) => {
          const listener = (e: MessageEvent<HostToWorkerMessage>) => {
            const msg = e.data
            if (msg.type === 'storageGetResult' && msg.callId === callId) {
              self.removeEventListener('message', listener)
              resolve(msg.value)
            }
          }
          self.addEventListener('message', listener)
          post({ type: 'storageGet', callId, key })
        })
      },
      set: async (key, value) => {
        assertPerm('storage', 'storage')
        const callId = `ss-${Date.now()}-${Math.random()}`
        return new Promise((resolve) => {
          const listener = (e: MessageEvent<HostToWorkerMessage>) => {
            const msg = e.data
            if (msg.type === 'storageSetResult' && msg.callId === callId) {
              self.removeEventListener('message', listener)
              resolve()
            }
          }
          self.addEventListener('message', listener)
          post({ type: 'storageSet', callId, key, value })
        })
      },
    },
  }
}

self.onmessage = async (event: MessageEvent<HostToWorkerMessage>) => {
  const msg = event.data
  if (msg.type === 'activate') {
    toolHandlers.clear()
    Object.keys(settingsCache).forEach((k) => delete settingsCache[k])
    Object.assign(settingsCache, msg.settings)
    try {
      const mod = (await import(/* @vite-ignore */ msg.entryUrl)) as {
        activate?: (api: LunaPluginApi) => void | Promise<void>
      }
      if (mod.activate) {
        await mod.activate(createApi(msg.pluginId, msg.permissions))
      }
      post({ type: 'ready' })
    } catch (err) {
      post({
        type: 'error',
        message: err instanceof Error ? err.message : 'Falha ao activar no worker.',
      })
    }
    return
  }

  if (msg.type === 'deactivate') {
    toolHandlers.clear()
    return
  }

  if (msg.type === 'toolCall') {
    const handler = toolHandlers.get(msg.name)
    if (!handler) {
      post({
        type: 'toolResult',
        callId: msg.callId,
        ok: false,
        content: JSON.stringify({ ok: false, error: 'Ferramenta desconhecida.' }),
      })
      return
    }
    try {
      const raw = await handler(msg.args)
      const content =
        typeof raw === 'string' ? raw : JSON.stringify(raw ?? { ok: true })
      post({
        type: 'toolResult',
        callId: msg.callId,
        ok: true,
        content,
      })
    } catch (err) {
      post({
        type: 'toolResult',
        callId: msg.callId,
        ok: false,
        content: JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : 'Erro na ferramenta.',
        }),
      })
    }
  }
}
