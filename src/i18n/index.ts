import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { readUiLocale, subscribeUiLocale } from '../translation/preferences'
import { loadDynamicTranslations } from './dynamicLoader'
import type { LunaLocaleId } from '../translation/types'

import pt from './locales/pt.json'
import en from './locales/en.json'

const resources = {
  pt: { translation: pt },
  en: { translation: en },
}

i18n.use(initReactI18next).init({
  resources,
  lng: readUiLocale() || 'pt',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

subscribeUiLocale(() => {
  const newLocale = readUiLocale()
  if (!newLocale || newLocale === i18n.language) return

  // Mudar a linguagem de imediato (pode cair pro fallback enquanto carrega)
  i18n.changeLanguage(newLocale)

  // Disparar o Loader em background e injetar se retornar sucesso
  if (newLocale !== 'en' && newLocale !== 'pt') {
    void loadDynamicTranslations(newLocale as LunaLocaleId).then((translatedBundle) => {
      if (translatedBundle) {
        i18n.addResourceBundle(newLocale, 'translation', translatedBundle, true, true)
        // Força re-render caso o i18n.language ainda seja o novo
        if (i18n.language === newLocale) {
          i18n.changeLanguage(newLocale) 
        }
      }
    })
  }
})

// Na primeira carga (boot do app), também carrega se estivermos num dynamic locale.
const bootLocale = readUiLocale()
if (bootLocale && bootLocale !== 'en' && bootLocale !== 'pt') {
  void loadDynamicTranslations(bootLocale as LunaLocaleId).then((translatedBundle) => {
    if (translatedBundle) {
      i18n.addResourceBundle(bootLocale, 'translation', translatedBundle, true, true)
      if (i18n.language === bootLocale) i18n.changeLanguage(bootLocale)
    }
  })
}

export default i18n
