/**
 * Melhora fences markdown quando o modelo omite idioma ou usa alias incomum.
 */
export function normalizeAssistantMarkdown(content: string): string {
  let out = content

  // ``` sem linguagem → tenta inferir na linha seguinte (heurística leve)
  out = out.replace(
    /^```\s*\n([\s\S]*?)^```$/gm,
    (_match, body: string) => {
      const trimmed = body.trim()
      if (!trimmed) return _match
      const lang = guessFenceLanguage(trimmed)
      return '```' + lang + '\n' + body + '```'
    },
  )

  return out
}

function guessFenceLanguage(body: string): string {
  const head = body.slice(0, 800)
  if (/^\s*#!.*python/m.test(head) || /\b(def |import |print\()/.test(head)) {
    return 'python'
  }
  if (/\b(function |const |let |=>)/.test(head)) return 'javascript'
  if (/\b(fn |impl )/.test(head)) return 'rust'
  if (/^\s*\{[\s\S]*"[^"]+"\s*:/m.test(head)) return 'json'
  return ''
}
