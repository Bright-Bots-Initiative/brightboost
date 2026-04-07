import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import GameBackground from "../components/GameBackground";

const LoginSelection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <GameBackground>
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-brightboost-navy mb-2">
            {t("auth.chooseLoginType")}
          </h1>
          <p className="text-lg text-brightboost-navy">
            {t("auth.selectHowToLogin")}
          </p>
        </div>

        <div className="game-card p-8 w-full max-w-md">
          <div className="grid grid-cols-1 gap-4">
            <Link
              to="/teacher/login"
              className="button-shadow rounded-xl px-6 py-4 bg-brightboost-navy text-white font-bold text-center hover:bg-opacity-90 transition-all"
            >
              {t("auth.teacherLogin")}
            </Link>
            <Link
              to="/student/login"
              className="button-shadow rounded-xl px-6 py-4 bg-brightboost-lightblue text-brightboost-navy font-bold text-center hover:bg-opacity-90 transition-all"
            >
              {t("auth.studentLogin")}
            </Link>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-brightboost-blue font-bold hover:underline transition-colors"
            >
              {t("auth.backToHome")}
            </Link>
          </div>
        </div>
      </div>
    </GameBackground>
  );
};

export default LoginSelection;
