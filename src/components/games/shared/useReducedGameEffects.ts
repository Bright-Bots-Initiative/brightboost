import { useCallback, useEffect, useMemo, useState } from "react";

export type ReducedEffectsSource = "system" | "manual" | "default";

const STORAGE_KEY = "brightboost.reducedGameEffects";
const QUERY = "(prefers-reduced-motion: reduce)";

function readStoredPreference(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {
    // Ignore localStorage unavailability and use runtime fallback.
  }
  return null;
}

function readSystemPreference(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

export function useReducedGameEffects() {
  const initialStored = useMemo(readStoredPreference, []);
  const [manualPreference, setManualPreference] = useState<boolean | null>(initialStored);
  const [systemPreference, setSystemPreference] = useState<boolean>(readSystemPreference);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setSystemPreference(event.matches);
    };
    setSystemPreference(media.matches);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  const setReducedEffects = useCallback((value: boolean) => {
    setManualPreference(value);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Ignore persistence failure but still update current session state.
    }
  }, []);

  const clearReducedEffectsPreference = useCallback(() => {
    setManualPreference(null);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore persistence failure.
    }
  }, []);

  const reducedEffects = manualPreference ?? systemPreference;
  const source: ReducedEffectsSource = manualPreference !== null
    ? "manual"
    : systemPreference
      ? "system"
      : "default";

  return {
    reducedEffects,
    source,
    setReducedEffects,
    clearReducedEffectsPreference,
  };
}

export { STORAGE_KEY as REDUCED_EFFECTS_STORAGE_KEY };
