import { translateText } from '../translation/service'
import type { LunaLocaleId } from '../translation/types'
import enJson from './locales/en.json'

const STORAGE_KEY_PREFIX = 'luna-i18n-dynamic-v2-'

// Transforma JSON aninhado em chave-valor 1D
function flattenObject(ob: any): Record<string, string> {
  const toReturn: Record<string, string> = {}
  for (const i in ob) {
    if (!ob.hasOwnProperty(i)) continue
    if (typeof ob[i] === 'object' && ob[i] !== null) {
      const flatObject = flattenObject(ob[i])
      for (const x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue
        toReturn[i + '.' + x] = flatObject[x]
      }
    } else {
      toReturn[i] = ob[i]
    }
  }
  return toReturn
}

// Reconstrói o JSON 1D de volta para objetos aninhados (para i18next)
function unflattenObject(ob: Record<string, string>): any {
  const result: any = {}
  for (const i in ob) {
    if (!ob.hasOwnProperty(i)) continue
    const keys = i.split('.')
    let current = result
    for (let j = 0; j < keys.length - 1; j++) {
      if (!current[keys[j]]) current[keys[j]] = {}
      current = current[keys[j]]
    }
    current[keys[keys.length - 1]] = ob[i]
  }
  return result
}

export async function loadDynamicTranslations(locale: LunaLocaleId): Promise<any | null> {
  // Se for idioma core (pt ou en), eles já existem no bundle nativamente, aborta.
  if (locale === 'en' || locale === 'pt') return null

  // 1. Tentar ler do Cache Local primeiro
  const cacheKey = STORAGE_KEY_PREFIX + locale
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    try {
      return JSON.parse(cached)
    } catch {
      // Falhou parse, ignorar e buscar novo
    }
  }

  // 2. Não temos no cache, gerar usando a API de Tradução Universal
  const flatEn = flattenObject(enJson)
  const keys = Object.keys(flatEn)
  const values = keys.map(k => flatEn[k])

  // Separador muito difícil de ser destruido pelo Google Translate
  const SEPARATOR = '\n\n|#@#|\n\n'
  const textPayload = values.join(SEPARATOR)

  try {
    const res = await translateText(textPayload, { to: locale, from: 'en' })
    if (!res.ok) {
      console.error('Falha ao obter traduções dinâmicas da UI:', res.error)
      return null
    }

    const translatedArray = res.text.split(/\|#@#\|/i).map(t => t.trim())

    if (translatedArray.length !== keys.length) {
      console.warn('O tradutor corrompeu o separador. Descartando tradução parcial.')
      return null
    }

    const newFlatJson: Record<string, string> = {}
    keys.forEach((key, index) => {
      newFlatJson[key] = translatedArray[index]
    })

    const newJson = unflattenObject(newFlatJson)
    
    // Salva no cache
    localStorage.setItem(cacheKey, JSON.stringify(newJson))
    
    return newJson
  } catch (err) {
    console.error('Erro na requisição de dynamic i18n:', err)
    return null
  }
}
