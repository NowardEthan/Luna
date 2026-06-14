import { IDE_TOOL_UI } from '../../agent/tools/ideToolSchemas'
import { compileIdeContextBlock } from '../../lib/ideContextCompiler'
import { compileForgeSessionMeta } from '../../lib/forgeSessionMeta'
import type { ForgeComposerMode } from '../../lib/forgeComposerMode'
import { readIdeAutoApply } from '../../lib/ideContextConfig'
import type { IdeAttachedContext } from '../../lib/ideMentions'
import { getIdeTurnHost } from '../../lib/ideTurnHost'
import {
  shouldRunIdeAgentLoop,
  shouldRunIdeLightReview,
} from '../chat/ideToolLoopPolicy'
import type { LunaCoreResultado } from '../../types/lunaCoreResult'

/** Rota do turno no Luna Forge. */
export type ForgeTurnRoute = 'forge_agent' | 'light_review' | 'luna_core_chat'

export type InterpretForgeTurnInput = {
  userText: string
  mentions?: IdeAttachedContext[]
  composerMode: ForgeComposerMode
}

/**
 * Decide a rota pós-Core no Forge.
 * **Luna Core corre sempre** (excepto light review @ficheiro).
 * Modo Agente → Core + agente com tools. Modo Chat → só Core.
 */
export function interpretForgeTurn(input: InterpretForgeTurnInput): ForgeTurnRoute {
  const mentions = input.mentions ?? []
  const text = input.userText.trim()
  if (!text) return 'luna_core_chat'

  if (input.composerMode === 'chat') return 'luna_core_chat'
  if (shouldRunIdeLightReview(text, mentions)) return 'light_review'
  return 'forge_agent'
}

function formatToolCatalog(): string {
  return Object.entries(IDE_TOOL_UI)
    .map(([name, ui]) => `- \`${name}\` — ${ui.label}`)
    .join('\n')
}

/** Contexto para o Luna Core em modo Agente (antes do handoff ao agente). */
export function buildForgeCoreInterpreterBlock(): string {
  return [
    '## Forge — Luna Core (modo Agente)',
    '',
    'Estás no **Luna Forge** com o composer em **modo Agente**.',
    '1. Analisa com personalidade, memória e contexto do workspace.',
    '2. Responde de forma curta quando o pedido for acção no disco — o **agente Orbit** continua a seguir com tools.',
    '3. Classifica `pedido_codigo` / `usar_ferramenta` para criar/alterar ficheiros, correr comandos ou git.',
    '4. **Proibido** tutoriais de UI («clica Novo ficheiro») — o agente usa `write_file` / `apply_patch`.',
    '5. Conversa casual («oi») → responde tu; o agente só entra se houver trabalho no projecto.',
  ].join('\n')
}

/** Instruções para o agente Orbit — injectadas após o Luna Core. */
export function buildForgeAgentInterpreterBlock(): string {
  const autoApply = readIdeAutoApply()
  const tools = formatToolCatalog()

  return [
    '## Forge — camada de interpretação (modo Agente)',
    '',
    'Tu és o **agente de desenvolvimento** do Luna Forge (Orbit). Tens ferramentas reais no workspace.',
    '**Não és um chatbot de tutoriais:** executa com tools; evita «clica no explorador», «cria manualmente», «abre o VS Code».',
    '',
    '### Ferramentas disponíveis',
    tools,
    'Mais: `read_file`, `list_directory`, `search_codebase` (exploração RAG do projecto).',
    '',
    '### Como interpretar o pedido',
    '1. **Criar/alterar ficheiros** (.env, config, código) → `write_file` ou `apply_patch` na primeira ronda útil.',
    '2. **Explorar projecto** → `list_directory`, `glob`, `grep`, `search_codebase` antes de editar se não souberes a estrutura.',
    '3. **Correr/build/testar** → `run_terminal_command` (reporta exit code).',
    '4. **Git** → `git_status`, `git_diff`, `git_commit` (commit fica pendente na UI).',
    '5. **Conversa casual** («oi», «obrigado») → responde em texto curto; tools só se pedirem acção.',
    '6. **Pedidos delegados** («faz para mim», «estrutura um .env») → **não** devolves só instruções; chama a tool.',
    '',
    `### Revisão de patches`,
    autoApply
      ? 'Auto-apply **ligado** — patches podem gravar directo no disco após a tool.'
      : 'Auto-apply **desligado** — patches ficam pendentes; o utilizador aceita na UI ou no gutter do editor.',
    '',
    '### Fluxo obrigatório',
    'Explorar (se preciso) → editar com tool → testar (se aplicável) → resumo final curto.',
    'Proibido: responder só com passos manuais quando uma tool resolve o pedido.',
  ].join('\n')
}

/** Resumo do turno Core para o agente executar (handoff). */
export function buildCoreHandoffBlock(
  resultado: LunaCoreResultado,
): string {
  const texto = resultado.resposta?.texto?.trim()
  const intencao = resultado.analise?.analise?.intencao
  const acao = resultado.pipeline?.politica?.acao
  const modo = resultado.pipeline?.politica?.modo

  const lines = [
    '## Handoff Luna Core → Agente Forge',
    '',
    'A **Luna Core** já analisou este turno. **Executa** com tools — não repitas só instruções manuais.',
  ]
  if (intencao) lines.push(`- **Intenção Core:** ${intencao}`)
  if (acao) lines.push(`- **Política Core:** ${acao}`)
  if (modo) lines.push(`- **Modo Core:** ${modo}`)
  if (texto) {
    lines.push('', '**Orientação da Core (resumo):**', texto.slice(0, 2_500))
  }
  return lines.join('\n')
}

export function shouldContinueToForgeAgent(
  route: ForgeTurnRoute,
  resultado: LunaCoreResultado,
  userText: string,
  mentions: IdeAttachedContext[],
  composerMode: ForgeComposerMode,
): boolean {
  if (composerMode === 'chat' || route === 'luna_core_chat') return false
  if (route === 'light_review') return false
  if (route === 'forge_agent') return true
  return shouldRunIdeAgentLoop(resultado, userText, mentions, composerMode)
}

export type BuildForgeAgentContextInput = {
  userQuery: string
  mentions?: IdeAttachedContext[]
  ragEnabled?: boolean
  coreResult?: LunaCoreResultado
}

/** Contexto completo para o agente Forge (interpretação + workspace). */
export async function buildForgeAgentContext(
  input: BuildForgeAgentContextInput,
): Promise<string> {
  const mentions = input.mentions ?? []
  const interpreter = buildForgeAgentInterpreterBlock()
  const handoff = input.coreResult
    ? buildCoreHandoffBlock(input.coreResult)
    : undefined
  const host = getIdeTurnHost()
  const snapshot = host?.getSnapshot()

  if (!snapshot?.workspaceRoot?.trim()) {
    const sessionMeta = compileForgeSessionMeta()
    return [
      sessionMeta,
      handoff,
      interpreter,
      '**Workspace:** nenhuma pasta aberta — pede ao utilizador para abrir uma pasta no explorador antes de editar ficheiros.',
    ]
      .filter(Boolean)
      .join('\n\n---\n\n')
  }

  const workspace = await compileIdeContextBlock({
    snapshot,
    userQuery: input.userQuery,
    ragEnabled: input.ragEnabled ?? false,
    mentions,
    compact: false,
  })

  return [handoff, interpreter, workspace].filter(Boolean).join('\n\n---\n\n')
}

export function forgeAgentTurnStatusHint(route: ForgeTurnRoute): string {
  switch (route) {
    case 'forge_agent':
      return 'A analisar o workspace e a memória…'
    case 'light_review':
      return 'A analisar o ficheiro…'
    case 'luna_core_chat':
      return 'A analisar e consultar memória…'
  }
}
