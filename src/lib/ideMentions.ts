/** Contextos @ anexados ao composer (estilo Cursor). */

export type IdeMentionKind =
  | 'file'
  | 'folder'
  | 'terminal'
  | 'git'
  | 'rules'

export type IdeAttachedContext = {
  kind: IdeMentionKind
  /** Path absoluto ou rótulo (@Terminal, @Git) */
  ref: string
  label: string
}

const MENTION_RE =
  /@(Terminal|Git|Regras|AGENTS\.md|(?:[A-Za-z]:[\\/][^\s@]+)|(?:\.{0,2}[\\/][^\s@]+)|(?:[A-Za-z0-9_][A-Za-z0-9_.-]*\.[A-Za-z0-9]{1,12})|(?:[A-Za-z0-9_.-]+(?:[\\/][A-Za-z0-9_.-]+)+))\b/gi

export function parseIdeMentions(text: string): IdeAttachedContext[] {
  const out: IdeAttachedContext[] = []
  const seen = new Set<string>()
  let m: RegExpExecArray | null
  MENTION_RE.lastIndex = 0
  while ((m = MENTION_RE.exec(text)) !== null) {
    const raw = m[1].trim()
    const key = raw.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const lower = raw.toLowerCase()
    if (lower === 'terminal') {
      out.push({ kind: 'terminal', ref: 'terminal', label: '@Terminal' })
    } else if (lower === 'git') {
      out.push({ kind: 'git', ref: 'git', label: '@Git' })
    } else if (lower === 'regras' || lower === 'agents.md') {
      out.push({ kind: 'rules', ref: 'rules', label: '@Regras' })
    } else if (raw.endsWith('/') || raw.endsWith('\\')) {
      out.push({ kind: 'folder', ref: raw, label: `@${raw}` })
    } else {
      out.push({ kind: 'file', ref: raw, label: `@${raw}` })
    }
  }
  return out
}

export function resolveMentionPath(
  ref: string,
  workspaceRoot: string | null,
): string | null {
  const t = ref.trim()
  if (!t) return null
  if (/^[A-Za-z]:[\\/]/.test(t) || t.startsWith('/')) {
    return t.replace(/\//g, '\\')
  }
  if (!workspaceRoot) return null
  const sep = workspaceRoot.includes('\\') ? '\\' : '/'
  const base = workspaceRoot.replace(/[/\\]+$/, '')
  const rel = t.replace(/^[/\\]+/, '').replace(/\//g, sep)
  return `${base}${sep}${rel}`
}
