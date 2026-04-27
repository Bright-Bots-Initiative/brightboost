// src/pages/Index.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import GameBackground from "../components/GameBackground";
import LanguageToggle from "../components/LanguageToggle";
import { Gamepad2, BarChart3, Users, Globe, ChevronDown, ChevronUp, Presentation, ClipboardCheck } from "lucide-react";

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
              {t("landing.mainHeadline", {
                defaultValue: "Free STEM Learning for Students, Teachers, Families, and Organizations",
              })}
            </h1>
            <p className="text-xl md:text-2xl text-brightboost-navy font-semibold">
              {t("landing.mainSubheadline", {
                defaultValue:
                  "Bright Boost helps learners build confidence through gamified STEM lessons, adaptive challenges, and future-ready skills.",
              })}
            </p>
            <p className="text-base md:text-lg text-brightboost-navy/70 mt-1 max-w-lg mx-auto">
              {t("landing.mainSupportLine", {
                defaultValue: "Join our first 1,000 users and help shape the future of Bright Boost.",
              })}
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

          {/* Main launch CTAs */}
          <div className="space-y-3 flex flex-col items-center">
            <Link
              to="/signup"
              className="button-shadow rounded-xl px-8 py-4 bg-brightboost-blue text-white font-bold text-center text-lg hover:bg-opacity-90 hover:scale-105 transition-all w-72 ui-lift"
            >
              {t("landing.joinFreeCta", { defaultValue: "Join Bright Boost Free" })}
            </Link>
            <div className="flex flex-col sm:flex-row gap-3 w-72 sm:w-auto">
              <Link
                to="/for-reviewers"
                className="button-shadow rounded-xl px-5 py-3 bg-white/90 text-brightboost-navy font-bold text-center text-base hover:bg-white hover:scale-105 transition-all ui-lift border border-brightboost-lightblue"
              >
                {t("landing.giveFeedbackCta", { defaultValue: "Give Feedback" })}
              </Link>
              <a
                href="mailto:partnerships@brightboost.org?subject=Donate%20to%20Keep%20Bright%20Boost%20Free"
                className="button-shadow rounded-xl px-5 py-3 bg-brightboost-yellow text-brightboost-navy font-bold text-center text-base hover:opacity-90 hover:scale-105 transition-all ui-lift"
              >
                {t("landing.donateCta", { defaultValue: "Donate to Keep Bright Boost Free" })}
              </a>
            </div>
          </div>

          {/* Teacher / student entry points */}
          <div className="space-y-3 flex flex-col items-center mt-5">
            <Link
              to="/teacher-login"
              className="button-shadow rounded-xl px-8 py-4 bg-brightboost-blue text-white font-bold text-center text-lg hover:bg-opacity-90 hover:scale-105 transition-all w-64 ui-lift"
            >
              {t("landing.imATeacher")}
            </Link>
            <Link
              to="/student-login"
              className="button-shadow rounded-xl px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-center text-lg hover:scale-105 transition-all w-64 ui-lift"
            >
              {t("landing.imAStudent")} 🎒
            </Link>
          </div>

          {/* Pathways link */}
          <div className="mt-4">
            <Link
              to="/pathways/about"
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline transition-colors"
            >
              {t("landing.pathwaysLink", { defaultValue: "Ages 14-17? Check out Bright Boost Pathways →" })}
            </Link>
          </div>

          {/* Reviewer / Partner entry points */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
            <Link
              to="/for-reviewers"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/80 backdrop-blur text-sm font-medium text-brightboost-navy hover:bg-white transition-colors shadow-sm"
            >
              <ClipboardCheck className="w-4 h-4 text-brightboost-blue" />
              {t("landing.forReviewers")}
            </Link>
            <Link
              to="/showcase"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/80 backdrop-blur text-sm font-medium text-brightboost-navy hover:bg-white transition-colors shadow-sm"
            >
              <Presentation className="w-4 h-4 text-brightboost-blue" />
              {t("landing.viewShowcase")}
            </Link>
          </div>

          {/* Demo / Partner section */}
          <div className="mt-6 max-w-md w-full">
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
          <Link to="/for-reviewers" className="hover:underline">
            {t("landing.forReviewers")}
          </Link>
          <span>|</span>
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
