/** Opções do pipeline Luna Core (IPC Orbit → main). */
import type { LunaLocalLlmProfile } from '../lib/lunaLocalLlmProfile'

export type LunaCorePipelineBilling = {
  planId: string
  usedTurns: number
  /** null = ilimitado (BYOK) */
  turnQuota: number | null
}

export type LunaCoreByokMeta = {
  activeProviderId: string | null
  providers: Record<
    string,
    {
      baseUrl?: string
      modelMenor?: string
      modelMaior?: string
      connected?: boolean
    }
  >
}

export type LunaCoreForgeMeta = {
  workbench: 'ide'
  composerMode: 'agent' | 'chat'
  autoApplyPatches: boolean
}

export type LunaCorePipelineOptions = {
  /**
   * V2.3 — superfície de origem da chamada. Alimenta o EstadoPresenca do Luna
   * Core (fonte da verdade da localização). 'desktop' = chat normal do Orbit,
   * 'forge' = Luna Forge (IDE).
   */
  ambiente?: 'desktop' | 'forge'
  /** V2.3 — detalhe legível do ambiente (ex.: nome do projeto/workspace no Forge). */
  detalhe_ambiente?: string
  /** Snapshot Markdown do workspace IDE (Orbit). */
  contexto_ide?: string
  /** Metadados estruturados da sessão Forge (opcional — também em `contexto_ide`). */
  forge?: LunaCoreForgeMeta
  /** Força LM Studio/Ollama local (fallback quando cota esgotada). */
  forceLocal?: boolean
  /** Metering cloud (P3). */
  billing?: LunaCorePipelineBilling
  /** P5 BYOK — uid Firebase para o main process carregar chaves do cofre. */
  byokUid?: string
  /** Metadados do provedor activo (sem chave API). */
  byokMeta?: LunaCoreByokMeta
  /** Pedir raciocínio explícito ao modelo maior (default: true). */
  reasoningEnabled?: boolean
  /** Perfil LM Studio/Ollama da UI (localStorage) — precedência sobre .env. */
  localLlmProfile?: LunaLocalLlmProfile
}
