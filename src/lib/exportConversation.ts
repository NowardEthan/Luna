import type { Conversation } from '../types/chat'
import { BRAND_APP_NAME } from '../brand'

export function conversationToMarkdown(convo: Conversation): string {
  const lines: string[] = [
    `# ${convo.title}`,
    '',
    `_Exportado de ${BRAND_APP_NAME} — ${new Date(convo.updatedAt).toLocaleString('pt-BR')}_`,
    '',
  ]
  for (const m of convo.messages) {
    const who = m.role === 'user' ? 'Você' : BRAND_APP_NAME
    lines.push(`## ${who}`, '', m.text.trim() || '_(sem texto)_', '')
    if (m.visionDescription?.trim()) {
      lines.push('### Descrição da imagem', '', m.visionDescription.trim(), '')
    }
  }
  return lines.join('\n').trimEnd() + '\n'
}

export function downloadConversationMarkdown(convo: Conversation): void {
  const md = conversationToMarkdown(convo)
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safe = convo.title.replace(/[^\w\s-]/g, '').trim().slice(0, 48) || 'conversa'
  a.href = url
  a.download = `${safe}.md`
  a.click()
  URL.revokeObjectURL(url)
}
