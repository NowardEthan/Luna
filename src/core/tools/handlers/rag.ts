import { ragRetrieve } from '../../../lib/ragClient'
import type { RegisteredTool } from '../../registry/types'
import { finishTool } from '../toolResult'

const searchCodebaseSchema = {
  type: 'function',
  function: {
    name: 'search_codebase',
    description:
      'Pesquisa semântica no índice do workspace aberto (código por significado). Use quando não souber o nome exacto do ficheiro ou função.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'O que procurar (ex.: "autenticação login", "modelo python").',
        },
      },
      required: ['query'],
    },
  },
}

const searchDocumentsSchema = {
  type: 'function',
  function: {
    name: 'search_documents',
    description:
      'Pesquisa trechos nos documentos que a pessoa indexou no app (RAG). Use quando a pergunta depender de ficheiros/pastas indexados.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Consulta em português ou termos-chave.',
        },
      },
      required: ['query'],
    },
  },
}

async function runRagSearch(
  name: string,
  args: Record<string, unknown>,
  ctx: { ragEnabled: boolean },
  effects: { ragCitations?: import('../../../types/chat').RagCitation[] },
  opts?: { codebaseHint?: boolean },
) {
  const query = String(args.query ?? '').trim()
  if (!ctx.ragEnabled) {
    return finishTool(
      name,
      false,
      JSON.stringify({
        ok: false,
        error:
          name === 'search_codebase'
            ? 'Indexação desligada — activa «Meus documentos» e indexa o workspace.'
            : 'Busca em documentos está desligada nas definições.',
      }),
      args,
      null,
    )
  }
  if (!query.length) {
    return finishTool(
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
      effects.ragCitations = [...(effects.ragCitations ?? []), ...rr.citations]
    }
    return finishTool(
      name,
      true,
      JSON.stringify({
        ok: true,
        context: rr.context.slice(0, 12000),
        citation_count: rr.citations.length,
        ...(opts?.codebaseHint
          ? { hint: 'Usa grep/read_file nos paths citados para detalhe.' }
          : {}),
      }),
      args,
      rr,
      { citations: rr.citations },
    )
  }
  return finishTool(
    name,
    false,
    JSON.stringify({
      ok: false,
      error:
        rr.ok && name === 'search_codebase'
          ? 'Nenhum trecho no índice — tenta grep ou indexa a pasta do projecto.'
          : rr.ok
            ? 'Nenhum trecho relevante.'
            : rr.error,
    }),
    args,
    rr,
  )
}

export const ragTools: RegisteredTool[] = [
  {
    name: 'search_codebase',
    family: 'rag',
    schema: searchCodebaseSchema,
    uiLabel: 'Código (índice)',
    uiMeta: { label: 'Código', badgeClass: 'bg-cyan-500/20 text-cyan-200' },
    handler: ({ args, ctx, effects }) =>
      runRagSearch('search_codebase', args, ctx, effects, { codebaseHint: true }),
  },
  {
    name: 'search_documents',
    family: 'rag',
    schema: searchDocumentsSchema,
    uiLabel: 'Documentos',
    uiMeta: { label: 'Documentos', badgeClass: 'bg-accent-muted text-sky-200' },
    handler: ({ args, ctx, effects }) =>
      runRagSearch('search_documents', args, ctx, effects),
  },
]
