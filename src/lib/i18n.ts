import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const LANGUAGE_KEY = "preferredLanguage";
const fallbackLng = "en";

const getInitialLanguage = (): string => {
  const storedLang = localStorage.getItem(LANGUAGE_KEY);
  const browserLang = navigator.languages?.[0]?.split("-")[0];
  return storedLang || browserLang || fallbackLng;
};

const selectedLang = getInitialLanguage();

console.log("Detected initial language:", selectedLang);

if (import.meta.env.VITE_ENABLE_I18N === "true") {
  const initWithTranslations = (
    lang: string,
    translations: Record<string, any>
  ) => {
    if (!i18n.isInitialized) {
      i18n
        .use(initReactI18next)
        .init({
          lng: lang,
          fallbackLng,
          debug: import.meta.env.DEV,
          interpolation: { escapeValue: false },
          load: "languageOnly",
          resources: {
            [lang]: {
              translation: translations.default,
            },
          },
        })
        .then(() => {
          console.log(`i18next initialized with ${lang}`);
        })
        .catch((err) => {
          console.error(`Error initializing i18n for ${lang}:`, err);
        });
    }
  };

  import(`../locales/${selectedLang}/common.json`)
    .then((translations) => {
      initWithTranslations(selectedLang, translations);
    })
    .catch((err) => {
      console.warn(
        `Could not load locale "${selectedLang}", falling back to "${fallbackLng}"`,
        err
      );
      import(`../locales/${fallbackLng}/common.json`)
        .then((fallbackTranslations) => {
          initWithTranslations(fallbackLng, fallbackTranslations);
        })
        .catch((fallbackErr) => {
          console.error("Error loading fallback language:", fallbackErr);
        });
    });
}

export default i18n;

