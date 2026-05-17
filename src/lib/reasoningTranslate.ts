/**
 * @deprecated Importar de `../translation` — reexport de compatibilidade.
 */
export {
  detectLocale as detectReasoningLang,
  isClearlyPortuguese,
  isLikelyEnglish,
  localizeText,
  normalizeReasoningForDisplay,
  readAutoTranslateEnabled as readReasoningTranslateEnabled,
  readUiLocale as readReasoningDisplayLang,
  shouldLocalize as shouldTranslateReasoning,
  translateText as translateReasoningText,
  writeAutoTranslateEnabled as writeReasoningTranslateEnabled,
  writeUiLocale as writeReasoningDisplayLang,
} from '../translation'
