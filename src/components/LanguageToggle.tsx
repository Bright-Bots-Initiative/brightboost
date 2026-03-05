import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const LANGUAGE_KEY = "preferredLanguage";

const LanguageToggle = () => {
  const { i18n } = useTranslation();
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleLanguageChanged = () => {
      setTick((t) => t + 1);
    };

    i18n.on("languageChanged", handleLanguageChanged);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, [i18n]);

  const toggleLanguage = () => {
    const currentLang = i18n.resolvedLanguage || i18n.language;
    const newLanguage = currentLang === "en" ? "es" : "en";

    i18n
      .changeLanguage(newLanguage)
      .then(() => {
        localStorage.setItem(LANGUAGE_KEY, newLanguage);
      })
      .catch((err) => {
        console.warn(`Failed to change language to ${newLanguage}`, err);
      });
  };

  const currentLang = i18n.resolvedLanguage || i18n.language;

  return (
    <button
      onClick={toggleLanguage}
      className="bg-brightboost-yellow hover:bg-yellow-300 text-sm px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
      aria-label={
        currentLang === "en" ? "Switch to Spanish" : "Switch to English"
      }
    >
      {currentLang === "en" ? "Español" : "English"}
    </button>
  );
};

export default LanguageToggle;
