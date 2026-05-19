import {
  bridgeAgentGitDiff,
  bridgeAgentGitStatus,
  bridgeAgentGlob,
  bridgeAgentGrep,
  bridgeAgentRunCommand,
} from '../../../lib/lunaBridge'
import { IDE_AGENT_TOOL_SCHEMAS, IDE_TOOL_UI } from '../../../agent/tools/ideToolSchemas'
import { getIdeTurnHost } from '../../../lib/ideTurnHost'
import { resolveFileContent } from '../../../lib/workspaceFileContent'
import type { RegisteredTool } from '../../registry/types'
import { finishTool } from '../toolResult'

function ideSchemaName(schema: unknown): string {
  const s = schema as { function?: { name?: string } }
  return s.function?.name ?? ''
}

const ideHandlers: Record<
  string,
  RegisteredTool['handler']
> = {
  write_file: async ({ args }) => {
    const host = getIdeTurnHost()
    if (!host) {
      return finishTool(
        'write_file',
        false,
        JSON.stringify({ ok: false, error: 'Modo IDE / workspace não activo.' }),
        args,
        null,
      )
    }
    const filePath = String(args.path ?? '').trim()
    const content = String(args.content ?? '')
    const read = await resolveFileContent(filePath)
    const oldContent = read.ok ? read.content : ''
    const proposalId = host.proposePatch({
      path: filePath,
      summary: String(args.summary ?? 'Escrever ficheiro'),
      oldContent,
      newContent: content,
    })
    return finishTool(
      'write_file',
      true,
      JSON.stringify({ ok: true, status: 'pending', proposal_id: proposalId }),
      args,
      { ok: true, status: 'pending', proposal_id: proposalId },
    )
  },
  apply_patch: async ({ args }) => {
    const host = getIdeTurnHost()
    if (!host) {
      return finishTool(
        'apply_patch',
        false,
        JSON.stringify({ ok: false, error: 'Modo IDE / workspace não activo.' }),
        args,
        null,
      )
    }
    const filePath = String(args.path ?? '').trim()
    const oldStr = String(args.old_string ?? '')
    const newStr = String(args.new_string ?? '')
    const read = await resolveFileContent(filePath)
    const current = read.ok ? read.content : ''
    let nextContent: string
    if (oldStr.length) {
      if (!current.includes(oldStr)) {
        return finishTool(
          'apply_patch',
          false,
          JSON.stringify({
            ok: false,
            error: 'old_string não encontrado no ficheiro.',
          }),
          args,
          null,
        )
      }
      nextContent = current.replace(oldStr, newStr)
    } else {
      nextContent = newStr
    }
    const proposalId = host.proposePatch({
      path: filePath,
      summary: String(args.summary ?? 'Patch'),
      oldContent: current,
      newContent: nextContent,
    })
    return finishTool(
      'apply_patch',
      true,
      JSON.stringify({ ok: true, status: 'pending', proposal_id: proposalId }),
      args,
      { ok: true, status: 'pending', proposal_id: proposalId },
    )
  },
  grep: async ({ args }) => {
    const pattern = String(args.pattern ?? '').trim()
    const searchPath = typeof args.path === 'string' ? args.path.trim() : undefined
    const r = await bridgeAgentGrep(
      pattern,
      searchPath || undefined,
      args.case_sensitive === true,
    )
    return finishTool('grep', r.ok === true, JSON.stringify(r), args, r)
  },
  glob: async ({ args }) => {
    const pattern = String(args.pattern ?? '').trim()
    const searchPath = typeof args.path === 'string' ? args.path.trim() : undefined
    const r = await bridgeAgentGlob(pattern, searchPath || undefined)
    return finishTool('glob', r.ok === true, JSON.stringify(r), args, r)
  },
  run_terminal_command: async ({ args }) => {
    const host = getIdeTurnHost()
    const command = String(args.command ?? '').trim()
    const cwd = typeof args.cwd === 'string' ? args.cwd.trim() : undefined
    const gui = args.gui === true
    if (!gui) host?.setTerminalBusy(true)
    const r = await bridgeAgentRunCommand(command, cwd || undefined, { gui })
    if (host) {
      if (!gui) host.setTerminalBusy(false)
      host.recordTerminalCommand?.(command, r.exit_code ?? undefined)
      if (r.ok) {
        const lines: { stream: 'stdout' | 'stderr'; text: string }[] = []
        if (gui && 'message' in r && r.message) {
          lines.push({ stream: 'stdout', text: String(r.message) })
        }
        if (r.stdout) lines.push({ stream: 'stdout', text: r.stdout })
        if (r.stderr) lines.push({ stream: 'stderr', text: r.stderr })
        if (lines.length) host.appendTerminalOutput(lines)
      }
    }
    return finishTool(
      'run_terminal_command',
      r.ok === true,
      JSON.stringify(r),
      args,
      r,
    )
  },
  git_status: async ({ args }) => {
    const repoPath = typeof args.path === 'string' ? args.path.trim() : undefined
    const r = await bridgeAgentGitStatus(repoPath || undefined)
    return finishTool('git_status', r.ok === true, JSON.stringify(r), args, r)
  },
  git_diff: async ({ args }) => {
    const repoPath = typeof args.path === 'string' ? args.path.trim() : undefined
    const r = await bridgeAgentGitDiff(repoPath || undefined, args.staged === true)
    return finishTool('git_diff', r.ok === true, JSON.stringify(r), args, r)
  },
  git_commit: async ({ args }) => {
    const host = getIdeTurnHost()
    const message = String(args.message ?? '').trim()
    if (!host) {
      return finishTool(
        'git_commit',
        false,
        JSON.stringify({ ok: false, error: 'Modo IDE não activo.' }),
        args,
        null,
      )
    }
    const commitId = host.proposeGitCommit(message)
    return finishTool(
      'git_commit',
      true,
      JSON.stringify({ ok: true, status: 'pending', commit_id: commitId }),
      args,
      { ok: true, status: 'pending', commit_id: commitId },
    )
  },
}

const ideLabels: Record<string, string> = {
  write_file: 'Escrever ficheiro',
  apply_patch: 'Patch',
  run_terminal_command: 'Terminal',
  git_status: 'Git status',
  git_diff: 'Git diff',
  git_commit: 'Git commit',
}

export const ideTools: RegisteredTool[] = IDE_AGENT_TOOL_SCHEMAS.map((schema) => {
  const name = ideSchemaName(schema)
  const ui = IDE_TOOL_UI[name]
  return {
    name,
    family: 'ide',
    schema,
    uiLabel: ideLabels[name] ?? name,
    uiMeta: ui,
    handler: ideHandlers[name] ?? (async () =>
      finishTool(
        name,
        false,
        JSON.stringify({ ok: false, error: `Handler IDE em falta: ${name}` }),
        {},
        null,
      )),
  }
})
