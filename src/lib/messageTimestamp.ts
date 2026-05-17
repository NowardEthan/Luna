/** Extrai timestamp do id de mensagem (`${Date.now()}-…`). */
export function messageTimestampFromId(id: string): number | null {
  const n = Number.parseInt(id.split('-')[0] ?? '', 10)
  return Number.isFinite(n) && n > 1_000_000_000_000 ? n : null
}

export function formatMessageTime(ts: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(ts)
}
