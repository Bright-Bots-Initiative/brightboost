// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { join } from "../services/api";
import {
  identifyUser,
  resetAnalytics,
  track,
  type AnalyticsRole,
} from "../lib/analytics";

const SESSION_CHECK_TIMEOUT_MS = 10_000;

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

interface SessionValidation {
  controller: AbortController;
  timeout?: ReturnType<typeof setTimeout>;
}

interface User {
  id: string;
  name: string;
  email?: string | null;
  role: string;
  xp?: number;
  level?: string;
  streak?: number;
  avatarUrl?: string | null;
  badges?: Array<{ id: string; name: string; awardedAt: string }>;
  homeAccessEnabled?: boolean;
  accountMode?: string;
  loginIcon?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User, next?: string) => void;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Export the context so it can be used in tests
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

function normalizeAnalyticsRole(role: string): AnalyticsRole {
  const r = role.toLowerCase();
  if (r === "teacher") return "teacher";
  if (r === "student") return "student";
  if (r === "parent") return "parent";
  if (r === "admin") return "admin";
  // Default conservatively rather than leaking an unknown role label.
  return "student";
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation();
  const [sessionUnavailable, setSessionUnavailable] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const validation = useRef<SessionValidation | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [shouldRedirect, setShouldRedirect] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [nextPath, setNextPath] = useState<string | undefined>(undefined);

  // Identity, not only the token string, fences late responses (including JSON
  // bodies). Login, logout, cleanup and timeouts all invalidate the attempt.
  const cancelValidation = useCallback(() => {
    const attempt = validation.current;
    validation.current = null;
    if (attempt) {
      clearTimeout(attempt.timeout);
      attempt.controller.abort();
    }
  }, []);

  const validateSession = useCallback((checkedToken: string) => {
    if (validation.current) return; // One manual retry at a time; no retry loop.
    const attempt: SessionValidation = {
      controller: new AbortController(),
    };
    validation.current = attempt;
    setIsCheckingSession(true);
    const isCurrent = () =>
      validation.current === attempt &&
      localStorage.getItem("bb_access_token") === checkedToken;

    attempt.timeout = setTimeout(() => {
      if (validation.current !== attempt) return;
      validation.current = null;
      attempt.controller.abort();
      setSessionUnavailable(true);
      setIsCheckingSession(false);
      setIsLoading(false);
    }, SESSION_CHECK_TIMEOUT_MS);

    void (async () => {
      try {
        // Exclude progress data; only refresh session identity here.
        const res = await fetch(
          join(API_BASE, "/get-progress?excludeProgress=true"),
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${checkedToken}`,
            },
            signal: attempt.controller.signal,
          },
        );
        if (!isCurrent()) return;
        const data =
          res.status === 401 ? null : await res.json().catch(() => null);
        if (!isCurrent()) return;
        // authenticateToken returns this specific 403 for invalid JWTs.
        // Other 403s describe permission failures, not a rejected session.
        if (
          res.status === 401 ||
          (res.status === 403 && data?.error === "forbidden_invalid_token")
        ) {
          localStorage.removeItem("user");
          localStorage.removeItem("bb_access_token");
          setUser(null);
          setToken(null);
          setSessionUnavailable(false);
          resetAnalytics();
        } else if (res.ok && data?.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
          setSessionUnavailable(false);
        } else {
          setSessionUnavailable(true);
        }
      } catch {
        if (isCurrent()) setSessionUnavailable(true);
      } finally {
        if (validation.current === attempt) {
          clearTimeout(attempt.timeout);
          validation.current = null;
          setIsCheckingSession(false);
          setIsLoading(false);
        }
      }
    })();
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("bb_access_token");
    if (storedToken) {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(userData);
      setToken(storedToken);
      validateSession(storedToken);
    } else {
      setIsLoading(false);
    }
    return cancelValidation;
  }, [cancelValidation, validateSession]);

  const login = (token: string, userData: User, next?: string) => {
    cancelValidation();
    setSessionUnavailable(false);
    setIsCheckingSession(false);
    setIsLoading(false);
    if (token) localStorage.setItem("bb_access_token", token);
    localStorage.setItem("user", JSON.stringify(userData));

    // Analytics: identify + fire `login` for every successful auth (signup
    // pages also call this; they additionally fire `account_registered`).
    const role = normalizeAnalyticsRole(userData.role);
    identifyUser(userData.id, role);
    track({ kind: "login", role });

    setToken(token || null);
    setUser(userData);
    setNextPath(next);
    setShouldRedirect(true);
  };

  useEffect(() => {
    if (user && !isLoading && shouldRedirect) {
      // Route by userType first (pathways vs k8), then by role
      const isPathways = (user as any).userType === "pathways";
      const isTeacher = user.role === "TEACHER" || user.role === "teacher";
      const byRole = isPathways
        ? isTeacher
          ? "/pathways/facilitator"
          : "/pathways"
        : isTeacher
          ? "/teacher/dashboard"
          : "/student/dashboard";
      const params = new URLSearchParams(location.search);
      const nextParam = params.get("next") || undefined;
      const target = nextPath ?? nextParam ?? byRole ?? "/";
      navigate(target);
      setShouldRedirect(false);
      setNextPath(undefined);
    }
  }, [user, isLoading, shouldRedirect, nextPath, location.search, navigate]);

  const logout = useCallback(() => {
    cancelValidation();
    setSessionUnavailable(false);
    setIsCheckingSession(false);
    setIsLoading(false);
    setShouldRedirect(false);
    setNextPath(undefined);
    localStorage.removeItem("bb_access_token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    resetAnalytics();
    navigate("/");
  }, [navigate, cancelValidation]);

  /**
   * Update user state partially (e.g., after avatar upload).
   * Updates both React state and localStorage.
   */
  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {sessionUnavailable && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950"
        >
          <p>{t("auth.sessionUnavailable")}</p>
          <button
            type="button"
            disabled={isCheckingSession}
            onClick={() => {
              if (token) validateSession(token);
            }}
            className="rounded-lg border border-amber-700 px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
          >
            {t(
              isCheckingSession ? "auth.sessionChecking" : "auth.sessionRetry",
            )}
          </button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
