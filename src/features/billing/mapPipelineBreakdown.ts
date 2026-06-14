import type { LunaCoreResultado } from '../../types/lunaCoreResult'
import type { LunaUsageBreakdownKey } from './lunaCloudTurnPolicy'

const COMPLEXIDADE_MAP: Record<string, LunaUsageBreakdownKey> = {
  baixa: 'baixo',
  baixo: 'baixo',
  simples: 'baixo',
  moderada: 'moderado',
  moderado: 'moderado',
  media: 'moderado',
  alta: 'alto',
  alto: 'alto',
  complexo: 'alto',
  critica: 'profundo',
  critico: 'profundo',
  profundo: 'profundo',
}

const PROFUNDIDADE_MAP: Record<string, LunaUsageBreakdownKey> = {
  simples: 'baixo',
  moderado: 'moderado',
  complexo: 'alto',
  critico: 'profundo',
}

/** Mapeia saída do pipeline (tálamo / análise) para chave do breakdown Firestore. */
export function mapPipelineToBreakdownKey(
  resultado: LunaCoreResultado,
): LunaUsageBreakdownKey {
  const prof = resultado.analise?.profundidade?.toLowerCase()
  if (prof && PROFUNDIDADE_MAP[prof]) {
    return PROFUNDIDADE_MAP[prof]!
  }

  const complex = resultado.analise?.analise?.complexidade?.toLowerCase()
  if (complex && COMPLEXIDADE_MAP[complex]) {
    return COMPLEXIDADE_MAP[complex]!
  }

  return 'moderado'
}
