import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const LANGUAGE_KEY = 'preferredLanguage';
const fallbackLng = 'en';

const getInitialLanguage = (): string => {
  const storedLang = localStorage.getItem(LANGUAGE_KEY);
  const browserLang = navigator.languages?.[0]?.split('-')[0];
  return storedLang || browserLang || fallbackLng;
};

const selectedLang = getInitialLanguage();
console.log('Detected initial language:', selectedLang);
if (import.meta.env.VITE_ENABLE_I18N === 'true') {
  import(`../locales/${selectedLang}/common.json`)
    .then((translations) => {
      if (!i18n.isInitialized) {
        i18n
          .use(initReactI18next)
          .init({
            lng: selectedLang,
            fallbackLng,
            debug: import.meta.env.DEV,
            interpolation: { escapeValue: false },
            load: 'languageOnly',
            resources: {
              [selectedLang]: {
                translation: translations.default,
              },
            },
          })
          .then(() => {
            console.log(`i18next initialized with ${selectedLang}`);
          })
          .catch((err) => {
            console.error('Error initializing i18n:', err);
          });
      }
    })
    .catch((err) => {
      console.warn(`Could not load locale "${selectedLang}", falling back to "${fallbackLng}"`, err);
      import(`../locales/${fallbackLng}/common.json`)
        .then((translations) => {
          i18n
            .use(initReactI18next)
            .init({
              lng: fallbackLng,
              fallbackLng,
              debug: import.meta.env.DEV,
              interpolation: { escapeValue: false },
              load: 'languageOnly',
              resources: {
                [fallbackLng]: {
                  translation: translations.default,
                },
              },
            })
            .then(() => {
              console.log(`i18next initialized with fallback language: ${fallbackLng}`);
            })
            .catch((err) => {
              console.error('Error initializing i18n with fallback language:', err);
            });
        })
        .catch((err) => {
          console.error('Error loading fallback language:', err);
        });
    });
}

export default i18n;