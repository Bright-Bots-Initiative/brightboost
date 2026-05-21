/**
 * useOnboarding — shared hook for the welcome flow.
 *
 * Loads the user's PathwayOnboarding row on mount, exposes patch() and
 * complete() that PATCH /api/pathways/onboarding/me. The hook also tells
 * PathwaysHome whether to redirect to /pathways/welcome (only on the very
 * first visit, before completedAt is set).
 */
import { useCallback, useEffect, useState } from "react";

export interface OnboardingState {
  userId: string;
  startedAt: string;
  completedAt: string | null;
  avatarChosen: boolean;
  skillsTourViewed: boolean;
  skillsTourSkipped: boolean;
  missionStatement: string | null;
  dailyGoalLevel: "light" | "medium" | "heavy" | null;
  avatarSlug: string | null;
  toolboxIntroSeen?: boolean;
}

export interface OnboardingPatch {
  avatarChosen?: boolean;
  skillsTourViewed?: boolean;
  skillsTourSkipped?: boolean;
  missionStatement?: string;
  dailyGoalLevel?: "light" | "medium" | "heavy";
  avatarSlug?: string;
  toolboxIntroSeen?: boolean;
  completed?: boolean;
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("bb_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const FETCH_TIMEOUT_MS = 6000;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { ...(init?.headers ?? {}), ...authHeader() },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await fetchJson<OnboardingState>("/api/pathways/onboarding/me");
    if (data) setState(data);
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const patch = useCallback(
    async (changes: OnboardingPatch) => {
      const res = await fetchJson<{
        onboarding: OnboardingState;
        badgeAwarded?: {
          slug: string;
          name: string;
          description: string;
          icon: string;
        } | null;
      }>("/api/pathways/onboarding/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (res?.onboarding) setState(res.onboarding);
      return res;
    },
    [],
  );

  return { state, loading, patch, refresh: load };
}

/** Convenience: is the user finished with onboarding (or hasn't started). */
export function isOnboardingComplete(state: OnboardingState | null): boolean {
  return !!state?.completedAt;
}
