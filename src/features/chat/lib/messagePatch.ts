import type { Conversation, Message, ReasoningSegment } from '../../../types/chat'

export function upsertReasoningSegment(
  segments: ReasoningSegment[] | undefined,
  patch: ReasoningSegment,
): ReasoningSegment[] {
  const list = [...(segments ?? [])]
  const idx = list.findIndex((s) => s.round === patch.round)
  const entry: ReasoningSegment = {
    ...(idx >= 0 ? list[idx] : { round: patch.round, text: '' }),
    ...patch,
  }
  if (idx >= 0) list[idx] = entry
  else list.push(entry)
  list.sort((a, b) => a.round - b.round)
  return list
}

export function patchAssistantMessage(
  convId: string,
  assistantMsgId: string,
  updateConversation: (
    id: string,
    fn: (c: Conversation) => Conversation,
  ) => void,
  patch: (m: Message) => Message,
) {
  updateConversation(convId, (c) => ({
    ...c,
    messages: c.messages.map((m) =>
      m.id === assistantMsgId ? patch(m) : m,
    ),
    updatedAt: Date.now(),
  }))
}
