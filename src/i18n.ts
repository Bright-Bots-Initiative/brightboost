import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import esCommon from "./locales/es/common.json";

const LANGUAGE_KEY = "preferredLanguage";
const storedLanguage = localStorage.getItem(LANGUAGE_KEY);

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: enCommon,
    },
    es: {
      translation: esCommon,
    },
  },
  lng: storedLanguage || "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
