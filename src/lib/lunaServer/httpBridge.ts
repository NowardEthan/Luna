import type { LlmStreamCallbacks } from '../llmStreamClient'
import type {
  LlmChatResult,
  LlmSelection,
  LlmApiMessage,
} from '../togetherClient'
import { eventBus } from '../../core/events/EventBus'
import { getLunarAuthHeaders } from '../lunarAuthHeaders'
import { lunaServerBaseUrl } from './config'

async function handleAuthResponse(res: Response): Promise<void> {
  if (res.status === 401) {
    eventBus.emit('lunar:auth-required', {
      reason: 'Inicie sessão com a Conta Lunar para usar modelos online.',
    })
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const headers = await getLunarAuthHeaders()
  const res = await fetch(`${lunaServerBaseUrl()}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  await handleAuthResponse(res)
  return (await res.json()) as T
}

async function getJson<T>(path: string): Promise<T> {
  const headers = await getLunarAuthHeaders()
  const res = await fetch(`${lunaServerBaseUrl()}${path}`, { headers })
  await handleAuthResponse(res)
  return (await res.json()) as T
}

export async function lunaServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${lunaServerBaseUrl()}/health`, {
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { ok?: boolean }
    return data.ok === true
  } catch {
    return false
  }
}

export async function lunaServerListModels() {
  return getJson<
    | { ok: true; models: unknown[] }
    | { ok: false; error: string }
  >('/v1/models')
}

export async function lunaServerChat(payload: Record<string, unknown>) {
  return postJson<LlmChatResult>('/v1/llm/chat', payload)
}

export async function lunaServerVisionDescribe(payload: {
  images: { mime: string; dataBase64: string }[]
  userCaption: string
}) {
  return postJson<{ ok: true; text: string } | { ok: false; error: string }>(
    '/v1/llm/vision',
    payload,
  )
}

export async function lunaServerChatStream(
  payload: Record<string, unknown>,
  callbacks: LlmStreamCallbacks,
): Promise<LlmChatResult> {
  const headers = await getLunarAuthHeaders()
  const res = await fetch(`${lunaServerBaseUrl()}/v1/llm/chat/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!res.ok || !res.body) {
    await handleAuthResponse(res)
    let err = `HTTP ${res.status}`
    try {
      const j = (await res.json()) as { error?: string }
      if (j.error) err = j.error
    } catch {
      /* ignore */
    }
    return { ok: false, error: err }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalResult: LlmChatResult | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const dataStr = trimmed.slice(5).trim()
      if (!dataStr) continue
      let evt: Record<string, unknown>
      try {
        evt = JSON.parse(dataStr) as Record<string, unknown>
      } catch {
        continue
      }

      if (evt.type === 'content') {
        callbacks.onContent?.(
          String(evt.delta ?? ''),
          String(evt.full ?? ''),
        )
      } else if (evt.type === 'reasoning') {
        callbacks.onReasoning?.(
          String(evt.delta ?? ''),
          String(evt.full ?? ''),
        )
      } else if (evt.type === 'tools_pending') {
        callbacks.onToolsPending?.()
      } else if (evt.type === 'done' && evt.result) {
        finalResult = evt.result as LlmChatResult
      } else if (evt.type === 'error') {
        return { ok: false, error: String(evt.error ?? 'Erro no stream') }
      }
    }
  }

  if (finalResult) return finalResult
  return { ok: false, error: 'Stream terminou sem resultado.' }
}

export function buildLlmPayload(
  messages: LlmApiMessage[],
  options?: {
    temperature?: number
    maxCompletionTokens?: number
    tools?: unknown[]
    tool_choice?: unknown
    reasoningEnabled?: boolean
    llmSelection?: LlmSelection
  },
): Record<string, unknown> {
  return {
    messages,
    ...(typeof options?.temperature === 'number' &&
    !Number.isNaN(options.temperature)
      ? { temperature: options.temperature }
      : {}),
    ...(typeof options?.maxCompletionTokens === 'number' &&
    !Number.isNaN(options.maxCompletionTokens)
      ? { max_completion_tokens: options.maxCompletionTokens }
      : {}),
    ...(options?.tools && options.tools.length ? { tools: options.tools } : {}),
    ...(options?.tool_choice !== undefined
      ? { tool_choice: options.tool_choice }
      : {}),
    ...(options?.reasoningEnabled !== undefined
      ? { reasoning_enabled: options.reasoningEnabled }
      : {}),
    ...(options?.llmSelection
      ? {
          llm_provider: options.llmSelection.provider,
          llm_model: options.llmSelection.model,
        }
      : {}),
  }
}
