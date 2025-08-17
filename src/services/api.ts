// src/services/api.ts
import { useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "@/components/ui/use-toast.ts";
import { t } from "i18next";

const API_BASE =
  import.meta.env.VITE_AWS_API_URL ||
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  "";

const API_CALL_DELAY = 334;
let lastApiCall = 0;

const rateLimitedFetch = async (url: string, options: RequestInit) => {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  if (timeSinceLastCall < API_CALL_DELAY) {
    await new Promise((resolve) => setTimeout(resolve, API_CALL_DELAY - timeSinceLastCall));
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
    const response = await fetch(`${API_BASE}/api/login`, {
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
    const response = await fetch(`${API_BASE}/auth/signup`, {
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
    const response = await fetch(`${API_BASE}/auth/signup/teacher`, {
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
    const response = await fetch(`${API_BASE}/auth/signup/student`, {
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
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      };

      try {
        const response = await rateLimitedFetch(`${API_BASE}${endpoint}`, {
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
