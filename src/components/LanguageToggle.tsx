import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const LANGUAGE_KEY = "preferredLanguage";

const LanguageToggle = () => {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(
    localStorage.getItem(LANGUAGE_KEY) || "en",
  );
  const ENABLE_I18N = import.meta.env.VITE_ENABLE_I18N === "true";

  const toggleLanguage = async () => {
    const newLanguage = language === "en" ? "es" : "en";
    setLanguage(newLanguage);

    if (!ENABLE_I18N) return;

    try {
      const translations = await import(
        `../locales/${newLanguage}/common.json`
      );
      if (!i18n.hasResourceBundle(newLanguage, "translation")) {
        i18n.addResourceBundle(
          newLanguage,
          "translation",
          translations.default,
        );
      }
      await i18n.changeLanguage(newLanguage);
      localStorage.setItem(LANGUAGE_KEY, newLanguage);
    } catch (err) {
      console.warn(`Could not load translations for ${newLanguage}`, err);
    }
  };

  useEffect(() => {
    if (ENABLE_I18N) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n, ENABLE_I18N]);

  return (
    <button
      onClick={toggleLanguage}
      className="bg-brightboost-yellow hover:bg-yellow-300 text-sm px-3 py-1 rounded"
    >
      {language === "en" ? "Español" : "English"}
    </button>
  );
};

export default LanguageToggle;
