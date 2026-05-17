/** Schemas OpenAI para ferramentas de desenvolvimento (modo IDE). */
export const IDE_AGENT_TOOL_SCHEMAS: unknown[] = [
  {
    type: 'function',
    function: {
      name: 'write_file',
      description:
        'Propõe gravar um ficheiro completo (fica pendente até a pessoa aceitar na UI).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho absoluto do ficheiro.' },
          content: { type: 'string', description: 'Conteúdo completo novo.' },
          summary: {
            type: 'string',
            description: 'Resumo curto da alteração para a UI.',
          },
        },
        required: ['path', 'content'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apply_patch',
      description:
        'Propõe substituir um trecho num ficheiro (pendente até aceitar). Use old_string exacto do ficheiro.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          old_string: {
            type: 'string',
            description: 'Texto exacto a substituir (vazio = ficheiro novo).',
          },
          new_string: { type: 'string', description: 'Texto novo.' },
          summary: { type: 'string' },
        },
        required: ['path', 'new_string'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'grep',
      description: 'Pesquisa regex no código do workspace (ficheiros de texto).',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regex JavaScript.' },
          path: {
            type: 'string',
            description: 'Pasta ou ficheiro (opcional; default = raiz do workspace).',
          },
          case_sensitive: { type: 'boolean' },
        },
        required: ['pattern'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'glob',
      description: 'Lista ficheiros por padrão glob (ex. **/*.tsx).',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          path: { type: 'string' },
        },
        required: ['pattern'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_terminal_command',
      description:
        'Executa comando no workspace. Use gui=true para lançar qualquer app com janela (Python, npm/electron, dotnet, java -jar, binário, etc.) no ambiente de trabalho — processo em background.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          cwd: { type: 'string', description: 'Opcional; pasta de trabalho.' },
          gui: {
            type: 'boolean',
            description:
              'Se true, inicia processo com janela visível (qualquer linguagem/stack). Não uses para comandos só de texto.',
          },
        },
        required: ['command'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'git_status',
      description: 'Estado git (porcelain) do repositório no workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Raiz do repo (opcional).' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'git_diff',
      description: 'Diff git (working tree ou staged).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          staged: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'git_commit',
      description:
        'Propõe commit git (pendente até a pessoa confirmar na UI do IDE).',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          path: { type: 'string' },
        },
        required: ['message'],
        additionalProperties: false,
      },
    },
  },
]

export const IDE_TOOL_UI: Record<string, { label: string; badgeClass: string }> = {
  write_file: { label: 'Escrever ficheiro', badgeClass: 'bg-amber-500/20 text-amber-200' },
  apply_patch: { label: 'Patch', badgeClass: 'bg-amber-500/20 text-amber-200' },
  grep: { label: 'Grep', badgeClass: 'bg-cyan-500/20 text-cyan-200' },
  glob: { label: 'Glob', badgeClass: 'bg-cyan-500/20 text-cyan-200' },
  run_terminal_command: {
    label: 'Terminal',
    badgeClass: 'bg-lime-500/20 text-lime-200',
  },
  git_status: { label: 'Git status', badgeClass: 'bg-orange-500/20 text-orange-200' },
  git_diff: { label: 'Git diff', badgeClass: 'bg-orange-500/20 text-orange-200' },
  git_commit: { label: 'Git commit', badgeClass: 'bg-orange-500/20 text-orange-200' },
}
