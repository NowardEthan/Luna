import type { LunaCoreForgeMeta } from '../types/lunaCorePipeline'
import { readForgeComposerMode } from './forgeComposerMode'
import { readIdeAutoApply } from './ideContextConfig'
import { readWorkbenchMode } from './workbenchMode'

/** Bloco Markdown injectado no início do `contexto_ide` para o Luna Core. */
export function compileForgeSessionMeta(): string | undefined {
  if (readWorkbenchMode() !== 'ide') return undefined

  const composerMode = readForgeComposerMode()
  const autoApply = readIdeAutoApply()
  const isAgent = composerMode === 'agent'

  const lines = [
    '**Orbit — Luna Forge (sessão IDE)**',
    '- **Interface:** Luna Forge no Orbit (editor CodeMirror, terminal, git, explorador, painel IA).',
    '- **Não é chat simples:** o utilizador pode estar a editar código no mesmo ecrã.',
    `- **Modo do composer:** **${isAgent ? 'Agente' : 'Chat'}**.`,
  ]

  if (isAgent) {
    lines.push(
      '- **Modo Agente (Forge):** tu (Luna Core) analisas primeiro; depois o agente Orbit executa tools se o pedido exigir acção no disco.',
      '- **PROIBIDO:** instruir o utilizador a clicar «Novo ficheiro» no explorador — o agente usa `write_file` / `apply_patch`.',
      '- **Comportamento:** classifica `pedido_codigo` / `usar_ferramenta` para delegar ao agente; conversa casual respondes tu.',
    )
  } else {
    lines.push(
      '- **Modo Chat:** o utilizador desactivou o agente automático de ferramentas neste turno.',
      '- **Comportamento:** conversa e explicação; não assumes que ficheiros serão alterados nem que comandos serão executados.',
      '- **Política sugerida:** `conversa_casual` ou `explicacao` — só sugerir edições se o utilizador pedir explicitamente.',
    )
  }

  lines.push(
    `- **Auto-apply de patches:** ${autoApply ? 'ligado (alterações do agente podem gravar directo no disco)' : 'desligado (utilizador revê e aceita na UI)'}.`,
    '- **Ferramentas:** tu (Luna Core) analisas e respondes; a execução de tools no disco é responsabilidade do agente Orbit quando em modo Agente.',
  )

  return lines.join('\n')
}

export function buildForgePipelineMeta(): LunaCoreForgeMeta | undefined {
  if (readWorkbenchMode() !== 'ide') return undefined
  return {
    workbench: 'ide',
    composerMode: readForgeComposerMode(),
    autoApplyPatches: readIdeAutoApply(),
  }
}
