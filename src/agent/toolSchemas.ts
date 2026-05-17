import { MEMORY_AGENT_TOOLS } from '../lib/lunaMemoryTools'
import { IDE_AGENT_TOOL_SCHEMAS, IDE_TOOL_UI } from './tools/ideToolSchemas'

export const AGENT_TOOL_SCHEMAS: unknown[] = [
  ...MEMORY_AGENT_TOOLS,
  ...IDE_AGENT_TOOL_SCHEMAS,
  {
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
  },
  {
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
  },
  {
    type: 'function',
    function: {
      name: 'search_past_conversations',
      description:
        'Pesquisa em conversas anteriores desta pessoa neste app (memória semântica + palavras-chave). Use quando perguntarem o que falaram antes ou em outro chat.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'O que procurar no histórico de chats.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'describe_images',
      description:
        'Analisa as imagens anexadas nesta mensagem (Lunar Vision). Use quando precisar de ver o conteúdo visual antes de responder.',
      parameters: {
        type: 'object',
        properties: {
          focus: {
            type: 'string',
            description:
              'Opcional: o que procurar ou descrever com prioridade nas imagens.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description:
        'Lista ficheiros e pastas num caminho absoluto permitido (projecto, documentos, pasta indexada no RAG).',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Caminho absoluto da pasta.',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description:
        'Lê o conteúdo textual de um ficheiro num caminho absoluto permitido (limite de tamanho).',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Caminho absoluto do ficheiro.',
          },
          max_chars: {
            type: 'number',
            description: 'Opcional: máximo de caracteres (default ~32000).',
          },
        },
        required: ['path'],
      },
    },
  },
  {
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
  },
]

export const TOOL_UI_LABELS: Record<string, string> = {
  save_memory: 'Memória',
  configure_memories: 'Memórias (painel)',
  write_file: 'Escrever ficheiro',
  apply_patch: 'Patch',
  grep: 'Grep',
  glob: 'Glob',
  run_terminal_command: 'Terminal',
  git_status: 'Git status',
  git_diff: 'Git diff',
  git_commit: 'Git commit',
  search_codebase: 'Código (índice)',
  search_documents: 'Documentos',
  search_past_conversations: 'Chats anteriores',
  describe_images: 'Visão',
  list_directory: 'Listar pasta',
  read_file: 'Ler ficheiro',
  web_search: 'Pesquisa web',
}

export const TOOL_META: Record<
  string,
  { label: string; badgeClass: string }
> = {
  save_memory: { label: 'Memória', badgeClass: 'bg-violet-500/20 text-violet-200' },
  configure_memories: {
    label: 'Painel memórias',
    badgeClass: 'bg-violet-500/15 text-violet-300/90',
  },
  ...IDE_TOOL_UI,
  search_codebase: {
    label: 'Código',
    badgeClass: 'bg-cyan-500/20 text-cyan-200',
  },
  search_documents: {
    label: 'Documentos',
    badgeClass: 'bg-sky-500/20 text-sky-200',
  },
  search_past_conversations: {
    label: 'Chats',
    badgeClass: 'bg-indigo-500/20 text-indigo-200',
  },
  describe_images: { label: 'Visão', badgeClass: 'bg-fuchsia-500/20 text-fuchsia-200' },
  list_directory: { label: 'Pasta', badgeClass: 'bg-amber-500/20 text-amber-200' },
  read_file: { label: 'Ficheiro', badgeClass: 'bg-amber-500/20 text-amber-200' },
  web_search: { label: 'Web', badgeClass: 'bg-emerald-500/20 text-emerald-200' },
}
