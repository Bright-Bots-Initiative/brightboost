import { useState } from "react";
import { useTranslation } from "react-i18next";

const LANGUAGE_KEY = "preferredLanguage";

const LanguageToggle = () => {
  const { i18n } = useTranslation();
  // Initialize state from i18n.language which is the source of truth,
  // falling back to localStorage or "en" if somehow i18n isn't ready (though it should be).
  const [language, setLanguage] = useState(
    i18n.language || localStorage.getItem(LANGUAGE_KEY) || "en",
  );
  const ENABLE_I18N = import.meta.env.VITE_ENABLE_I18N === "true";

  const toggleLanguage = () => {
    // If not enabled, we shouldn't even render, but just in case.
    if (!ENABLE_I18N) return;

    // Toggle logic
    const newLanguage = language === "en" ? "es" : "en";

    // Attempt to change language
    i18n.changeLanguage(newLanguage)
      .then(() => {
        // Only update state and storage if change was successful
        setLanguage(newLanguage);
        localStorage.setItem(LANGUAGE_KEY, newLanguage);
      })
      .catch((err) => {
        console.warn(`Failed to change language to ${newLanguage}`, err);
        // Keep current language state
      });
  };

  if (!ENABLE_I18N) {
    return null;
  }

  return (
    <button
      onClick={toggleLanguage}
      className="bg-brightboost-yellow hover:bg-yellow-300 text-sm px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
      aria-label={language === "en" ? "Switch to Spanish" : "Switch to English"}
    >
      {language === "en" ? "Español" : "English"}
    </button>
  );
};

export default LanguageToggle;
