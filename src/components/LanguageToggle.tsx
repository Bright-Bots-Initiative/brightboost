import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { changeLanguage, SUPPORTED_LANGUAGES } from "@/i18n";

const LanguageToggle = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    i18n.on("languageChanged", handler);
    return () => { i18n.off("languageChanged", handler); };
  }, [i18n]);

  const currentLang = i18n.resolvedLanguage || i18n.language;
  const currentLabel = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.label ?? "English";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="bg-brightboost-yellow hover:bg-yellow-300 text-sm px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 font-medium"
        aria-label="Change language"
        aria-expanded={open}
      >
        {currentLabel}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[140px] py-1">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                changeLanguage(lang.code);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                currentLang === lang.code ? "font-bold text-brightboost-navy bg-slate-50" : "text-slate-700"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageToggle;
