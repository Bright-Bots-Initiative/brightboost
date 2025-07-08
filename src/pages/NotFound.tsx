// src/pages/NotFound.tsx
import React from "react";
import { Link } from "react-router-dom";
import GameBackground from "../components/GameBackground";
import { useTranslation } from "react-i18next";


const NotFound: React.FC = () => {
  const { t } = useTranslation();
  return (
    <GameBackground>
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="game-card p-8 w-full max-w-md text-center">
          <h1 className="text-6xl font-bold text-brightboost-navy mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-brightboost-navy mb-6">
            {t("notFound.pageNotFound")}
          </h2>

          <p className="text-brightboost-navy mb-8">
            {t("notFound.pageDescription")}
          </p>

          <Link to="/" className="game-button inline-block">
            {t("notFound.backToHome")}
          </Link>
        </div>
      </div>
    </GameBackground>
  );
};

export default NotFound;
