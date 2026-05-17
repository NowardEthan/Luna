import { bridgeAgentGlob, bridgeAgentReadFile } from './lunaBridge'

export type LunaProjectRule = {
  path: string
  content: string
  alwaysApply: boolean
  globs: string[]
}

function parseFrontmatter(raw: string): {
  meta: Record<string, string>
  body: string
} {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw.trim())
  if (!m) return { meta: {}, body: raw.trim() }
  const meta: Record<string, string> = {}
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const k = line.slice(0, idx).trim().toLowerCase()
    const v = line.slice(idx + 1).trim()
    meta[k] = v
  }
  return { meta, body: m[2].trim() }
}

function ruleMatchesActiveFile(
  rule: LunaProjectRule,
  activeFilePath: string | null,
): boolean {
  if (rule.alwaysApply) return true
  if (!activeFilePath || !rule.globs.length) return false
  const norm = activeFilePath.replace(/\\/g, '/').toLowerCase()
  return rule.globs.some((g) => {
    const pat = g.trim().toLowerCase().replace(/\\/g, '/')
    if (pat.includes('**')) {
      const suffix = pat.replace(/^\*\*\//, '')
      return norm.endsWith(suffix) || norm.includes(`/${suffix}`)
    }
    return norm.endsWith(pat.replace(/^\*\//, ''))
  })
}

/** Carrega `.luna/rules/*.md` e `AGENTS.md` (raiz + subpastas limitadas). */
export async function loadLunaProjectRules(
  workspaceRoot: string | null,
  activeFilePath: string | null,
): Promise<string> {
  if (!workspaceRoot) return ''
  const sep = workspaceRoot.includes('\\') ? '\\' : '/'
  const base = workspaceRoot.replace(/[/\\]+$/, '')
  const blocks: string[] = []

  const agentsRoot = `${base}${sep}AGENTS.md`
  const ar = await bridgeAgentReadFile(agentsRoot, 8000)
  if (ar.ok && ar.content?.trim()) {
    blocks.push(`### AGENTS.md (raiz)\n${ar.content.trim()}`)
  }

  const rulesDir = `${base}${sep}.luna${sep}rules`
  const glob = await bridgeAgentGlob('**/*.{md,mdc}', rulesDir)
  const paths = (
    glob.ok && Array.isArray(glob.paths) ? (glob.paths as string[]) : []
  ).slice(0, 24)

  const rules: LunaProjectRule[] = []
  for (const p of paths) {
    const rr = await bridgeAgentReadFile(p, 6000)
    if (!rr.ok || !rr.content?.trim()) continue
    const { meta, body } = parseFrontmatter(rr.content)
    const alwaysApply =
      meta.alwaysapply === 'true' || meta.always_apply === 'true'
    const globs = (meta.globs ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    rules.push({ path: p, content: body, alwaysApply, globs })
  }

  const applicable = rules.filter((r) =>
    ruleMatchesActiveFile(r, activeFilePath),
  )
  for (const r of applicable.slice(0, 8)) {
    const name = r.path.split(/[/\\]/).pop() ?? r.path
    blocks.push(`### Regra: ${name}\n${r.content}`)
  }

  if (!blocks.length) return ''
  return (
    '**Regras do projecto (Luna):**\n\n' + blocks.join('\n\n---\n\n')
  )
}
