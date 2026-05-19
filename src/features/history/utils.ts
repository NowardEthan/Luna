import type { Conversation } from '../../types/chat'

export function formatUpdated(ts: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(ts)
}

export function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    const ap = a.pinned ? 1 : 0
    const bp = b.pinned ? 1 : 0
    if (ap !== bp) return bp - ap
    return b.updatedAt - a.updatedAt
  })
}

export function matchesSearch(c: Conversation, q: string): boolean {
  if (!q) return true
  const last = [...c.messages]
    .reverse()
    .find((m) => m.role === 'user' || m.role === 'assistant')
  const preview = last?.text?.slice(0, 200) ?? ''
  return (
    c.title.toLowerCase().includes(q) ||
    preview.toLowerCase().includes(q)
  )
}

export function rowShell(selected: boolean): string {
  return `flex flex-col rounded-md ring-1 transition-colors ${
    selected
      ? 'bg-accent/10 ring-accent/30'
      : 'ring-transparent hover:bg-white/[0.03] hover:ring-line'
  }`
}
