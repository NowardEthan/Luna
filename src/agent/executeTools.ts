import {
  buildVerticalRecallBlock,
  mergeVerticalRecallBlocks,
  MERGED_VERTICAL_RECALL_MAX_CHARS,
} from '../lib/conversationArchiveSearch'
import {
  isChatMemoryAvailable,
  retrieveChatMemorySemantic,
  syncChatMemoryFromConversations,
} from '../lib/chatMemoryClient'
import {
  bridgeAgentGlob,
  bridgeAgentGitDiff,
  bridgeAgentGitStatus,
  bridgeAgentGrep,
  bridgeAgentListDirectory,
  bridgeAgentRunCommand,
  bridgeAgentWebSearch,
} from '../lib/lunaBridge'
import { getIdeTurnHost } from '../lib/ideTurnHost'
import { resolveFileContent } from '../lib/workspaceFileContent'
import { splitDataUrl, visionDescribeImages } from '../lib/togetherClient'
import { ragRetrieve } from '../lib/ragClient'
import { applyConfigureMemories } from '../lib/configureMemoriesTool'
import {
  applySaveMemoryToolCalls,
  sanitizeSaveMemoryToolCalls,
} from '../lib/saveMemoryTool'
import type { LlmToolCallMessage } from '../lib/togetherClient'
import type { RagCitation } from '../types/chat'
import { buildAgentStep } from './buildAgentStep'
import type { AgentTurnInput, ToolExecuteResult } from './types'

export type ToolSideEffects = {
  ragCitations?: RagCitation[]
  visionDescription?: string
  memorySaved: boolean
}

function parseArgs(argsJson: string): Record<string, unknown> {
  try {
    const o = JSON.parse(argsJson) as Record<string, unknown>
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {}
  } catch {
    return {}
  }
}

function finish(
  tool: string,
  ok: boolean,
  content: string,
  args: Record<string, unknown>,
  raw: unknown,
  extras?: { citations?: RagCitation[] },
): ToolExecuteResult {
  const step = buildAgentStep(tool, ok, args, raw, extras)
  return {
    content,
    stepSummary: step.summary,
    ok,
    step,
  }
}

export async function executeToolCall(
  call: LlmToolCallMessage,
  ctx: AgentTurnInput,
  effects: ToolSideEffects,
): Promise<ToolExecuteResult> {
  const name = call.function?.name ?? ''
  const args = parseArgs(call.function?.arguments ?? '{}')

  switch (name) {
    case 'save_memory': {
      const toolCalls = sanitizeSaveMemoryToolCalls([call])
      const applied = applySaveMemoryToolCalls(
        ctx.getMemoryNotes() ?? [],
        toolCalls,
        ctx.assistantMsgId,
        ctx.nextId,
      )
      ctx.setMemoryNotes(applied.notes)
      const anyOk = applied.toolResponses.some((t) => {
        try {
          return (JSON.parse(t.content) as { ok?: boolean }).ok === true
        } catch {
          return false
        }
      })
      if (anyOk) effects.memorySaved = true
      const preview = applied.notes
        .filter((n) => n.sourceMessageId === ctx.assistantMsgId)
        .map((n) => n.title)
        .join(', ')
      return finish(
        name,
        anyOk,
        applied.toolResponses[0]?.content ?? '{"ok":false}',
        { ...args, _preview: preview },
        { ok: anyOk },
      )
    }

    case 'configure_memories': {
      const applied = applyConfigureMemories(
        ctx.userMemory.memoryUi,
        call.function.arguments ?? '{}',
      )
      ctx.setMemoryUi(applied.ui)
      const ok = (applied.toolPayload as { ok?: boolean }).ok === true
      return finish(
        name,
        ok,
        JSON.stringify(applied.toolPayload),
        args,
        { ok },
      )
    }

    case 'search_codebase': {
      const query = String(args.query ?? '').trim()
      if (!ctx.ragEnabled) {
        return finish(
          name,
          false,
          JSON.stringify({
            ok: false,
            error:
              'Indexação desligada — activa «Meus documentos» e indexa o workspace.',
          }),
          args,
          null,
        )
      }
      if (!query.length) {
        return finish(
          name,
          false,
          JSON.stringify({ ok: false, error: 'query vazia.' }),
          args,
          null,
        )
      }
      const rr = await ragRetrieve(query)
      if (rr.ok && rr.context.trim()) {
        if (rr.citations.length) {
          effects.ragCitations = [
            ...(effects.ragCitations ?? []),
            ...rr.citations,
          ]
        }
        return finish(
          name,
          true,
          JSON.stringify({
            ok: true,
            context: rr.context.slice(0, 12000),
            citation_count: rr.citations.length,
            hint: 'Usa grep/read_file nos paths citados para detalhe.',
          }),
          args,
          rr,
          { citations: rr.citations },
        )
      }
      return finish(
        name,
        false,
        JSON.stringify({
          ok: false,
          error: rr.ok
            ? 'Nenhum trecho no índice — tenta grep ou indexa a pasta do projecto.'
            : rr.error,
        }),
        args,
        rr,
      )
    }

    case 'search_documents': {
      const query = String(args.query ?? '').trim()
      if (!ctx.ragEnabled) {
        return finish(
          name,
          false,
          JSON.stringify({
            ok: false,
            error: 'Busca em documentos está desligada nas definições.',
          }),
          args,
          null,
        )
      }
      if (!query.length) {
        return finish(
          name,
          false,
          JSON.stringify({ ok: false, error: 'query vazia.' }),
          args,
          null,
        )
      }
      const rr = await ragRetrieve(query)
      if (rr.ok && rr.context.trim()) {
        if (rr.citations.length) {
          effects.ragCitations = [
            ...(effects.ragCitations ?? []),
            ...rr.citations,
          ]
        }
        return finish(
          name,
          true,
          JSON.stringify({
            ok: true,
            context: rr.context.slice(0, 12000),
            citation_count: rr.citations.length,
          }),
          args,
          rr,
          { citations: rr.citations },
        )
      }
      return finish(
        name,
        false,
        JSON.stringify({
          ok: false,
          error: rr.ok ? 'Nenhum trecho relevante.' : rr.error,
        }),
        args,
        rr,
      )
    }

    case 'search_past_conversations': {
      const query = String(args.query ?? '').trim()
      if (!ctx.userMemory.conversationSearchEnabled) {
        return finish(
          name,
          false,
          JSON.stringify({
            ok: false,
            error: 'Pesquisa em outros chats está desligada.',
          }),
          args,
          null,
        )
      }
      if (query.length < 2) {
        return finish(
          name,
          false,
          JSON.stringify({ ok: false, error: 'query muito curta.' }),
          args,
          null,
        )
      }
      let semantic = ''
      if (isChatMemoryAvailable()) {
        await syncChatMemoryFromConversations(ctx.conversations)
        const sem = await retrieveChatMemorySemantic(query)
        if (sem.ok && sem.text.trim()) semantic = sem.text
      }
      const keyword = buildVerticalRecallBlock(query, ctx.conversations)
      const merged = mergeVerticalRecallBlocks(
        semantic,
        keyword,
        MERGED_VERTICAL_RECALL_MAX_CHARS,
      )
      if (!merged.trim()) {
        return finish(
          name,
          false,
          JSON.stringify({
            ok: false,
            error: 'Nada encontrado em outros chats.',
          }),
          args,
          null,
        )
      }
      return finish(
        name,
        true,
        JSON.stringify({ ok: true, context: merged }),
        args,
        { ok: true },
      )
    }

    case 'describe_images': {
      const cached = ctx.userMsg.visionDescription?.trim()
      if (cached) {
        effects.visionDescription = cached
        const n = ctx.imageAttachments.length
        return finish(
          name,
          true,
          JSON.stringify({ ok: true, description: cached, cached: true }),
          { ...args, _imageCount: n },
          { ok: true },
        )
      }

      const parsed = ctx.imageAttachments
        .map((im) => splitDataUrl(im.dataUrl))
        .filter((x): x is { mime: string; dataBase64: string } => x != null)
      if (!parsed.length) {
        return finish(
          name,
          false,
          JSON.stringify({
            ok: false,
            error: 'Não há imagens anexadas neste turno.',
          }),
          { ...args, _imageCount: 0 },
          null,
        )
      }
      const focus = typeof args.focus === 'string' ? args.focus.trim() : ''
      const caption = [ctx.userCaption, focus].filter(Boolean).join('\n')
      const vr = await visionDescribeImages({
        images: parsed,
        userCaption: caption,
      })
      if (!vr.ok) {
        return finish(
          name,
          false,
          JSON.stringify({ ok: false, error: vr.error }),
          { ...args, _imageCount: parsed.length },
          null,
        )
      }
      effects.visionDescription = vr.text
      return finish(
        name,
        true,
        JSON.stringify({ ok: true, description: vr.text }),
        { ...args, _imageCount: parsed.length },
        { ok: true },
      )
    }

    case 'list_directory': {
      const rawPath = String(args.path ?? '').trim()
      let p = rawPath
      if (!p || p === '.') {
        const host = getIdeTurnHost()
        const root = host?.getSnapshot().workspaceRoot?.trim()
        if (root) p = root
      }
      let r = await bridgeAgentListDirectory(p)
      let attempt = 1
      if (r.ok !== true && rawPath !== p && p) {
        attempt = 2
        r = await bridgeAgentListDirectory(p)
      }
      const payload =
        r.ok === true
          ? r
          : {
              ...r,
              suggested_path:
                getIdeTurnHost()?.getSnapshot().workspaceRoot?.trim() || p,
            }
      const result = finish(
        name,
        r.ok === true,
        JSON.stringify(payload),
        { ...args, path: p || rawPath },
        r,
      )
      if (attempt > 1) {
        result.step = {
          ...result.step,
          attempt,
          retryOf: 'list_directory',
        }
      }
      return result
    }

    case 'read_file': {
      const p = String(args.path ?? '').trim()
      const maxChars =
        typeof args.max_chars === 'number' && !Number.isNaN(args.max_chars)
          ? Math.min(64000, Math.max(1000, Math.floor(args.max_chars)))
          : undefined
      const r = await resolveFileContent(p, maxChars)
      return finish(
        name,
        r.ok,
        JSON.stringify({
          ok: r.ok,
          path: p,
          content: r.content,
          source: r.source,
          dirty: r.dirty,
        }),
        args,
        r,
      )
    }

    case 'web_search': {
      const query = String(args.query ?? '').trim()
      const r = await bridgeAgentWebSearch(query)
      return finish(name, r.ok === true, JSON.stringify(r), args, r)
    }

    case 'write_file': {
      const host = getIdeTurnHost()
      if (!host) {
        return finish(
          name,
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
      return finish(
        name,
        true,
        JSON.stringify({
          ok: true,
          status: 'pending',
          proposal_id: proposalId,
        }),
        args,
        { ok: true, status: 'pending', proposal_id: proposalId },
      )
    }

    case 'apply_patch': {
      const host = getIdeTurnHost()
      if (!host) {
        return finish(
          name,
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
          return finish(
            name,
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
      return finish(
        name,
        true,
        JSON.stringify({
          ok: true,
          status: 'pending',
          proposal_id: proposalId,
        }),
        args,
        { ok: true, status: 'pending', proposal_id: proposalId },
      )
    }

    case 'grep': {
      const pattern = String(args.pattern ?? '').trim()
      const searchPath = typeof args.path === 'string' ? args.path.trim() : undefined
      const r = await bridgeAgentGrep(
        pattern,
        searchPath || undefined,
        args.case_sensitive === true,
      )
      return finish(name, r.ok === true, JSON.stringify(r), args, r)
    }

    case 'glob': {
      const pattern = String(args.pattern ?? '').trim()
      const searchPath = typeof args.path === 'string' ? args.path.trim() : undefined
      const r = await bridgeAgentGlob(pattern, searchPath || undefined)
      return finish(name, r.ok === true, JSON.stringify(r), args, r)
    }

    case 'run_terminal_command': {
      const host = getIdeTurnHost()
      const command = String(args.command ?? '').trim()
      const cwd = typeof args.cwd === 'string' ? args.cwd.trim() : undefined
      const gui = args.gui === true
      if (!gui) host?.setTerminalBusy(true)
      const r = await bridgeAgentRunCommand(command, cwd || undefined, { gui })
      if (host) {
        if (!gui) host.setTerminalBusy(false)
        host.recordTerminalCommand?.(
          command,
          r.exit_code ?? undefined,
        )
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
      return finish(name, r.ok === true, JSON.stringify(r), args, r)
    }

    case 'git_status': {
      const repoPath = typeof args.path === 'string' ? args.path.trim() : undefined
      const r = await bridgeAgentGitStatus(repoPath || undefined)
      return finish(name, r.ok === true, JSON.stringify(r), args, r)
    }

    case 'git_diff': {
      const repoPath = typeof args.path === 'string' ? args.path.trim() : undefined
      const r = await bridgeAgentGitDiff(repoPath || undefined, args.staged === true)
      return finish(name, r.ok === true, JSON.stringify(r), args, r)
    }

    case 'git_commit': {
      const host = getIdeTurnHost()
      const message = String(args.message ?? '').trim()
      if (!host) {
        return finish(
          name,
          false,
          JSON.stringify({ ok: false, error: 'Modo IDE não activo.' }),
          args,
          null,
        )
      }
      const commitId = host.proposeGitCommit(message)
      return finish(
        name,
        true,
        JSON.stringify({
          ok: true,
          status: 'pending',
          commit_id: commitId,
        }),
        args,
        { ok: true, status: 'pending', commit_id: commitId },
      )
    }

    default:
      return finish(
        name,
        false,
        JSON.stringify({
          ok: false,
          error: `Ferramenta desconhecida: ${name}`,
        }),
        args,
        null,
      )
  }
}
