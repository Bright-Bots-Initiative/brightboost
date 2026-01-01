// src/pages/StudentLogin.tsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { loginUser } from "../services/api";
import GameBackground from "../components/GameBackground";
import BrightBoostRobot from "../components/BrightBoostRobot";
import { Loader2, Eye, EyeOff } from "lucide-react";

const studentLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password needs to be at least 6 characters"),
});

type StudentLoginFormData = z.infer<typeof studentLoginSchema>;

const StudentLogin: React.FC = () => {
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentLoginFormData>({
    resolver: zodResolver(studentLoginSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: StudentLoginFormData) => {
    try {
      const response = await loginUser(
        studentLoginSchema.parse(data).email,
        studentLoginSchema.parse(data).password,
      );

      // Verify this is a student account
      if (
        response.user.role !== "STUDENT" &&
        response.user.role !== "student"
      ) {
        setError(t("studentLogin.error.studentOnly"));
        return;
      }
      login(response.token, response.user, "/student/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t("studentLogin.error.generic"),
      );
    }
  };

  return (
    <GameBackground>
      <div className="flex flex-col items-center justify-center min-h-screen p-4 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-4xl">
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-brightboost-navy mb-4">
              {t("studentLogin.title")}
            </h1>
            <p className="text-lg text-brightboost-navy mb-6">
              {t("studentLogin.subtitle")}
            </p>
            <BrightBoostRobot className="hidden md:block" />
          </div>

          <div className="game-card p-6 flex-1 w-full max-w-md ui-sheen ui-highlight">
            <BrightBoostRobot className="md:hidden mx-auto mb-6" size="sm" />

            {error && (
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-brightboost-navy mb-1"
                >
                  {t("studentLogin.form.emailLabel")}
                </label>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={`w-full px-4 py-2 bg-white border-2 ${
                    errors.email
                      ? "border-red-500"
                      : "border-brightboost-lightblue"
                  } text-brightboost-navy rounded-lg focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:border-transparent transition-all`}
                  placeholder={t("studentLogin.form.emailPlaceholder")}
                />
                {errors.email && (
                  <p
                    id="email-error"
                    role="alert"
                    className="text-red-500 text-sm mt-1"
                  >
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-brightboost-navy mb-1"
                >
                  {t("studentLogin.form.passwordLabel")}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    aria-invalid={errors.password ? "true" : "false"}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    className={`w-full px-4 py-2 bg-white border-2 ${
                      errors.password
                        ? "border-red-500"
                        : "border-brightboost-lightblue"
                    } text-brightboost-navy rounded-lg focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:border-transparent transition-all pr-10`}
                    placeholder={t("studentLogin.form.passwordPlaceholder")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brightboost-navy/60 hover:text-brightboost-navy bg-transparent focus:outline-none focus:ring-2 focus:ring-brightboost-blue rounded-full p-1"
                    aria-label={
                      showPassword
                        ? t("studentLogin.form.hidePassword")
                        : t("studentLogin.form.showPassword")
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p
                    id="password-error"
                    role="alert"
                    className="text-red-500 text-sm mt-1"
                  >
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`button-shadow w-full py-3 px-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 ui-lift ${
                  isSubmitting
                    ? "bg-brightboost-lightblue/70"
                    : "bg-brightboost-lightblue"
                } transition-colors`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t("studentLogin.form.loggingIn")}</span>
                  </>
                ) : (
                  t("studentLogin.form.submitButton")
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-brightboost-navy">
                {t("studentLogin.footer.noAccount")}{" "}
                <Link
                  to="/student/signup"
                  className="text-brightboost-blue font-bold hover:underline transition-colors"
                >
                  {t("studentLogin.footer.signup")}
                </Link>
              </p>
              <p className="text-sm text-brightboost-navy mt-2">
                <Link
                  to="/"
                  className="text-brightboost-blue font-bold hover:underline transition-colors"
                >
                  {t("studentLogin.footer.backHome")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </GameBackground>
  );
};

export default StudentLogin;
