import {
  bridgeAgentListDirectory,
  bridgeAgentWebSearch,
} from '../../../lib/lunaBridge'
import { getIdeTurnHost } from '../../../lib/ideTurnHost'
import { resolveFileContent } from '../../../lib/workspaceFileContent'
import type { RegisteredTool } from '../../registry/types'
import { finishTool } from '../toolResult'

const listDirSchema = {
  type: 'function',
  function: {
    name: 'list_directory',
    description:
      'Lista ficheiros e pastas num caminho absoluto permitido (projecto, documentos, pasta indexada no RAG).',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho absoluto da pasta.' },
      },
      required: ['path'],
    },
  },
}

const readFileSchema = {
  type: 'function',
  function: {
    name: 'read_file',
    description:
      'Lê o conteúdo textual de um ficheiro num caminho absoluto permitido (limite de tamanho).',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho absoluto do ficheiro.' },
        max_chars: {
          type: 'number',
          description: 'Opcional: máximo de caracteres (default ~32000).',
        },
      },
      required: ['path'],
    },
  },
}

const webSearchSchema = {
  type: 'function',
  function: {
    name: 'web_search',
    description:
      'Pesquisa na web informação actual (notícias, factos recentes). Usa o ano/mês do system prompt na query quando pedirem “recente” ou “hoje”. Requer API configurada no servidor.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Consulta em português; para notícias recentes inclui o ano actual (ex.: “notícias IA RAM 2026”).',
        },
      },
      required: ['query'],
    },
  },
}

export const filesystemTools: RegisteredTool[] = [
  {
    name: 'list_directory',
    family: 'filesystem',
    schema: listDirSchema,
    uiLabel: 'Listar pasta',
    uiMeta: { label: 'Pasta', badgeClass: 'bg-amber-500/20 text-amber-200' },
    handler: async ({ args }) => {
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
      const result = finishTool(
        'list_directory',
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
    },
  },
  {
    name: 'read_file',
    family: 'filesystem',
    schema: readFileSchema,
    uiLabel: 'Ler ficheiro',
    uiMeta: { label: 'Ficheiro', badgeClass: 'bg-amber-500/20 text-amber-200' },
    handler: async ({ args }) => {
      const p = String(args.path ?? '').trim()
      const maxChars =
        typeof args.max_chars === 'number' && !Number.isNaN(args.max_chars)
          ? Math.min(64000, Math.max(1000, Math.floor(args.max_chars)))
          : undefined
      const r = await resolveFileContent(p, maxChars)
      return finishTool(
        'read_file',
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
    },
  },
  {
    name: 'web_search',
    family: 'filesystem',
    schema: webSearchSchema,
    uiLabel: 'Pesquisa web',
    uiMeta: { label: 'Web', badgeClass: 'bg-success-muted text-emerald-200' },
    handler: async ({ args }) => {
      const query = String(args.query ?? '').trim()
      const r = await bridgeAgentWebSearch(query)
      return finishTool('web_search', r.ok === true, JSON.stringify(r), args, r)
    },
  },
]
