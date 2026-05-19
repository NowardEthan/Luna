import { fileBasename } from '../lib/pathUtils'
import { hostnameFromUrl } from '../lib/urlUtils'
import type { AgentStepRecord, RagCitation, WebSearchResultItem } from '../types/chat'
import { getToolMeta, getToolUiLabels } from './toolSchemas'

const SNIPPET_MAX = 220
const ANSWER_MAX = 500

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function labelFor(tool: string): string {
  const meta = getToolMeta()
  const labels = getToolUiLabels()
  return meta[tool]?.label ?? labels[tool] ?? tool
}

export function buildAgentStep(
  tool: string,
  ok: boolean,
  args: Record<string, unknown>,
  raw: unknown,
  extras?: {
    citations?: RagCitation[]
    llmProvider?: 'groq' | 'together' | 'ollama'
  },
): AgentStepRecord {
  const label = labelFor(tool)
  const query = typeof args.query === 'string' ? args.query.trim() : ''
  const base: AgentStepRecord = {
    tool,
    label,
    summary: `${label}: ${ok ? 'ok' : 'falhou'}`,
    ok,
    ...(extras?.llmProvider ? { llmProvider: extras.llmProvider } : {}),
  }

  switch (tool) {
    case 'web_search': {
      const r = raw as {
        ok?: boolean
        query?: string
        answer?: string
        results?: { title?: string; url?: string; content?: string }[]
      }
      const q = query || String(r?.query ?? '').trim()
      const results: WebSearchResultItem[] = (r?.results ?? [])
        .slice(0, 8)
        .map((item) => {
          const published =
            typeof (item as { published_date?: string }).published_date ===
            'string'
              ? (item as { published_date: string }).published_date.trim()
              : undefined
          const snippetBase = item.content
            ? truncate(item.content, SNIPPET_MAX)
            : undefined
          const snippet =
            published && snippetBase
              ? `[${published}] ${snippetBase}`
              : published
                ? published
                : snippetBase
          return {
            title: item.title?.trim(),
            url: item.url?.trim(),
            hostname: hostnameFromUrl(item.url),
            snippet,
          }
        })
      return {
        ...base,
        summary: ok
          ? `${label}: ${results.length} site(s) — «${truncate(q, 60)}»`
          : `${label}: sem resultados`,
        detail: {
          kind: 'web_search',
          query: q,
          answer: r?.answer ? truncate(String(r.answer), ANSWER_MAX) : undefined,
          results,
        },
      }
    }

    case 'search_documents': {
      const citations = extras?.citations ?? []
      return {
        ...base,
        summary: ok
          ? `${label}: ${citations.length} fonte(s) — «${truncate(query, 50)}»`
          : `${label}: nada encontrado`,
        detail: {
          kind: 'search_documents',
          query,
          citations,
        },
      }
    }

    case 'search_past_conversations':
      return {
        ...base,
        summary: ok
          ? `${label}: encontrado — «${truncate(query, 50)}»`
          : `${label}: vazio`,
        detail: { kind: 'search_past_conversations', query },
      }

    case 'describe_images': {
      const focus =
        typeof args.focus === 'string' ? args.focus.trim() : undefined
      const count =
        typeof args._imageCount === 'number' ? args._imageCount : 1
      return {
        ...base,
        summary: ok ? `${label}: ${count} imagem(ns)` : `${label}: erro`,
        detail: { kind: 'describe_images', imageCount: count, focus },
      }
    }

    case 'save_memory': {
      const preview =
        typeof args._preview === 'string' ? args._preview : undefined
      return {
        ...base,
        summary: ok ? `${label}: gravado` : `${label}: falhou`,
        detail: { kind: 'save_memory', preview },
      }
    }

    case 'list_directory': {
      const p = String(args.path ?? '').trim()
      const r = raw as {
        entries?: { name?: string; type?: string }[]
        path?: string
        error?: string
      }
      const entries = Array.isArray(r?.entries) ? r.entries : []
      const names = entries
        .slice(0, 8)
        .map((e) => e.name)
        .filter((n): n is string => Boolean(n))
      const resolvedPath = r?.path || p || 'workspace'
      const n = entries.length
      return {
        ...base,
        summary: ok
          ? `${label}: ${n} entrada(s) em ${fileBasename(resolvedPath) || resolvedPath}`
          : `${label}: ${r?.error ?? 'bloqueado'}`,
        detail: {
          kind: 'filesystem',
          action: 'list_directory',
          path: resolvedPath,
          entryCount: n,
          sampleEntries: names.length ? names : undefined,
          error: ok ? undefined : String(r?.error ?? 'Falhou'),
        },
      }
    }

    case 'read_file': {
      const p = String(args.path ?? '').trim()
      const r = raw as { content?: string; source?: string }
      const lines =
        typeof r?.content === 'string' ? r.content.split(/\r?\n/).length : undefined
      return {
        ...base,
        summary: ok
          ? `${label}: ${fileBasename(p)}${lines != null ? ` (${lines} linhas)` : ''}`
          : `${label}: erro`,
        detail: {
          kind: 'filesystem',
          action: 'read_file',
          path: p,
          entryCount: lines,
        },
      }
    }

    case 'glob': {
      const pattern = String(args.pattern ?? '').trim()
      const r = raw as {
        results?: { path?: string; relative?: string }[]
        pattern?: string
        truncated?: boolean
        root?: string
        error?: string
      }
      const paths = (r?.results ?? [])
        .slice(0, 12)
        .map((x) => x.relative || x.path || '')
        .filter(Boolean)
      const count = Array.isArray(r?.results) ? r.results.length : paths.length
      return {
        ...base,
        summary: ok
          ? `${label}: «${truncate(pattern, 40)}» → ${count} ficheiro(s)`
          : `${label}: ${r?.error ?? 'falhou'}`,
        detail: {
          kind: 'glob',
          pattern: pattern || String(r?.pattern ?? ''),
          root: r?.root,
          paths,
          matchCount: count,
          truncated: r?.truncated,
        },
      }
    }

    case 'grep': {
      const pattern = String(args.pattern ?? '').trim()
      const r = raw as {
        matches?: { path?: string; line?: number; text?: string }[]
        pattern?: string
        match_count?: number
        truncated?: boolean
        root?: string
        error?: string
      }
      const matches = (r?.matches ?? []).slice(0, 8).map((m) => ({
        path: m.path ?? '',
        line: m.line ?? 0,
        text: truncate(String(m.text ?? ''), 120),
      }))
      const count = r?.match_count ?? matches.length
      return {
        ...base,
        summary: ok
          ? `${label}: «${truncate(pattern, 36)}» → ${count} ocorrência(s)`
          : `${label}: ${r?.error ?? 'falhou'}`,
        detail: {
          kind: 'grep',
          pattern: pattern || String(r?.pattern ?? ''),
          root: r?.root,
          matches,
          matchCount: count,
          truncated: r?.truncated,
        },
      }
    }

    case 'search_codebase': {
      const citations = extras?.citations ?? []
      return {
        ...base,
        summary: ok
          ? `${label}: ${citations.length} trecho(s) — «${truncate(query, 44)}»`
          : `${label}: nada encontrado`,
        detail: {
          kind: 'search_documents',
          query,
          citations,
        },
      }
    }

    case 'write_file': {
      const p = String(args.path ?? '').trim()
      const content = String(args.content ?? '')
      const lines = content.split(/\r?\n/).length
      const summary = String(args.summary ?? '').trim()
      const r = raw as { status?: string; error?: string }
      const pending = r?.status === 'pending'
      return {
        ...base,
        summary: ok
          ? `${label}: ${fileBasename(p)}${pending ? ' (pendente)' : ''}`
          : `${label}: falhou`,
        detail: {
          kind: 'edit',
          action: 'write_file',
          path: p,
          summary: summary || undefined,
          status: ok ? (pending ? 'pending' : 'applied') : 'failed',
          lineCount: lines,
        },
      }
    }

    case 'apply_patch': {
      const p = String(args.path ?? '').trim()
      const summary = String(args.summary ?? '').trim()
      const r = raw as { status?: string; error?: string }
      const pending = r?.status === 'pending'
      return {
        ...base,
        summary: ok
          ? `${label}: ${fileBasename(p)}${pending ? ' (pendente)' : ''}`
          : `${label}: falhou`,
        detail: {
          kind: 'edit',
          action: 'apply_patch',
          path: p,
          summary: summary || undefined,
          status: ok ? (pending ? 'pending' : 'applied') : 'failed',
        },
      }
    }

    case 'run_terminal_command': {
      const command = String(args.command ?? '').trim()
      const gui = args.gui === true
      const r = raw as {
        exit_code?: number
        stdout?: string
        stderr?: string
        error?: string
        message?: string
      }
      const exit = r?.exit_code
      return {
        ...base,
        summary: ok
          ? `${label}: ${truncate(command, 50)}${exit != null ? ` → exit ${exit}` : ''}`
          : `${label}: falhou`,
        detail: {
          kind: 'terminal',
          command,
          exitCode: exit,
          stdoutPreview: r?.stdout
            ? truncate(r.stdout, 400)
            : r?.message
              ? truncate(String(r.message), 200)
              : undefined,
          stderrPreview: r?.stderr ? truncate(r.stderr, 280) : undefined,
          gui,
        },
      }
    }

    case 'git_status': {
      const r = raw as { summary?: string; status?: string; error?: string }
      const preview = String(r?.summary ?? r?.status ?? '').trim()
      return {
        ...base,
        summary: ok ? `${label}: estado lido` : `${label}: erro`,
        detail: {
          kind: 'git',
          action: 'status',
          summary: preview || 'Sem alterações ou vazio',
          preview: preview ? truncate(preview, 500) : undefined,
        },
      }
    }

    case 'git_diff': {
      const r = raw as { diff?: string; error?: string }
      const diff = String(r?.diff ?? '').trim()
      return {
        ...base,
        summary: ok
          ? `${label}: ${diff ? `${diff.split(/\r?\n/).length} linhas` : 'vazio'}`
          : `${label}: erro`,
        detail: {
          kind: 'git',
          action: 'diff',
          summary: 'Diff do working tree',
          preview: diff ? truncate(diff, 600) : undefined,
        },
      }
    }

    case 'git_commit': {
      const msg = String(args.message ?? '').trim()
      return {
        ...base,
        summary: ok
          ? `${label}: «${truncate(msg, 48)}» (pendente)`
          : `${label}: falhou`,
        detail: {
          kind: 'git',
          action: 'commit',
          summary: msg || 'Commit proposto',
        },
      }
    }

    default: {
      const err =
        raw && typeof raw === 'object' && raw !== null && 'error' in raw
          ? String((raw as { error: unknown }).error)
          : undefined
      return {
        ...base,
        summary: ok ? `${label}: concluído` : `${label}: ${err ?? 'falhou'}`,
        detail: {
          kind: 'generic',
          message: ok ? 'Concluído' : err ?? 'Falhou',
          error: err,
        },
      }
    }
  }
}
