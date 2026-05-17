import type { Conversation } from '../types/chat'
import { bridgeRag } from './lunaBridge'

export function isChatMemoryAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    (typeof window.chatMemory?.sync === 'function' ||
      Boolean(window.lunaServer?.baseUrl))
  )
}

type MinimalMsg = {
  id: string
  role: string
  text: string
  visionDescription?: string
}

type MinimalConv = {
  id: string
  title: string
  messages: MinimalMsg[]
  memory?: { rollingSummary: string }
}

export function serializeConversationsForMemory(
  list: Conversation[],
): MinimalConv[] {
  return list.map((c) => ({
    id: c.id,
    title: c.title,
    messages: c.messages.map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text,
      ...(m.visionDescription
        ? { visionDescription: m.visionDescription }
        : {}),
    })),
    ...(c.memory?.rollingSummary
      ? { memory: { rollingSummary: c.memory.rollingSummary } }
      : {}),
  }))
}

export async function syncChatMemoryFromConversations(
  list: Conversation[],
): Promise<void> {
  if (!isChatMemoryAvailable()) return
  const payload = { conversations: serializeConversationsForMemory(list) }
  try {
    await bridgeRag(
      () => window.chatMemory!.sync(payload),
      '/v1/memory/sync',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )
  } catch {
    /* rede / servidor */
  }
}

export async function retrieveChatMemorySemantic(
  query: string,
): Promise<{ ok: boolean; text: string; error?: string }> {
  if (!isChatMemoryAvailable()) {
    return { ok: true, text: '' }
  }
  try {
    return await bridgeRag(
      () => window.chatMemory!.retrieve(query),
      '/v1/memory/retrieve',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      },
    )
  } catch (e) {
    return {
      ok: false,
      text: '',
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
