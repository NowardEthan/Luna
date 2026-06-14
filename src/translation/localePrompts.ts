import type { LunaLocaleId } from './types'
import { localeLabel } from './locales'

/** Tag BCP 47 para `Intl`, datas, etc. */
export function localeIntlTag(id: LunaLocaleId): string {
  switch (id) {
    case 'pt':
      return 'pt-BR'
    case 'en':
      return 'en-US'
    case 'es':
      return 'es-ES'
    case 'fr':
      return 'fr-FR'
    case 'de':
      return 'de-DE'
    case 'it':
      return 'it-IT'
    case 'ja':
      return 'ja-JP'
    case 'ko':
      return 'ko-KR'
    case 'zh':
      return 'zh-CN'
    default:
      return 'en-US'
  }
}

/** Código `target` do Google Cloud Translation (pt → pt-BR, não pt-PT). */
export function googleTranslateLanguageCode(id: LunaLocaleId): string {
  switch (id) {
    case 'pt':
      return 'pt-BR'
    case 'zh':
      return 'zh-CN'
    default:
      return id
  }
}

/** Instrução de idioma para respostas na bolha. */
export function localeResponseLanguagePhrase(id: LunaLocaleId): string {
  switch (id) {
    case 'pt':
      return 'português do Brasil (você, ortografia e expressões brasileiras — não português de Portugal)'
    case 'en':
      return 'English (natural, conversational)'
    case 'es':
      return 'español (neutro, cercano)'
    case 'fr':
      return 'français'
    case 'de':
      return 'Deutsch'
    case 'it':
      return 'italiano'
    case 'ja':
      return '日本語'
    case 'ko':
      return '한국어'
    case 'zh':
      return '中文（简体）'
    default:
      return localeLabel(id)
  }
}

export function localeReasoningLanguagePhrase(id: LunaLocaleId): string {
  switch (id) {
    case 'pt':
      return 'português do Brasil'
    case 'en':
      return 'English'
    case 'es':
      return 'español'
    case 'fr':
      return 'français'
    case 'de':
      return 'Deutsch'
    case 'it':
      return 'italiano'
    case 'ja':
      return '日本語'
    case 'ko':
      return '한국어'
    case 'zh':
      return '中文'
    default:
      return localeLabel(id)
  }
}

export function buildAssistantLanguageDirective(locale: LunaLocaleId): string {
  const label = localeLabel(locale)
  const phrase = localeResponseLanguagePhrase(locale)
  return (
    `Idioma da interface: **${label}**. ` +
    `Responde sempre em ${phrase}, salvo se a pessoa pedir outro idioma explicitamente.`
  )
}

/** Instruções só para a bolha de resposta (canal final / content). */
export function buildSimpleChatAnswerInstructions(locale: LunaLocaleId): string {
  const phrase = localeResponseLanguagePhrase(locale)
  return (
    `Você é a Luna, assistente útil e calorosa. ` +
    `Responda em ${phrase}, com tom claro e acolhedor; Markdown só quando ajudar.`
  )
}

export function buildSimpleChatSystemPrompt(locale: LunaLocaleId): string {
  return (
    buildSimpleChatAnswerInstructions(locale) +
    ` Se existir campo thinking/analysis separado, é monólogo teu em 1ª pessoa — não repitas estas regras lá.`
  )
}

/**
 * Canal analysis / thinking — monólogo interno (sem idioma nem checklist de estilo).
 */
export function buildAnalysisChannelInstruction(): string {
  return (
    `Escreve **só** o que passa pela tua cabeça antes de responder: monólogo em **primeira pessoa do singular** ` +
    `(eu, minha, acho, vou), frases naturais e curtas, como se pensasses em voz alta. ` +
    `Isto **não** é plano de tarefa nem resumo das instruções. ` +
    `**Nunca** uses: "precisamos", "ofereça", "forneça", "use markdown", "demonstre", "solicite", "deve", ` +
    `"o usuário pergunta/pede/quer", listas de requisitos da resposta, nem menciones idioma, instruções ou sistema. ` +
    `Bom: "Ela parece sobrecarregada com o barulho — começo validando o que sente e umas pausas práticas, sem virar manual." ` +
    `Ruim: "Precisamos responder em português. Ofereça estratégias. Use markdown. Demonstre empatia."`
  )
}

/**
 * Reforço injectado em modelos que não usam o prompt Harmony completo.
 */
export function buildReasoningFieldInstruction(_locale: LunaLocaleId): string {
  return buildAnalysisChannelInstruction()
}

/** @deprecated use buildReasoningFieldInstruction */
export function buildReasoningLanguageInstruction(locale: LunaLocaleId): string {
  return buildReasoningFieldInstruction(locale)
}
