export type GrepMatch = {
  path: string
  line: number
  text: string
}

export type GrepResult = {
  ok: boolean
  error?: string
  matches: GrepMatch[]
  truncated?: boolean
  pattern?: string
}

/** Escapa texto para uso como regex literal. */
export function escapeRegexLiteral(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function normalizeGrepResponse(raw: {
  ok?: boolean
  error?: string
  matches?: unknown[]
  truncated?: boolean
  pattern?: string
}): GrepResult {
  if (!raw.ok) {
    return { ok: false, error: raw.error ?? 'Pesquisa falhou.', matches: [] }
  }
  const matches: GrepMatch[] = []
  for (const m of raw.matches ?? []) {
    if (!m || typeof m !== 'object') continue
    const row = m as Record<string, unknown>
    if (typeof row.path !== 'string' || typeof row.line !== 'number') continue
    matches.push({
      path: row.path,
      line: row.line,
      text: typeof row.text === 'string' ? row.text : '',
    })
  }
  return {
    ok: true,
    matches,
    truncated: raw.truncated === true,
    pattern: raw.pattern,
  }
}
