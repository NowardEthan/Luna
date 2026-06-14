import type { Conversation } from '../types/chat'
import type { IdeAttachedContext } from './ideMentions'
import type { LunaCorePipelineOptions } from '../types/lunaCorePipeline'
import { compileIdeContextBlock } from './ideContextCompiler'
import { buildForgeCoreInterpreterBlock } from '../features/ide/forgeAgentInterpreter'
import { readForgeComposerMode } from './forgeComposerMode'
import { buildForgePipelineMeta, compileForgeSessionMeta } from './forgeSessionMeta'
import { getIdeTurnHost } from './ideTurnHost'
import { workspaceDisplayName } from './workspaceSessions'

/** Compila contexto IDE para injectar no pipeline Luna Core. */
export async function compileIdeContextForTurn(
  userQuery: string,
  ragEnabled: boolean,
  mentions: IdeAttachedContext[] = [],
): Promise<string | undefined> {
  const coreInterpreter =
    readForgeComposerMode() === 'agent'
      ? buildForgeCoreInterpreterBlock()
      : undefined
  const host = getIdeTurnHost()
  const snapshot = host?.getSnapshot()

  if (!snapshot?.workspaceRoot?.trim()) {
    return [compileForgeSessionMeta(), coreInterpreter]
      .filter(Boolean)
      .join('\n\n---\n\n')
  }

  const block = await compileIdeContextBlock({
    snapshot,
    userQuery,
    ragEnabled,
    mentions,
  })
  const merged = [coreInterpreter, block].filter(Boolean).join('\n\n---\n\n')
  return merged.trim() || undefined
}

/**
 * Opções do pipeline Core no chat principal.
 *
 * Core como espinha (V2.3): a localização e a narração de transições são
 * responsabilidade do EstadoPresenca no Luna Core. Aqui apenas declaramos a
 * superfície de origem.
 */
export function compileChatPipelineOptions(): LunaCorePipelineOptions {
  return { ambiente: 'desktop' }
}

/** Detalhe legível do workspace activo, para enriquecer a presença no Forge. */
function detalheWorkspace(conv?: Conversation): string | undefined {
  const root = conv?.workspaceRoot ?? getIdeTurnHost()?.getSnapshot()?.workspaceRoot
  return root?.trim() ? `projeto «${workspaceDisplayName(root)}»` : undefined
}

/** Opções completas do pipeline Core no Luna Forge (superfície + workspace). */
export async function compileIdePipelineOptions(
  userQuery: string,
  ragEnabled: boolean,
  mentions: IdeAttachedContext[] = [],
  conv?: Conversation,
): Promise<LunaCorePipelineOptions> {
  const contexto_ide = await compileIdeContextForTurn(userQuery, ragEnabled, mentions)
  const forge = buildForgePipelineMeta()
  const detalhe_ambiente = detalheWorkspace(conv)
  return {
    ambiente: 'forge',
    ...(detalhe_ambiente ? { detalhe_ambiente } : {}),
    ...(contexto_ide ? { contexto_ide } : {}),
    ...(forge ? { forge } : {}),
  }
}
