/** URLs http(s) na mensagem da pessoa (para hints ao agente). */
export function extractUrlsFromUserText(text: string): string[] {
  const re = /https?:\/\/[^\s<>"')\]]+/gi
  const found = text.match(re) ?? []
  const out: string[] = []
  for (const raw of found) {
    const u = raw.replace(/[.,;:!?]+$/, '').trim()
    if (u.length > 12 && !out.includes(u)) out.push(u)
  }
  return out.slice(0, 3)
}
