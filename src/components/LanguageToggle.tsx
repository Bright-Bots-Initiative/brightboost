import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const LANGUAGE_KEY = "preferredLanguage";

const LanguageToggle = () => {
  const { i18n } = useTranslation();
  // Using a tick state to force re-render when language changes
  const [, setTick] = useState(0);

  // Handle potential whitespace in env var
  const envVal = import.meta.env.VITE_ENABLE_I18N;
  const ENABLE_I18N = typeof envVal === "string" && envVal.trim() === "true";

  useEffect(() => {
    if (!ENABLE_I18N) return;

    const handleLanguageChanged = () => {
      setTick((t) => t + 1);
    };

    i18n.on("languageChanged", handleLanguageChanged);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, [i18n, ENABLE_I18N]);

  const toggleLanguage = () => {
    if (!ENABLE_I18N) return;

    const currentLang = i18n.resolvedLanguage || i18n.language;
    const newLanguage = currentLang === "en" ? "es" : "en";

    // Attempt to change language
    i18n.changeLanguage(newLanguage)
      .then(() => {
        localStorage.setItem(LANGUAGE_KEY, newLanguage);
      })
      .catch((err) => {
        console.warn(`Failed to change language to ${newLanguage}`, err);
      });
  };

  if (!ENABLE_I18N) {
    return null;
  }

  const currentLang = i18n.resolvedLanguage || i18n.language;

  return (
    <button
      onClick={toggleLanguage}
      className="bg-brightboost-yellow hover:bg-yellow-300 text-sm px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
      aria-label={currentLang === "en" ? "Switch to Spanish" : "Switch to English"}
    >
      {currentLang === "en" ? "Español" : "English"}
    </button>
  );
};

export default LanguageToggle;
