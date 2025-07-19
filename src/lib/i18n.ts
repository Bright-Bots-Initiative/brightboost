import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import resourcesToBackend from "i18next-resources-to-backend";

const LANGUAGE_KEY = "preferredLanguage";
const fallbackLng = "en";

const getInitialLanguage = (): string => {
  const storedLang = localStorage.getItem(LANGUAGE_KEY);
  const browserLang = navigator.language?.split("-")[0];
  return storedLang || browserLang || fallbackLng;
};

const selectedLang = getInitialLanguage();
console.log("Detected initial language:", selectedLang);

i18n
  .use(resourcesToBackend((lng, ns) =>
    import(`../locales/${lng}/${ns}.json`)
  ))
  .use(initReactI18next)
  .init({
    lng: selectedLang,
    fallbackLng,
    supportedLngs: ["en", "es"],
    ns: ["common"],
    defaultNS: "common",
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false,
    },
    load: "languageOnly",
  });

export default i18n;
