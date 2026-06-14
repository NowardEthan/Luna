import { bridgeLlmChat, bridgeVisionDescribe } from './lunaBridge'
import { isLunaServerBridgeAvailable } from './lunaServer/config'

export type LlmToolCallMessage = {
  id: string
  type: string
  function: { name: string; arguments: string }
}

/** Mensagens aceites pelo endpoint de chat (incl. tool / assistant com tool_calls). */
export type LlmApiMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | {
      role: 'assistant'
      content: string | null
      tool_calls?: LlmToolCallMessage[]
      /** DeepSeek V4 Pro na Together: obrigatório repassar após tool_calls */
      reasoning_content?: string
      /** Groq gpt-oss: repassar após tool_calls */
      reasoning?: string
    }
  | { role: 'tool'; tool_call_id: string; content: string }

export type { LlmProviderId } from '../types/chat'
import type { LlmProviderId } from '../types/chat'

export type LlmSelection = {
  provider: LlmProviderId
  model: string
}

export type LlmChatOk = {
  ok: true
  text: string
  toolCalls?: LlmToolCallMessage[]
  reasoningContent?: string
  provider?: LlmProviderId
  usedFallback?: boolean
  fallbackNote?: string
}
export type LlmChatErr = {
  ok: false
  error: string
  /** Tentativas falhadas (provedor · modelo · erro). */
  attemptErrors?: string[]
}

export type LlmChatResult = LlmChatOk | LlmChatErr

/** @deprecated use LlmToolCallMessage */
export type GroqToolCallMessage = LlmToolCallMessage
/** @deprecated use LlmApiMessage */
export type GroqApiMessage = LlmApiMessage
/** @deprecated use LlmChatResult */
export type GroqChatResult = LlmChatResult

function llmBridge() {
  if (typeof window === 'undefined') return undefined
  return window.llm ?? window.together
}

export function isLlmAvailable(): boolean {
  if (isLunaServerBridgeAvailable()) return true
  const b = llmBridge()
  return typeof b?.chat === 'function' || typeof b?.chatStream === 'function'
}

/** @deprecated use isLlmAvailable */
export const isGroqAvailable = isLlmAvailable

export function splitDataUrl(
  dataUrl: string,
): { mime: string; dataBase64: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl.trim())
  if (!m) return null
  return { mime: m[1], dataBase64: m[2].replace(/\s/g, '') }
}

export type VisionDescribeOk = { ok: true; text: string }
export type VisionDescribeErr = { ok: false; error: string }

export async function visionDescribeImages(payload: {
  images: { mime: string; dataBase64: string }[]
  userCaption: string
}): Promise<VisionDescribeOk | VisionDescribeErr> {
  if (!isLlmAvailable()) {
    return {
      ok: false,
      error:
        'Análise de imagem indisponível — inicie `npm run dev` ou `npm run server`.',
    }
  }
  return bridgeVisionDescribe(payload)
}

export type CompleteLlmOptions = {
  temperature?: number
  maxCompletionTokens?: number
  tools?: unknown[]
  tool_choice?: 'auto' | 'none' | 'required' | Record<string, unknown>
  /** Por defeito false no servidor (menos latência); true para planeamento complexo */
  reasoningEnabled?: boolean
  /** Escolha explícita na UI (provedor + modelo do .env) */
  llmSelection?: LlmSelection
  /** Permite abortar a requisição LLM em andamento */
  signal?: AbortSignal
}

export async function completeLlmChat(
  messages: LlmApiMessage[],
  options?: CompleteLlmOptions,
): Promise<LlmChatResult> {
  if (!isLlmAvailable()) {
    return {
      ok: false,
      error:
        'O LLM está indisponível. Rode `npm run dev` (servidor + Electron) ou `npm run server` num terminal à parte.',
    }
  }
  return bridgeLlmChat(messages, options)
}

/** @deprecated use completeLlmChat */
export const completeGroqChat = completeLlmChat
