import { bridgeLlmChatStream } from './lunaBridge'
import { isLunaServerBridgeAvailable } from './lunaServer/config'
import type { CompleteLlmOptions, LlmApiMessage, LlmChatResult } from './togetherClient'

export type LlmStreamCallbacks = {
  onContent?: (delta: string, full: string) => void
  onReasoning?: (delta: string, full: string) => void
  onToolsPending?: () => void
}

function llmBridge() {
  if (typeof window === 'undefined') return undefined
  return window.llm ?? window.together
}

export function isLlmStreamingAvailable(): boolean {
  if (isLunaServerBridgeAvailable()) return true
  return typeof llmBridge()?.chatStream === 'function'
}

export async function completeLlmChatStream(
  messages: LlmApiMessage[],
  callbacks: LlmStreamCallbacks,
  options?: CompleteLlmOptions,
): Promise<LlmChatResult> {
  if (!isLlmStreamingAvailable()) {
    return {
      ok: false,
      error:
        'Streaming indisponível — inicie o servidor Luna (`npm run server`) ou o Electron.',
    }
  }
  return bridgeLlmChatStream(messages, callbacks, options)
}

export function readStreamingEnabled(): boolean {
  try {
    const stored = globalThis.localStorage?.getItem('luna-streaming-enabled')
    if (stored === '0') return false
    if (stored === '1') return true
  } catch {
    /* ignore */
  }
  return true
}

export function writeStreamingEnabled(enabled: boolean): void {
  try {
    globalThis.localStorage?.setItem(
      'luna-streaming-enabled',
      enabled ? '1' : '0',
    )
  } catch {
    /* ignore */
  }
}
