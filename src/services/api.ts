// src/services/api.ts
import { useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "@/components/ui/use-toast.ts";
import { t } from "i18next";

export const join = (base: string, path: string): string =>
  `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

const resolveApiBase = (): string => {
  const { VITE_API_BASE, VITE_AWS_API_URL, VITE_API_URL } = import.meta.env;

  if (VITE_API_BASE) {
    let base = VITE_API_BASE.trim();
    if (base.endsWith("/")) base = base.slice(0, -1);
    if (!base.startsWith("http") && !base.startsWith("/")) base = `/${base}`;
    return base;
  }

  if (VITE_AWS_API_URL) {
    let base = VITE_AWS_API_URL.trim();
    if (base.endsWith("/")) base = base.slice(0, -1);
    return `${base}/api`;
  }

  if (VITE_API_URL) {
    let base = VITE_API_URL.trim();
    if (base.endsWith("/")) base = base.slice(0, -1);
    if (!base.startsWith("http") && !base.startsWith("/")) base = `/${base}`;
    return base;
  }

  return "/api";
};

const API_BASE = resolveApiBase();

if (import.meta.env.DEV) {
  console.log("API_BASE:", API_BASE);
}

const API_CALL_DELAY = 334;
let lastApiCall = 0;

const rateLimitedFetch = async (url: string, options: RequestInit) => {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  if (timeSinceLastCall < API_CALL_DELAY) {
    await new Promise((resolve) =>
      setTimeout(resolve, API_CALL_DELAY - timeSinceLastCall),
    );
  }
  lastApiCall = Date.now();
  return fetch(url, options);
};

// Non-authenticated API calls
export const loginUser = async (
  email: string,
  password: string,
  retries = 2,
): Promise<any> => {
  try {
    const response = await fetch(join(API_BASE, "/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = t("api.loginFailed");
      if (response.status === 401)
        errorMessage = t("api.invalidEmailOrPassword");
      else if (response.status === 409)
        errorMessage = t("api.emailAlreadyInUse");
      else if (response.status >= 500)
        errorMessage = t("api.serviceUnavailable");
      else {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `${t("api.loginFailed")}: ${response.status} ${response.statusText}`;
        }
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (
      retries > 0 &&
      error instanceof TypeError &&
      error.message === "Failed to fetch"
    ) {
      toast({
        title: t("api.retrying"),
        description: `${t("api.retryingLoginRequest")} (${retries} ${t("api.retriesLeft")})`,
        variant: "default",
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return loginUser(email, password, retries - 1);
    }
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      toast({
        title: t("api.loginFailed"),
        description: t("api.checkInternetConnection"),
        variant: "destructive",
      });
    }
    throw error;
  }
};

export const signupUser = async (
  name: string,
  email: string,
  password: string,
  role: string,
  retries = 2,
): Promise<any> => {
  try {
    const response = await fetch(join(API_BASE, "/signup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = t("api.signupFailed");
      if (response.status === 401)
        errorMessage = t("api.invalidEmailOrPassword");
      else if (response.status === 409)
        errorMessage = t("api.emailAlreadyInUse");
      else if (response.status >= 500)
        errorMessage = t("api.serviceUnavailable");
      else {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `${t("api.signupFailed")}: ${response.status} ${response.statusText}`;
        }
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (
      retries > 0 &&
      error instanceof TypeError &&
      error.message === "Failed to fetch"
    ) {
      toast({
        title: t("api.retrying"),
        description: `${t("api.retryingLoginRequest")} (${retries} ${t("api.retriesLeft")})`,
        variant: "default",
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return signupUser(name, email, password, role, retries - 1);
    }
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      toast({
        title: t("api.signupFailed"),
        description: t("api.checkInternetConnection"),
        variant: "destructive",
      });
    }
    throw error;
  }
};

export const signupTeacher = async (
  name: string,
  email: string,
  password: string,
  school?: string,
  subject?: string,
  retries = 2,
): Promise<any> => {
  try {
    const response = await fetch(join(API_BASE, "/signup/teacher"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, school, subject }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = t("api.teacherSignupFailed");
      if (response.status === 401)
        errorMessage = t("api.invalidEmailOrPassword");
      else if (response.status === 409)
        errorMessage = t("api.emailAlreadyInUse");
      else if (response.status >= 500)
        errorMessage = t("api.serviceUnavailable");
      else {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `${t("api.teacherSignupFailed")}: ${response.status} ${response.statusText}`;
        }
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (
      retries > 0 &&
      error instanceof TypeError &&
      error.message === "Failed to fetch"
    ) {
      toast({
        title: t("api.retrying"),
        description: `${t("api.retryingLoginRequest")} (${retries} ${t("api.retriesLeft")})`,
        variant: "default",
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return signupTeacher(name, email, password, school, subject, retries - 1);
    }
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      toast({
        title: t("api.signupFailed"),
        description: t("api.checkInternetConnection"),
        variant: "destructive",
      });
    }
    throw error;
  }
};

export const signupStudent = async (
  name: string,
  email: string,
  password: string,
  retries = 2,
): Promise<any> => {
  try {
    const response = await fetch(join(API_BASE, "/signup/student"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = t("api.studentSignupFailed");
      if (response.status === 401)
        errorMessage = t("api.invalidEmailOrPassword");
      else if (response.status === 409)
        errorMessage = t("api.emailAlreadyInUse");
      else if (response.status >= 500)
        errorMessage = t("api.serviceUnavailable");
      else {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `${t("api.studentSignupFailed")}: ${response.status} ${response.statusText}`;
        }
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (
      retries > 0 &&
      error instanceof TypeError &&
      error.message === "Failed to fetch"
    ) {
      toast({
        title: t("api.retrying"),
        description: `${t("api.retryingLoginRequest")} (${retries} ${t("api.retriesLeft")})`,
        variant: "default",
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return signupStudent(name, email, password, retries - 1);
    }
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      toast({
        title: t("api.signupFailed"),
        description: t("api.checkInternetConnection"),
        variant: "destructive",
      });
    }
    throw error;
  }
};

// Hook for authenticated API calls
export const useApi = () => {
  const { token } = useAuth();

  const authFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}, retries = 2) => {
      // Use logic similar to getHeaders() for MVP dev shim
      const headers: any = {
        "Content-Type": "application/json",
        ...options.headers,
      };

      if (token === "mock-token-for-mvp") {
        headers["Authorization"] = `Bearer ${token}`;
      } else if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      try {
        const response = await rateLimitedFetch(join(API_BASE, endpoint), {
          ...options,
          headers,
        });

        if (!response.ok) {
          if (response.status === 401) throw new Error(t("api.sessionExpired"));
          if (response.status === 403)
            throw new Error(t("api.dashboardUnavailable"));
          const errorData = await response.json();
          throw new Error(errorData.error || t("api.apiRequestFailed"));
        }

        return await response.json();
      } catch (error) {
        if (
          retries > 0 &&
          error instanceof Error &&
          !error.message.includes("Authentication")
        ) {
          toast({
            title: t("api.networkIssue"),
            description: `${t("api.retryingLoginRequest")} (${retries} ${t("api.retriesLeft")})`,
          });
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return authFetch(endpoint, options, retries - 1);
        }

        toast({
          title: t("api.networkIssue"),
          description: t("api.networkFailed"),
          variant: "destructive",
        });

        throw error;
      }
    },
    [token],
  );

  const apiMethods = useMemo(
    () => ({
      get: (endpoint: string) => authFetch(endpoint, {}, 2),
      post: (endpoint: string, data: Record<string, unknown>) =>
        authFetch(
          endpoint,
          {
            method: "POST",
            body: JSON.stringify(data),
          },
          2,
        ),
      put: (endpoint: string, data: Record<string, unknown>) =>
        authFetch(
          endpoint,
          {
            method: "PUT",
            body: JSON.stringify(data),
          },
          2,
        ),
      delete: (endpoint: string) =>
        authFetch(
          endpoint,
          {
            method: "DELETE",
          },
          2,
        ),
    }),
    [authFetch],
  );

  return apiMethods;
};

// --- MVP API SHIM ---
// This standalone object handles direct API calls outside of hooks (if needed).
// Ideally, refactor Avatar.tsx to use useApi() hook instead of direct `api.getAvatar`.
const getHeaders = () => {
  const token = localStorage.getItem("bb_access_token");
  const headers: any = { "Content-Type": "application/json" };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

// --- Simple in-memory cache for module detail ---
// Prevents request storms when multiple components request the same module.
const MODULE_TTL_MS = 30_000;
const moduleCache = new Map<string, { ts: number; data: any }>();
const moduleInFlight = new Map<string, Promise<any>>();

async function safeJson(res: Response) {
  // If backend sends plain text (e.g. rate limit), this won't crash
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export const api = {
  getModules: async (params?: { level?: string }) => {
    const url = new URL(join(API_BASE, "/modules"), window.location.origin);
    if (params?.level) {
      url.searchParams.append("level", params.level);
    }
    const res = await fetch(url.toString(), {
      headers: getHeaders(),
    });
    return res.json();
  },

  getProgress: async (options?: { excludeUser?: boolean }) => {
    const url = new URL(
      join(API_BASE, "/get-progress"),
      window.location.origin,
    );
    if (options?.excludeUser) {
      url.searchParams.append("excludeUser", "true");
    }

    const res = await fetch(url.toString(), {
      headers: getHeaders(),
    });
    return res.json();
  },

  getModule: async (slug: string, options?: { structureOnly?: boolean }) => {
    const cacheKey = options?.structureOnly ? `${slug}:structure` : slug;

    // cache hit
    const cached = moduleCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < MODULE_TTL_MS) return cached.data;

    // in-flight dedupe
    const existing = moduleInFlight.get(cacheKey);
    if (existing) return existing;

    const p = (async () => {
      const endpoint = options?.structureOnly
        ? `/module/${slug}?structure=true`
        : `/module/${slug}`;

      const res = await fetch(join(API_BASE, endpoint), {
        headers: getHeaders(),
      });

      if (!res.ok) {
        const errBody = await safeJson(res);
        const msg =
          res.status === 429
            ? "Too many requests (rate limited). Please refresh after restarting backend or switching networks."
            : errBody?.error ||
              errBody?.message ||
              `Request failed: ${res.status}`;
        throw new Error(msg);
      }

      const data = await res.json();
      moduleCache.set(cacheKey, { ts: Date.now(), data });
      return data;
    })();

    moduleInFlight.set(cacheKey, p);
    try {
      return await p;
    } finally {
      moduleInFlight.delete(cacheKey);
    }
  },

  completeActivity: async (data: {
    moduleSlug: string;
    lessonId: string;
    activityId: string;
    timeSpentS: number;
    result?: {
      gameKey?: string;
      score?: number;
      total?: number;
      streakMax?: number;
      roundsCompleted?: number;
    };
  }) => {
    const res = await fetch(join(API_BASE, "/progress/complete-activity"), {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getAvatar: async () => {
    const res = await fetch(join(API_BASE, "/avatar/me"), {
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => null);
    // Backend returns { avatar }, but many frontend callers expect the avatar object directly.
    return data?.avatar ?? null;
  },
};
