/** Subconjunto tipado de ResultadoCompleto (Luna Core) consumido pelo Orbit. */

export type LunaCoreResposta = {
  texto?: string
  modelo?: string
  latencia_ms?: number
  raciocinio?: string
}

export type LunaCoreAnalise = {
  analise?: {
    intencao?: string
    nivel_risco?: string
    complexidade?: string
  }
  /** Profundidade do tálamo (simples | moderado | complexo | critico). */
  profundidade?: string
}

export type LunaCorePolitica = {
  acao?: string
  tom?: string
  modo?: string
}

export type LunaCoreMemoria = {
  decisao?: {
    acao?: string
    tipo?: string
    motivo?: string
  }
}

export type LunaCorePipeline = {
  politica?: LunaCorePolitica
}

export type LunaCoreBillingMeta = {
  isCoreLocal?: boolean
  quotaFallbackLocal?: boolean
  usedCloud?: boolean
  byokMissing?: boolean
}

export type LunaCoreResultado = {
  pipeline?: LunaCorePipeline
  analise?: LunaCoreAnalise
  memoria?: LunaCoreMemoria
  resposta?: LunaCoreResposta
  /** Narrativa PT do pipeline PAIA — timeline rodada 1. */
  narrativa_pipeline?: string
  sessao?: { id?: string }
  log_path?: string
  error?: string
  quotaExceeded?: boolean
  billingMeta?: LunaCoreBillingMeta
}
