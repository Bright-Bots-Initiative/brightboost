import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import GameBackground from "../components/GameBackground";
import LanguageToggle from "../components/LanguageToggle";
import { PasswordInput } from "../components/ui/password-input";
import { Button } from "../components/ui/button";
import { API_BASE, join } from "../services/api";

/**
 * Public accept page for a home-access invitation (#872).
 *
 * The parent or guardian reaches this page from the emailed link. The token
 * in the URL is the only proof; no session is needed and a stale classroom
 * token in this browser is irrelevant (the backend routes are public).
 */

type InviteInfo = {
  studentFirstName: string;
  adultEmail: string;
  expiresAt: string;
};

const HomeAccessAccept: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const errorText = (code: string) =>
    t(`homeAccess.accept.errors.${code}`, {
      defaultValue: t("homeAccess.accept.errors.generic"),
    });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          join(
            API_BASE,
            `/auth/home-access/invite/${encodeURIComponent(token)}`,
          ),
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(typeof data.error === "string" ? data.error : "generic");
        } else {
          setInvite(data as InviteInfo);
          setEmail((data as InviteInfo).adultEmail ?? "");
        }
      } catch {
        if (!cancelled) setLoadError("generic");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError(errorText("passwordMismatch"));
      return;
    }
    // Same rule the server enforces, checked here so a parent gets the hint
    // before a failed attempt counts against the proof-route limiter.
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setError(errorText("invalidInput"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(join(API_BASE, "/auth/home-access/accept"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = typeof data.error === "string" ? data.error : "generic";
        // Stable codes map to copy; a server validation message (English
        // Zod text) is replaced by the localized rules hint.
        setError(errorText(/^[a-z_]+$/.test(code) ? code : "invalidInput"));
        return;
      }
      setSuccess(true);
    } catch {
      setError(errorText("generic"));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses =
    "bg-white border-2 border-brightboost-lightblue text-brightboost-navy rounded-lg focus:ring-brightboost-blue focus:border-transparent";

  const shell = (children: React.ReactNode) => (
    <GameBackground>
      <div className="flex flex-col items-center justify-center min-h-screen p-4 relative z-10">
        <div className="absolute top-4 right-4 z-20">
          <LanguageToggle />
        </div>
        <div className="game-card p-6 w-full max-w-md">{children}</div>
      </div>
    </GameBackground>
  );

  if (!token) {
    return shell(
      <p className="text-red-600 font-medium text-center">
        {t("homeAccess.accept.missingToken")}
      </p>,
    );
  }

  if (loading) {
    return shell(
      <p className="text-brightboost-navy text-center" role="status">
        {t("homeAccess.accept.loading")}
      </p>,
    );
  }

  if (loadError || !invite) {
    return shell(
      <div className="text-center space-y-4">
        <p className="text-red-600 font-medium">
          {errorText(loadError ?? "generic")}
        </p>
        <Link
          to="/login"
          className="text-brightboost-blue font-bold hover:underline"
        >
          {t("homeAccess.accept.goToLogin")}
        </Link>
      </div>,
    );
  }

  if (success) {
    return shell(
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-brightboost-navy">
          {t("homeAccess.accept.title")}
        </h1>
        <p className="text-green-700 font-medium" role="status">
          {t("homeAccess.accept.success")}
        </p>
        <Link
          to="/login"
          className="inline-block text-brightboost-blue font-bold hover:underline"
        >
          {t("homeAccess.accept.goToLogin")}
        </Link>
      </div>,
    );
  }

  return shell(
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-2xl font-bold text-brightboost-navy text-center">
        {t("homeAccess.accept.title")}
      </h1>
      <p className="text-sm text-brightboost-navy/80 text-center">
        {t("homeAccess.accept.intro", { name: invite.studentFirstName })}
      </p>

      <div className="space-y-1">
        <label
          htmlFor="home-access-accept-email"
          className="text-sm font-medium text-brightboost-navy"
        >
          {t("homeAccess.accept.emailLabel")}
        </label>
        <input
          id="home-access-accept-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={`w-full px-3 py-2 ${inputClasses}`}
          autoComplete="email"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="home-access-accept-password"
          className="text-sm font-medium text-brightboost-navy"
        >
          {t("homeAccess.accept.passwordLabel")}
        </label>
        <PasswordInput
          id="home-access-accept-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className={inputClasses}
          autoComplete="new-password"
        />
        <p className="text-xs text-brightboost-navy/70">
          {t("homeAccess.accept.passwordHint")}
        </p>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="home-access-accept-confirm"
          className="text-sm font-medium text-brightboost-navy"
        >
          {t("homeAccess.accept.confirmLabel")}
        </label>
        <PasswordInput
          id="home-access-accept-confirm"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          className={inputClasses}
          autoComplete="new-password"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting
          ? t("homeAccess.accept.submitting")
          : t("homeAccess.accept.submit")}
      </Button>
    </form>,
  );
};

export default HomeAccessAccept;
