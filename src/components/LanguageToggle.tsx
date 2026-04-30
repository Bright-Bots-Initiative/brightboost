import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { changeLanguage, SUPPORTED_LANGUAGES } from "@/i18n";

type LanguageToggleProps = {
  variant?: "light" | "dark";
};

const LanguageToggle = ({ variant = "light" }: LanguageToggleProps) => {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    i18n.on("languageChanged", handler);
    return () => { i18n.off("languageChanged", handler); };
  }, [i18n]);

  const currentLang = i18n.resolvedLanguage || i18n.language;
  const currentLabel = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.label ?? "English";

  const triggerClass =
    variant === "dark"
      ? "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700 text-sm px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 focus:ring-offset-slate-900 font-medium"
      : "bg-brightboost-yellow hover:bg-yellow-300 text-sm px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 font-medium";

  const menuClass =
    variant === "dark"
      ? "absolute right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg z-50 min-w-[140px] py-1"
      : "absolute right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[140px] py-1";

  const itemActive =
    variant === "dark"
      ? "font-bold text-indigo-300 bg-slate-800"
      : "font-bold text-brightboost-navy bg-slate-50";
  const itemIdle =
    variant === "dark" ? "text-slate-300" : "text-slate-700";
  const itemHover =
    variant === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-50";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={triggerClass}
        aria-label={t("common.changeLanguage", { defaultValue: "Change language" })}
        aria-expanded={open}
      >
        {currentLabel}
      </button>
      {open && (
        <div className={menuClass}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                changeLanguage(lang.code);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm ${itemHover} ${
                currentLang === lang.code ? itemActive : itemIdle
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
