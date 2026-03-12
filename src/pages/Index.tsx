// src/pages/Index.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import GameBackground from "../components/GameBackground";
import LanguageToggle from "../components/LanguageToggle";
import { Gamepad2, BarChart3, Users, Globe, ChevronDown, ChevronUp, Presentation } from "lucide-react";

const Index: React.FC = () => {
  const { t } = useTranslation();
  const [showDemo, setShowDemo] = useState(false);

  return (
    <GameBackground>
      <div className="flex flex-col min-h-screen p-4 relative z-10">
        {/* Language toggle — top-right, always visible */}
        <div className="flex justify-end pt-2 pr-1">
          <LanguageToggle />
        </div>

        <div className="flex-grow flex flex-col items-center justify-center">
          {/* Hero */}
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-7xl font-extrabold text-brightboost-navy mb-3 drop-shadow-sm tracking-tight">
              {t("landing.title")}
            </h1>
            <p className="text-xl md:text-2xl text-brightboost-navy font-semibold">
              {t("landing.subtitle")}
            </p>
            <p className="text-base md:text-lg text-brightboost-navy/70 mt-1 max-w-lg mx-auto">
              {t("landing.tagline")}
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 max-w-2xl w-full px-2">
            {[
              { icon: Gamepad2, key: "landing.feat1" },
              { icon: BarChart3, key: "landing.feat2" },
              { icon: Users, key: "landing.feat3" },
              { icon: Globe, key: "landing.feat4" },
            ].map(({ icon: Icon, key }) => (
              <div
                key={key}
                className="bg-white/80 backdrop-blur rounded-xl p-3 text-center shadow-sm"
              >
                <Icon className="w-6 h-6 mx-auto mb-1 text-brightboost-blue" />
                <p className="text-xs md:text-sm font-medium text-brightboost-navy">
                  {t(key)}
                </p>
              </div>
            ))}
          </div>

          {/* Primary CTAs */}
          <div className="space-y-3 flex flex-col items-center">
            <Link
              to="/teacher/login"
              className="button-shadow rounded-xl px-8 py-4 bg-brightboost-blue text-white font-bold text-center text-lg hover:bg-opacity-90 hover:scale-105 transition-all w-64 ui-lift"
            >
              {t("landing.imATeacher")}
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

          {/* Showcase link for partners */}
          <Link
            to="/showcase"
            className="mt-4 flex items-center gap-2 text-sm text-brightboost-navy/70 hover:text-brightboost-navy transition-colors"
          >
            <Presentation className="w-4 h-4" />
            {t("landing.viewShowcase")}
          </Link>

          {/* Demo / Partner section */}
          <div className="mt-8 max-w-md w-full">
            <button
              onClick={() => setShowDemo(!showDemo)}
              className="flex items-center justify-center gap-2 mx-auto text-sm text-brightboost-navy/70 hover:text-brightboost-navy transition-colors"
            >
              {t("landing.demoToggle")}
              {showDemo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showDemo && (
              <div className="mt-3 bg-white/90 backdrop-blur rounded-xl p-5 shadow-md text-sm text-brightboost-navy space-y-3">
                <p className="font-semibold">{t("landing.demoTitle")}</p>
                <div className="space-y-1 text-xs font-mono bg-gray-50 rounded-lg p-3">
                  <p>{t("landing.demoTeacher")}: <strong>teacher@school.com</strong> / <strong>password123</strong></p>
                  <p>{t("landing.demoStudent")}: <strong>student@test.com</strong> / <strong>password</strong></p>
                </div>
                <p className="text-xs text-gray-600">{t("landing.demoPath")}</p>
              </div>
            )}
          </div>
        </div>

        <footer className="text-center py-4 text-sm text-brightboost-navy/70 space-x-2">
          <Link to="/privacy" className="hover:underline">
            {t("landing.privacy")}
          </Link>
          <span>|</span>
          <Link to="/terms" className="hover:underline">
            {t("landing.terms")}
          </Link>
        </footer>
      </div>
    </GameBackground>
  );
};

export default Index;
