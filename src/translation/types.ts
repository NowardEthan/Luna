/** Idiomas suportados pela camada de tradução (ISO 639-1). */
export type LunaLocaleId =
  | 'pt'
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'it'
  | 'ja'
  | 'ko'
  | 'zh'

export type TranslateRequest = {
  text: string
  to: LunaLocaleId
  from?: LunaLocaleId
}

export type TranslateResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

/** Resultado de localizar texto para o idioma da interface. */
export type LocalizedText = {
  text: string
  textOriginal?: string
  translated?: boolean
  locale: LunaLocaleId
}

export type LocalizeOptions = {
  /** Destino; default = idioma da UI */
  to?: LunaLocaleId
  /** Origem explícita; omitir = deteção heurística */
  from?: LunaLocaleId
  /** Traduzir mesmo quando a heurística não deteta idioma */
  force?: boolean
  /** Comprimento mínimo para tentar traduzir */
  minLength?: number
}
