import { bridgeAgentListDirectory } from './lunaBridge'
import type { IdeMentionKind } from './ideMentions'

export type MentionSuggestion = {
  insert: string
  label: string
  detail?: string
  kind: IdeMentionKind | 'builtin'
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '__pycache__',
  '.venv',
])

const BUILTIN_SUGGESTIONS: MentionSuggestion[] = [
  {
    insert: 'Terminal',
    label: '@Terminal',
    detail: 'Saída recente do terminal',
    kind: 'terminal',
  },
  {
    insert: 'Git',
    label: '@Git',
    detail: 'Diff do working tree',
    kind: 'git',
  },
  {
    insert: 'Regras',
    label: '@Regras',
    detail: 'AGENTS.md e regras do projecto',
    kind: 'rules',
  },
]

export type MentionTrigger = {
  query: string
  replaceStart: number
  replaceEnd: number
}

/** Detecta `@query` imediatamente antes do cursor. */
export function getMentionTrigger(
  text: string,
  cursor: number,
): MentionTrigger | null {
  const before = text.slice(0, cursor)
  const m = /(?:^|[\s([{])@([^\s@]*)$/.exec(before)
  if (!m) return null
  const query = m[1]
  const atIndex = before.length - query.length - 1
  return {
    query,
    replaceStart: atIndex,
    replaceEnd: cursor,
  }
}

export function insertMention(
  text: string,
  trigger: MentionTrigger,
  insert: string,
): { next: string; cursor: number } {
  const mention = insert.includes(' ') ? `@${insert}` : `@${insert}`
  const next =
    text.slice(0, trigger.replaceStart) +
    mention +
    ' ' +
    text.slice(trigger.replaceEnd)
  const cursor = trigger.replaceStart + mention.length + 1
  return { next, cursor }
}

function relPath(abs: string, root: string): string {
  const a = abs.replace(/\\/g, '/')
  const r = root.replace(/\\/g, '/').replace(/\/+$/, '')
  if (a.toLowerCase().startsWith(r.toLowerCase() + '/')) {
    return a.slice(r.length + 1)
  }
  return abs.split(/[/\\]/).pop() ?? abs
}

function filterSuggestions(
  query: string,
  items: MentionSuggestion[],
  limit = 12,
): MentionSuggestion[] {
  const q = query.trim().toLowerCase()
  if (!q) return items.slice(0, limit)
  return items
    .filter((s) => {
      const hay = `${s.insert} ${s.label} ${s.detail ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
    .slice(0, limit)
}

export function filterBuiltinMentionSuggestions(
  query: string,
): MentionSuggestion[] {
  return filterSuggestions(query, BUILTIN_SUGGESTIONS, 6)
}

export async function listWorkspaceFileSuggestions(
  workspaceRoot: string,
  openPaths: string[],
  query: string,
  maxFiles = 120,
): Promise<MentionSuggestion[]> {
  const seen = new Set<string>()
  const out: MentionSuggestion[] = []

  for (const p of openPaths) {
    const rel = relPath(p, workspaceRoot)
    if (seen.has(rel.toLowerCase())) continue
    seen.add(rel.toLowerCase())
    out.push({
      insert: rel,
      label: `@${rel}`,
      detail: 'Tab aberto',
      kind: 'file',
    })
  }

  const queue: string[] = [workspaceRoot]
  let scanned = 0

  while (queue.length && out.length < maxFiles && scanned < 400) {
    const dir = queue.shift()!
    scanned++
    const r = await bridgeAgentListDirectory(dir)
    if (!r.ok || !r.entries) continue
    for (const e of r.entries) {
      if (out.length >= maxFiles) break
      if (e.name.startsWith('.')) continue
      const isDir = e.type === 'directory' || e.type === 'dir'
      if (isDir) {
        if (!SKIP_DIRS.has(e.name)) queue.push(e.path)
        const relDir = relPath(e.path, workspaceRoot)
        if (!seen.has(`${relDir}/`.toLowerCase())) {
          seen.add(`${relDir}/`.toLowerCase())
          out.push({
            insert: `${relDir}/`,
            label: `@${relDir}/`,
            detail: 'Pasta',
            kind: 'folder',
          })
        }
      } else {
        const rel = relPath(e.path, workspaceRoot)
        if (seen.has(rel.toLowerCase())) continue
        seen.add(rel.toLowerCase())
        out.push({
          insert: rel,
          label: `@${rel}`,
          detail: 'Ficheiro',
          kind: 'file',
        })
      }
    }
  }

  return filterSuggestions(query, out, 12)
}

export async function buildMentionSuggestions(
  workspaceRoot: string | null,
  openPaths: string[],
  query: string,
): Promise<MentionSuggestion[]> {
  const builtins = filterBuiltinMentionSuggestions(query)
  if (!workspaceRoot) return builtins
  const files = await listWorkspaceFileSuggestions(
    workspaceRoot,
    openPaths,
    query,
  )
  const merged = [...builtins]
  const labels = new Set(builtins.map((b) => b.label.toLowerCase()))
  for (const f of files) {
    if (labels.has(f.label.toLowerCase())) continue
    merged.push(f)
    if (merged.length >= 14) break
  }
  return merged
}
