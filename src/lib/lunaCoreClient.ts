import type { LunaCoreResultado } from '../types/lunaCoreResult'
import type { LunaCorePipelineOptions } from '../types/lunaCorePipeline'

export async function executarLunaCorePipeline(
  mensagem: string,
  sessaoId?: string,
  opcoes?: LunaCorePipelineOptions,
): Promise<LunaCoreResultado> {
  if (!window.lunaCore?.executarPipeline) {
    throw new Error('Integração com Luna Core ausente. Reinicie o aplicativo.')
  }
  return window.lunaCore.executarPipeline(mensagem, sessaoId, opcoes)
}
