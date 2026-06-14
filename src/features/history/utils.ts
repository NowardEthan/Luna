import type { Conversation } from '../../types/chat'
import { lunaListRowClass } from '../../lib/lunaVisual'
import i18n from '../../i18n'

const LOCALE_MAP: Record<string, string> = {
  pt: 'pt-BR',
  en: 'en-US',
}

export function formatUpdated(ts: number): string {
  const lng = i18n.language?.slice(0, 2) ?? 'en'
  return new Intl.DateTimeFormat(LOCALE_MAP[lng] ?? 'en-US', {
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
  const tagText = (c.tags ?? []).join(' ')
  return (
    c.title.toLowerCase().includes(q) ||
    preview.toLowerCase().includes(q) ||
    tagText.toLowerCase().includes(q)
  )
}

/** Pesquisa por texto + filtro por etiquetas (qualquer etiqueta activa). */
export function matchesHistoryFilters(
  c: Conversation,
  q: string,
  activeTags: string[],
): boolean {
  if (activeTags.length) {
    const tags = c.tags ?? []
    if (!activeTags.some((t) => tags.includes(t))) return false
  }
  return matchesSearch(c, q)
}

export function rowShell(selected: boolean): string {
  return lunaListRowClass(selected)
}
