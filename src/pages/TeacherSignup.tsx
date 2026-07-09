// src/pages/TeacherSignup.tsx
import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { signupTeacher } from "../services/api";
import { track } from "../lib/analytics";
import LoginCard from "@/components/auth/LoginCard";
import { Input } from "../components/ui/input";
import { PasswordInput } from "../components/ui/password-input";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const TeacherSignup: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  // Parents arrive via /teacher/signup?intent=home and should land on the
  // home-group create flow instead of the default teacher dashboard.
  const isHomeIntent = searchParams.get("intent") === "home";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Set document title for browser tab + accessibility
  useEffect(() => {
    const previous = document.title;
    document.title = `${t("teacherSignup.pageTitle")} · Bright Boost`;
    return () => {
      document.title = previous;
    };
  }, [t]);

  const clearFieldError = (field: keyof FieldErrors) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!EMAIL_RE.test(email.trim())) {
      next.email = t("teacherSignup.errors.emailInvalid");
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = t("teacherSignup.errors.passwordTooShort");
    }
    if (password !== confirmPassword) {
      next.confirmPassword = t("teacherSignup.errors.mismatch");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const response = await signupTeacher(name.trim(), email.trim(), password);
      if (response && response.token) {
        track({
          kind: "account_registered",
          role: isHomeIntent ? "parent" : "teacher",
          signup_method: "email",
        });
        login(
          response.token,
          response.user,
          isHomeIntent ? "/teacher/classes?create=home" : undefined,
        );
      } else {
        setErrors({ form: t("teacherSignup.errors.generic") });
      }
    } catch (err: unknown) {
      setErrors({
        form:
          err instanceof Error && err.message
            ? err.message
            : t("teacherSignup.errors.generic"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginCard
      icon="👩‍🏫"
      title={t("teacherSignup.heading")}
      subtitle={t("teacherSignup.subtitle")}
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-4"
        noValidate
      >
        {errors.form && (
          <div
            role="alert"
            aria-live="polite"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
          >
            {errors.form}
          </div>
        )}

        <Input
          label={t("teacherSignup.fields.name")}
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearFieldError("name");
          }}
          placeholder={t("teacherSignup.fields.namePlaceholder")}
          error={errors.name}
        />

        <div>
          <Input
            label={t("teacherSignup.fields.email")}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError("email");
            }}
            placeholder={t("teacherSignup.fields.emailPlaceholder")}
            error={errors.email}
          />
          {!errors.email && (
            <p className="mt-1 text-xs text-slate-500">
              {t("teacherSignup.fields.emailHelp")}
            </p>
          )}
        </div>

        <PasswordInput
          label={t("teacherSignup.fields.password")}
          id="password"
          name="new-password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearFieldError("password");
            // Re-validate confirm field if user edited password after a mismatch
            if (errors.confirmPassword && e.target.value === confirmPassword) {
              clearFieldError("confirmPassword");
            }
          }}
          placeholder={t("teacherSignup.fields.passwordPlaceholder")}
          error={errors.password}
        />

        <PasswordInput
          label={t("teacherSignup.fields.confirmPassword")}
          id="confirmPassword"
          name="confirm-password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            clearFieldError("confirmPassword");
          }}
          placeholder={t("teacherSignup.fields.confirmPasswordPlaceholder")}
          error={errors.confirmPassword}
        />

        <div className="flex items-start gap-2">
          <Checkbox
            id="agreeTerms"
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
            className="mt-0.5"
          />
          <label
            htmlFor="agreeTerms"
            className="text-xs text-slate-600 leading-snug"
          >
            {t("teacherSignup.terms.prefix")}{" "}
            <Link
              to="/terms"
              className="text-indigo-600 font-semibold hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {t("teacherSignup.terms.tos")}
            </Link>{" "}
            {t("teacherSignup.terms.and")}{" "}
            <Link
              to="/privacy"
              className="text-indigo-600 font-semibold hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {t("teacherSignup.terms.privacy")}
            </Link>
          </label>
        </div>

        <Button
          type="submit"
          isLoading={isLoading}
          disabled={!agreedToTerms || isLoading}
          loadingText={t("teacherSignup.submitting")}
          className="w-full py-3 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
        >
          {t("teacherSignup.submit")}
        </Button>

        <p className="flex items-start gap-1.5 text-xs text-slate-500 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
          <span>{t("teacherSignup.trust")}</span>
        </p>
      </form>

      <div className="text-center">
        <p className="text-sm text-slate-600">
          {t("teacherSignup.haveAccount")}{" "}
          <Link
            to="/teacher-login"
            className="font-semibold text-indigo-600 hover:underline"
          >
            {t("teacherSignup.logIn")}
          </Link>
        </p>
      </div>
    </LoginCard>
  );
};

export default TeacherSignup;
