import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import es from './es.json'

export const SUPPORTED_LANGUAGES = ['es', 'en']
const DEFAULT_LANGUAGE = 'es'
const STORAGE_KEY = 'astrohealth.lang'

function readStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return SUPPORTED_LANGUAGES.includes(stored) ? stored : DEFAULT_LANGUAGE
  } catch {
    // localStorage may be unavailable (private mode, blocked storage).
    return DEFAULT_LANGUAGE
  }
}

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: readStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false }, // React already escapes
})

document.documentElement.lang = i18n.language

i18n.on('languageChanged', (lang) => {
  document.documentElement.lang = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // Ignore: the choice will not persist across reloads.
  }
})

export default i18n
