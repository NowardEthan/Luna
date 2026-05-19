import type { PluginManifest } from '../../../packages/luna-sdk/src'
import { eventBus, type LunaEventMap } from '../events/EventBus'
import type {
  HostToWorkerMessage,
  WorkerToHostMessage,
} from './pluginWorkerProtocol'
import { resolvePluginEntryUrl } from './paths'

export type WorkerToolRegistration = {
  localName: string
  description?: string
  parameters?: Record<string, unknown>
}

export type PluginWorkerHostCallbacks = {
  onRegisterTool: (
    spec: WorkerToolRegistration & {
      invoke: (args: Record<string, unknown>) => Promise<{
        ok: boolean
        content: string
      }>
    },
  ) => void
  onWriteSetting: (key: string, value: unknown) => void
  readAllSettings: () => Record<string, unknown>
  storageGet: (key: string) => Promise<string | null>
  storageSet: (key: string, value: string) => Promise<void>
}

/** Ponte para plugins não confiáveis — código corre num Web Worker isolado. */
export class PluginWorkerBridge {
  private worker: Worker | null = null
  private readonly manifest: PluginManifest
  private readonly callbacks: PluginWorkerHostCallbacks
  private entryBlobUrl: string | null = null
  private hookUnsubs: (() => void)[] = []
  private pendingTools = new Map<
    string,
    {
      resolve: (r: { ok: boolean; content: string }) => void
      reject: (e: Error) => void
    }
  >()
  private readyPromise: Promise<void> | null = null

  constructor(
    manifest: PluginManifest,
    callbacks: PluginWorkerHostCallbacks,
  ) {
    this.manifest = manifest
    this.callbacks = callbacks
  }

  async start(): Promise<void> {
    if (this.manifest.trusted === true) return

    const entryUrl = await resolvePluginEntryUrl(
      this.manifest,
      (url) => {
        this.entryBlobUrl = url
      },
    )

    const worker = new Worker(
      new URL('./pluginWorkerEntry.ts', import.meta.url),
      { type: 'module' },
    )
    this.worker = worker

    this.readyPromise = new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error('Timeout ao activar plugin no worker.'))
      }, 30_000)

      const onMessage = (event: MessageEvent<WorkerToHostMessage>) => {
        const msg = event.data
        switch (msg.type) {
          case 'ready':
            window.clearTimeout(timeout)
            worker.removeEventListener('message', onMessage)
            resolve()
            break
          case 'error':
            window.clearTimeout(timeout)
            worker.removeEventListener('message', onMessage)
            reject(new Error(msg.message))
            break
          default:
            break
        }
      }
      worker.addEventListener('message', onMessage)
    })

    worker.addEventListener('message', (event) => {
      this.handleMessage(event.data)
    })

    this.post({
      type: 'activate',
      pluginId: this.manifest.id,
      entryUrl,
      permissions: this.manifest.permissions ?? [],
      settings: this.callbacks.readAllSettings(),
    })

    await this.readyPromise
  }

  async stop(): Promise<void> {
    this.post({ type: 'deactivate' })
    for (const u of this.hookUnsubs) u()
    this.hookUnsubs = []
    this.pendingTools.clear()
    this.worker?.terminate()
    this.worker = null
    if (this.entryBlobUrl) {
      URL.revokeObjectURL(this.entryBlobUrl)
      this.entryBlobUrl = null
    }
  }

  isActive(): boolean {
    return this.worker != null
  }

  invokeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ ok: boolean; content: string }> {
    if (!this.worker) {
      return Promise.resolve({
        ok: false,
        content: JSON.stringify({ ok: false, error: 'Worker inactivo.' }),
      })
    }
    const callId = `tc-${Date.now()}-${Math.random().toString(36).slice(2)}`
    return new Promise((resolve, reject) => {
      this.pendingTools.set(callId, { resolve, reject })
      this.post({ type: 'toolCall', callId, name, args })
      window.setTimeout(() => {
        if (this.pendingTools.has(callId)) {
          this.pendingTools.delete(callId)
          reject(new Error('Timeout na ferramenta do plugin.'))
        }
      }, 60_000)
    })
  }

  private post(msg: HostToWorkerMessage): void {
    this.worker?.postMessage(msg)
  }

  private handleMessage(msg: WorkerToHostMessage): void {
    switch (msg.type) {
      case 'registerTool':
        this.callbacks.onRegisterTool({
          localName: msg.name,
          description: msg.description,
          parameters: msg.parameters,
          invoke: (args) => this.invokeTool(msg.name, args),
        })
        break
      case 'subscribe': {
        const unsub = eventBus.on(
          msg.event as keyof LunaEventMap,
          (payload) => {
            this.post({ type: 'event', event: msg.event, payload })
          },
        )
        this.hookUnsubs.push(unsub)
        break
      }
      case 'storageGet':
        void this.callbacks.storageGet(msg.key).then((value) => {
          this.post({
            type: 'storageGetResult',
            callId: msg.callId,
            value,
          })
        })
        break
      case 'storageSet':
        void this.callbacks.storageSet(msg.key, msg.value).then(() => {
          this.post({
            type: 'storageSetResult',
            callId: msg.callId,
            ok: true,
          })
        })
        break
      case 'writeSetting':
        this.callbacks.onWriteSetting(msg.key, msg.value)
        break
      case 'toolResult': {
        const pending = this.pendingTools.get(msg.callId)
        if (pending) {
          this.pendingTools.delete(msg.callId)
          pending.resolve({ ok: msg.ok, content: msg.content })
        }
        break
      }
      case 'unsupported':
        console.warn(
          `[Luna] Plugin «${this.manifest.id}» tentou ${msg.action} no worker; use trusted:true para UI.`,
        )
        break
      case 'ready':
      case 'error':
        break
    }
  }
}
