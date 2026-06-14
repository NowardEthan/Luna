import type { WorkspaceSnapshot } from './ideTurnHost'
import type { IdeAttachedContext } from './ideMentions'
import { resolveMentionPath } from './ideMentions'
import { ideContextLimits } from './ideContextConfig'
import { resolveFileContent } from './workspaceFileContent'
import { bridgeAgentGitDiff, bridgeAgentReadFile } from './lunaBridge'
import { loadLunaProjectRules } from './lunaRulesLoader'
import { ragRetrieve } from './ragClient'
import { compileForgeSessionMeta } from './forgeSessionMeta'

export type CompileIdeContextInput = {
  snapshot: WorkspaceSnapshot
  mentions?: IdeAttachedContext[]
  userQuery?: string
  ragEnabled?: boolean
  /** Menos tokens — revisão @ficheiro ou agente com TPM apertado */
  compact?: boolean
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max - 20)}\n\n…[truncado, ${s.length} chars total]`
}

function fence(path: string, content: string, lang: string): string {
  return `\n### \`${path}\`\n\`\`\`${lang}\n${content}\n\`\`\`\n`
}

function patchPreview(oldC: string, newC: string, maxLines: number): string {
  const oldL = oldC.split('\n')
  const newL = newC.split('\n')
  const lines: string[] = []
  const n = Math.min(maxLines, Math.max(oldL.length, newL.length))
  for (let i = 0; i < n; i++) {
    const o = oldL[i] ?? ''
    const ne = newL[i] ?? ''
    if (o !== ne) {
      if (o) lines.push(`- ${o}`)
      if (ne) lines.push(`+ ${ne}`)
    }
  }
  if (lines.length === 0) return '(sem diff legível)'
  return lines.join('\n')
}

async function fileOnDiskExists(path: string): Promise<boolean> {
  const r = await bridgeAgentReadFile(path, 32)
  return r.ok === true
}

/** Monta bloco Markdown injectado no system prompt (modo IDE). */
export async function compileIdeContextBlock(
  input: CompileIdeContextInput,
): Promise<string> {
  const baseLimits = ideContextLimits()
  const compact = input.compact === true
  const limits = compact
    ? {
        ...baseLimits,
        totalMaxChars: 8_000,
        mentionFileMaxChars: 5_000,
        activeFileMaxChars: 0,
        dirtyTabMaxChars: 0,
        gitDiffMaxChars: 0,
        ragChunksMaxChars: 0,
        terminalTailLines: 0,
      }
    : baseLimits
  const { snapshot, mentions = [], userQuery = '', ragEnabled = false } = input
  const parts: string[] = []
  let budget = limits.totalMaxChars

  const push = (block: string) => {
    if (!block.trim() || budget <= 0) return
    const slice = truncate(block, budget)
    parts.push(slice)
    budget -= slice.length
  }

  const forgeMeta = compileForgeSessionMeta()
  if (forgeMeta) {
    push(forgeMeta)
  } else {
    push(
      '**Sessão IDE (trabalho em código)** — pair programming no projecto aberto. ' +
        'Usa o contexto abaixo antes de `read_file` redundante no ficheiro activo.',
    )
  }

  if (snapshot.workspaceRoot) {
    push(`- **Raiz:** \`${snapshot.workspaceRoot}\``)
  } else {
    push('- **Raiz:** não aberta — pede «Abrir pasta» no explorador.')
  }

  if (snapshot.activeFilePath) {
    push(`- **Ficheiro activo:** \`${snapshot.activeFilePath}\``)
  }

  const others = snapshot.openFiles.filter(
    (f) => f.path !== snapshot.activeFilePath,
  )
  if (others.length) {
    push(
      `- **Outros tabs:** ${others.map((f) => `\`${f.path}\`${f.dirty ? ' (dirty)' : ''}`).join(', ')}`,
    )
  }

  if (!compact) {
    const factual: string[] = ['**Estado factual (não inventar):**']
    const pathsToCheck = new Set<string>()
    if (snapshot.activeFilePath) pathsToCheck.add(snapshot.activeFilePath)
    for (const p of snapshot.pendingPatches) pathsToCheck.add(p.path)
    for (const f of snapshot.openFiles) pathsToCheck.add(f.path)

    for (const p of pathsToCheck) {
      const tab = snapshot.openFiles.find((f) => f.path === p)
      const pending = snapshot.pendingPatches.filter((x) => x.path === p)
      const onDisk = await fileOnDiskExists(p)
      factual.push(
        `- \`${p}\`: disco=${onDisk ? 'sim' : 'não'}; editor=${tab ? `aberto${tab.dirty ? ', dirty' : ''}` : 'fechado'}; pendente=${pending.length ? pending.map((x) => x.summary).join('; ') : 'não'}`,
      )
    }
    factual.push(
      'Regra: só diz que um ficheiro «está no computador» se existir em **disco** ou tiver sido **aplicado** (patch aceite / auto-apply).',
    )
    push(factual.join('\n'))
  }

  // @mentions (prioridade máxima)
  for (const m of mentions) {
    if (budget <= 200) break
    if (m.kind === 'terminal') {
      const tail = snapshot.terminalLines
        .slice(-limits.terminalTailLines)
        .map((l) => `[${l.stream}] ${l.text}`)
        .join('')
      push(`**@Terminal (últimas linhas):**\n\`\`\`\n${tail || '(vazio)'}\n\`\`\``)
    } else if (m.kind === 'git' && snapshot.workspaceRoot) {
      const d = await bridgeAgentGitDiff(snapshot.workspaceRoot, false)
      const diff =
        d.ok && d.diff ? truncate(d.diff, limits.gitDiffMaxChars) : '(sem diff)'
      push(`**@Git (working tree):**\n\`\`\`diff\n${diff}\n\`\`\``)
    } else if (m.kind === 'rules') {
      const rules = await loadLunaProjectRules(
        snapshot.workspaceRoot,
        snapshot.activeFilePath,
      )
      if (rules) push(rules)
    } else if (m.kind === 'file' || m.kind === 'folder') {
      const abs = resolveMentionPath(m.ref, snapshot.workspaceRoot)
      if (!abs) continue
      const r = await resolveFileContent(abs, limits.mentionFileMaxChars)
      if (r.ok) {
        push(
          `**${m.label}** (fonte: ${r.source})\n` +
            fence(abs, truncate(r.content, limits.mentionFileMaxChars), 'text'),
        )
      }
    }
  }

  // Ficheiro activo
  if (!compact && snapshot.activeFilePath && budget > 500) {
    const tab = snapshot.openFiles.find(
      (f) => f.path === snapshot.activeFilePath,
    )
    const content =
      tab?.content ??
      (
        await resolveFileContent(
          snapshot.activeFilePath,
          limits.activeFileMaxChars,
        )
      ).content
    const src = tab?.dirty ? 'editor' : 'disco'
    push(
      `**Código do ficheiro activo** (${src}):\n` +
        fence(
          snapshot.activeFilePath,
          truncate(content, limits.activeFileMaxChars),
          tab?.languageId ?? 'text',
        ),
    )
  }

  if (!compact) {
    for (const f of snapshot.openFiles) {
      if (!f.dirty || f.path === snapshot.activeFilePath || budget <= 300) continue
      push(
        `**Tab dirty:** \`${f.path}\`\n` +
          fence(f.path, truncate(f.content, limits.dirtyTabMaxChars), f.languageId),
      )
    }
  }

  // Patches pendentes
  if (!compact && snapshot.pendingPatches.length) {
    const patchBlocks: string[] = ['**Alterações pendentes (aguardam aceitar na UI):**']
    for (const p of snapshot.pendingPatches.slice(0, 6)) {
      patchBlocks.push(
        `- \`${p.path}\` — ${p.summary} (id: ${p.id})\n` +
          '```diff\n' +
          patchPreview(p.oldContent, p.newContent, limits.patchPreviewLines) +
          '\n```',
      )
    }
    push(patchBlocks.join('\n'))
  }

  // Terminal tail (se não veio via @)
  if (
    !compact &&
    !mentions.some((m) => m.kind === 'terminal') &&
    snapshot.terminalLines.length &&
    budget > 400
  ) {
    const tail = snapshot.terminalLines
      .slice(-limits.terminalTailLines)
      .map((l) => `[${l.stream}] ${l.text}`)
      .join('')
    push(`**Terminal (recente):**\n\`\`\`\n${truncate(tail, 3000)}\n\`\`\``)
  }

  // Git diff resumido
  if (
    !compact &&
    !mentions.some((m) => m.kind === 'git') &&
    snapshot.workspaceRoot &&
    budget > 500
  ) {
    const d = await bridgeAgentGitDiff(snapshot.workspaceRoot, false)
    if (d.ok && d.diff?.trim()) {
      push(
        `**Git (working tree, resumo):**\n\`\`\`diff\n${truncate(d.diff, limits.gitDiffMaxChars)}\n\`\`\``,
      )
    }
  }

  // Regras (se não @Regras)
  if (!compact && !mentions.some((m) => m.kind === 'rules') && budget > 800) {
    const rules = await loadLunaProjectRules(
      snapshot.workspaceRoot,
      snapshot.activeFilePath,
    )
    if (rules) push(truncate(rules, 4000))
  }

  // RAG workspace
  if (!compact && ragEnabled && userQuery.trim() && snapshot.workspaceRoot && budget > 600) {
    try {
      const rag = await ragRetrieve(userQuery.trim())
      if (rag.ok && rag.context?.trim()) {
        push(
          `**Índice do workspace (trechos relevantes):**\n${truncate(rag.context, limits.ragChunksMaxChars)}`,
        )
      }
    } catch {
      /* ignore */
    }
  }

  return parts.join('\n\n---\n\n')
}

/** Resumo curto para refresh entre steps do agente. */
export function compileIdeContextRefreshNote(snapshot: WorkspaceSnapshot): string {
  const pending = snapshot.pendingPatches.length
  const dirty = snapshot.openFiles.filter((f) => f.dirty).length
  return (
    `[Estado IDE actualizado] activo=${snapshot.activeFilePath ?? 'nenhum'}; ` +
    `tabs dirty=${dirty}; patches pendentes=${pending}; ` +
    `terminal linhas=${snapshot.terminalLines.length}.`
  )
}
