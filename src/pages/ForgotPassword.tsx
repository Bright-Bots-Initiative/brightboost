import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import GameBackground from "../components/GameBackground";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api";

const ForgotPassword: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed");
      }

      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses =
    "bg-white border-2 border-brightboost-lightblue text-brightboost-navy rounded-lg focus:ring-brightboost-blue focus:border-transparent";

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
              {t("auth.forgotTitle")}
            </h1>
          </div>

          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {t("auth.resetSent")}
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
                {t("auth.forgotDesc")}
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
                <Input
                  label={t("auth.emailLabel")}
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClasses}
                  placeholder={t("auth.emailPlaceholder")}
                />

                <Button
                  type="submit"
                  isLoading={isLoading}
                  loadingText={t("auth.sending")}
                  className="button-shadow w-full py-3 px-4 rounded-xl text-white font-bold ui-lift bg-brightboost-blue hover:bg-brightboost-blue/90"
                >
                  {t("auth.sendResetLink")}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  to="/login"
                  className="text-sm text-brightboost-blue font-bold hover:underline"
                >
                  {t("auth.backToLogin")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </GameBackground>
  );
};

export default ForgotPassword;
