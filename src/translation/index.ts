/**
 * Camada global de tradução da Luna.
 * Motor no Electron (`translation:translate`); UI e agente usam `localizeText` / `translateText`.
 */

export type {
  LocalizeOptions,
  LocalizedText,
  LunaLocaleId,
  TranslateRequest,
  TranslateResult,
} from './types'

export { LUNA_LOCALES, isLunaLocaleId, localeLabel } from './locales'

export {
  buildAssistantLanguageDirective,
  buildAnalysisChannelInstruction,
  buildReasoningFieldInstruction,
  buildReasoningLanguageInstruction,
  buildSimpleChatAnswerInstructions,
  buildSimpleChatSystemPrompt,
  googleTranslateLanguageCode,
  localeIntlTag,
  localeReasoningLanguagePhrase,
  localeResponseLanguagePhrase,
} from './localePrompts'
export type { LunaLocaleOption } from './locales'

export {
  readAutoTranslateEnabled,
  readUiLocale,
  subscribeUiLocale,
  writeAutoTranslateEnabled,
  writeUiLocale,
} from './preferences'

export {
  detectLocale,
  isClearlyPortuguese,
  isLikelyEnglish,
  localesMatchSource,
} from './detect'

export { invokeTranslation } from './client'

export { localizeText, shouldLocalize, translateText } from './service'

/** Pensamento do modelo — mesmo pipeline que o resto da app. */
export { normalizeReasoningForDisplay } from './reasoning'
