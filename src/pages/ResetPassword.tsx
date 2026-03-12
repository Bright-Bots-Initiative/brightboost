import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import GameBackground from "../components/GameBackground";
import { PasswordInput } from "../components/ui/password-input";
import { Button } from "../components/ui/button";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api";

const ResetPassword: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses =
    "bg-white border-2 border-brightboost-lightblue text-brightboost-navy rounded-lg focus:ring-brightboost-blue focus:border-transparent";

  if (!token) {
    return (
      <GameBackground>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 relative z-10">
          <div className="game-card p-6 w-full max-w-md text-center">
            <p className="text-red-600 font-medium mb-4">
              {t("auth.resetInvalid")}
            </p>
            <Link
              to="/forgot-password"
              className="text-brightboost-blue font-bold hover:underline"
            >
              {t("auth.forgotPassword")}
            </Link>
          </div>
        </div>
      </GameBackground>
    );
  }

  return (
    <GameBackground>
      <div className="flex flex-col items-center justify-center min-h-screen p-4 relative z-10">
        <div className="game-card p-6 w-full max-w-md ui-sheen ui-highlight">
          <div className="flex items-center gap-2 mb-4">
            <Link
              to="/login"
              className="text-brightboost-blue hover:text-brightboost-navy"
              aria-label="Back to login"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-brightboost-navy">
              {t("auth.resetTitle")}
            </h1>
          </div>

          {success ? (
            <div className="space-y-4">
              <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">
                {t("auth.resetSuccess")}
              </p>
              <Link
                to="/login"
                className="block text-center text-brightboost-blue font-bold hover:underline text-sm"
              >
                {t("auth.backToLogin")}
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                {t("auth.resetDesc")}
              </p>

              {error && (
                <div
                  className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <PasswordInput
                  label={t("auth.newPassword")}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputClasses}
                  placeholder={t("auth.newPasswordPlaceholder")}
                />

                <PasswordInput
                  label={t("auth.confirmPassword")}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={inputClasses}
                  placeholder={t("auth.confirmPasswordPlaceholder")}
                />

                <Button
                  type="submit"
                  isLoading={isLoading}
                  loadingText={t("auth.resetting")}
                  className="button-shadow w-full py-3 px-4 rounded-xl text-white font-bold ui-lift bg-brightboost-blue hover:bg-brightboost-blue/90"
                >
                  {t("auth.resetPassword")}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </GameBackground>
  );
};

export default ResetPassword;
