import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import hi from './locales/hi.json'
import mr from './locales/mr.json'

const savedLang = localStorage.getItem('tomatoLanguage') || 'en'

i18next
  .use(initReactI18next)
  .init({
    lng: savedLang,
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
    },
    interpolation: { escapeValue: false },
  })

export default i18next
