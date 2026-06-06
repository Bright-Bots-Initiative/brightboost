// src/pages/StudentSignup.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Circle, KeyRound, ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { signupStudent } from "../services/api";
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

const StudentSignup: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const previous = document.title;
    document.title = `${t("studentSignup.pageTitle")} · Bright Boost`;
    return () => {
      document.title = previous;
    };
  }, [t]);

  const requirements = [
    { re: /.{8,}/, label: t("studentSignup.requirements.length") },
    { re: /[A-Z]/, label: t("studentSignup.requirements.upper") },
    { re: /[a-z]/, label: t("studentSignup.requirements.lower") },
    { re: /[0-9]/, label: t("studentSignup.requirements.number") },
  ];

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
      next.email = t("studentSignup.errors.emailInvalid");
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = t("studentSignup.errors.passwordTooShort");
    }
    if (password !== confirmPassword) {
      next.confirmPassword = t("studentSignup.errors.mismatch");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const response = await signupStudent(name.trim(), email.trim(), password);
      if (response && response.token) {
        track({
          kind: "account_registered",
          role: "student",
          signup_method: "email",
        });
        login(response.token, response.user);
      } else {
        setErrors({ form: t("studentSignup.errors.generic") });
      }
    } catch (err: unknown) {
      setErrors({
        form:
          err instanceof Error && err.message
            ? err.message
            : t("studentSignup.errors.generic"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginCard
      icon="🎒"
      title={t("studentSignup.heading")}
      subtitle={t("studentSignup.subtitle")}
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
          label={t("studentSignup.fields.name")}
          id="name"
          name="name"
          type="text"
          autoComplete="given-name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearFieldError("name");
          }}
          placeholder={t("studentSignup.fields.namePlaceholder")}
          error={errors.name}
        />

        <div>
          <Input
            label={t("studentSignup.fields.email")}
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
            placeholder={t("studentSignup.fields.emailPlaceholder")}
            error={errors.email}
          />
          {!errors.email && (
            <p className="mt-1 text-xs text-slate-500">
              {t("studentSignup.fields.emailHelp")}
            </p>
          )}
        </div>

        <div>
          <PasswordInput
            label={t("studentSignup.fields.password")}
            id="password"
            name="new-password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldError("password");
              if (errors.confirmPassword && e.target.value === confirmPassword) {
                clearFieldError("confirmPassword");
              }
            }}
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={() => setIsPasswordFocused(false)}
            placeholder={t("studentSignup.fields.passwordPlaceholder")}
            error={errors.password}
            aria-describedby="password-requirements"
          />
          {(password.length > 0 || isPasswordFocused) && (
            <ul
              id="password-requirements"
              className="mt-2 space-y-1"
              aria-label="Password requirements"
              aria-live="polite"
            >
              {requirements.map((req) => {
                const isMet = req.re.test(password);
                return (
                  <li
                    key={req.label}
                    className={`text-xs flex items-center gap-1.5 ${
                      isMet ? "text-emerald-600" : "text-slate-500"
                    }`}
                  >
                    {isMet ? (
                      <Check className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <Circle
                        className="w-3 h-3 text-slate-300"
                        aria-hidden="true"
                      />
                    )}
                    <span>{req.label}</span>
                    <span className="sr-only">
                      {isMet ? " - Completed" : " - Incomplete"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <PasswordInput
          label={t("studentSignup.fields.confirmPassword")}
          id="confirmPassword"
          name="confirm-password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            clearFieldError("confirmPassword");
          }}
          placeholder={t("studentSignup.fields.confirmPasswordPlaceholder")}
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
            {t("studentSignup.terms.prefix")}{" "}
            <Link
              to="/terms"
              className="text-indigo-600 font-semibold hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {t("studentSignup.terms.tos")}
            </Link>{" "}
            {t("studentSignup.terms.and")}{" "}
            <Link
              to="/privacy"
              className="text-indigo-600 font-semibold hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {t("studentSignup.terms.privacy")}
            </Link>
          </label>
        </div>

        <Button
          type="submit"
          isLoading={isLoading}
          disabled={!agreedToTerms || isLoading}
          loadingText={t("studentSignup.submitting")}
          className="w-full py-3 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
        >
          {t("studentSignup.submit")}
        </Button>

        <p className="flex items-start gap-1.5 text-xs text-slate-500 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
          <span>{t("teacherSignup.trust")}</span>
        </p>
      </form>

      {/* Class-code alternative — students with a code from their teacher
          don't need a self-signup at all. */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
        <p className="text-xs text-slate-700">
          {t("studentSignup.haveCode")}
        </p>
        <Link
          to="/class-login"
          className="mt-2 inline-flex items-center justify-center gap-1.5 w-full px-4 py-2.5 min-h-[44px] rounded-lg bg-white border border-emerald-400 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 active:scale-[0.99] transition-all"
        >
          <KeyRound className="w-4 h-4" />
          {t("studentSignup.joinClass")}
        </Link>
      </div>

      <div className="text-center">
        <p className="text-sm text-slate-600">
          {t("studentSignup.haveAccount")}{" "}
          <Link
            to="/student-login"
            className="font-semibold text-indigo-600 hover:underline"
          >
            {t("studentSignup.logIn")}
          </Link>
        </p>
      </div>
    </LoginCard>
  );
};

export default StudentSignup;
