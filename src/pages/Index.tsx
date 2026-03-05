// src/pages/Index.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import GameBackground from "../components/GameBackground";
import LanguageToggle from "../components/LanguageToggle";

const Index: React.FC = () => {
  const { t } = useTranslation();

  return (
    <GameBackground>
      <div className="flex flex-col min-h-screen p-4 relative z-10">
        {/* Language toggle — top-right, always visible */}
        <div className="flex justify-end pt-2 pr-1">
          <LanguageToggle />
        </div>

        <div className="flex-grow flex flex-col items-center justify-center">
          <div className="text-center mb-10">
            <h1 className="text-5xl md:text-7xl font-extrabold text-brightboost-navy mb-3 drop-shadow-sm tracking-tight">
              {t("landing.title")}
            </h1>
            <p className="text-xl md:text-2xl text-brightboost-navy font-semibold">
              {t("landing.subtitle")}
            </p>
            <p className="text-base md:text-lg text-brightboost-navy/70 mt-1">
              {t("landing.description")}
            </p>
          </div>

          <div className="space-y-4 flex flex-col items-center">
            <Link
              to="/login"
              className="button-shadow rounded-xl px-8 py-4 bg-brightboost-blue text-white font-bold text-center text-lg hover:bg-opacity-90 hover:scale-105 transition-all w-64 ui-lift"
            >
              {t("landing.letsGo")}
            </Link>
            <Link
              to="/class-login"
              className="button-shadow rounded-xl px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-center text-lg hover:scale-105 transition-all w-64 ui-lift"
            >
              {t("landing.imAStudent")} 🎒
            </Link>
            <Link
              to="/signup"
              className="button-shadow rounded-xl px-6 py-3 bg-brightboost-lightblue text-brightboost-navy font-bold text-center hover:bg-opacity-90 hover:scale-105 transition-all w-56 ui-lift"
            >
              {t("landing.imNewHere")}
            </Link>
          </div>
        </div>

        <footer className="text-center py-4 text-sm text-brightboost-navy/70">
          <Link to="/privacy" className="hover:underline">
            {t("landing.privacy")}
          </Link>
          <span className="mx-2">|</span>
          <Link to="/terms" className="hover:underline">
            {t("landing.terms")}
          </Link>
        </footer>
      </div>
    </GameBackground>
  );
};

export default Index;
