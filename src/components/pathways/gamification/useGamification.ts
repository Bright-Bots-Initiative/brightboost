/**
 * useGamification — shared client hook for the Pathways gamification API.
 *
 * Loads the student's current state on mount and pings the activity endpoint
 * once per session to extend the streak. Refresh is exposed so consumers
 * (lab outputs, module completion, etc.) can re-pull after server-side awards.
 */
import { useCallback, useEffect, useState } from "react";

export interface LevelTier {
  tier: string;
  color: string;
}

export interface DailyGoalItem {
  slug: "complete_section" | "earn_xp" | "try_lab_or_quiz";
  label: string;
  target: number;
  current: number;
  completed: boolean;
}

export interface DailyGoalsPayload {
  id: string;
  date: string;
  goals: DailyGoalItem[];
  allComplete: boolean;
  bonusAwarded: boolean;
}

export interface RecentBadge {
  slug: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string | null;
}

export interface GamificationState {
  totalXp: number;
  currentLevel: number;
  levelTier: LevelTier;
  xpProgress: { current: number; needed: number };
  currentStreak: number;
  longestStreak: number;
  streakFreezesAvailable: number;
  lastActiveDate: string | null;
  badgesEarned: number;
  recentBadges: RecentBadge[];
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("bb_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const ACTIVITY_KEY = "bb_pathways_activity_ts";
// Hard client-side ceiling for any gamification fetch. The server has its
// own 5s timeout; this is just defense-in-depth so a TCP/proxy hang can't
// leave the home page stuck on the loading skeleton.
const FETCH_TIMEOUT_MS = 6000;

/** Safe defaults so the dashboard always has something to render. */
const FALLBACK_STATE: GamificationState = {
  totalXp: 0,
  currentLevel: 1,
  levelTier: { tier: "Recruit", color: "slate" },
  xpProgress: { current: 0, needed: 50 },
  currentStreak: 0,
  longestStreak: 0,
  streakFreezesAvailable: 1,
  lastActiveDate: null,
  badgesEarned: 0,
  recentBadges: [],
};

const FALLBACK_GOALS: DailyGoalsPayload = {
  id: "ephemeral",
  date: new Date().toISOString().slice(0, 10),
  goals: [
    { slug: "complete_section", label: "Complete 1 section", target: 1, current: 0, completed: false },
    { slug: "earn_xp", label: "Earn 50 XP", target: 50, current: 0, completed: false },
    { slug: "try_lab_or_quiz", label: "Try 1 lab or quiz", target: 1, current: 0, completed: false },
  ],
  allComplete: false,
  bonusAwarded: false,
};

async function fetchJson<T>(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    init?.timeoutMs ?? FETCH_TIMEOUT_MS,
  );
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

export function useGamification() {
  // Initialize with fallbacks so the home page never renders without a
  // gamification strip — even if the API never responds.
  const [state, setState] = useState<GamificationState>(FALLBACK_STATE);
  const [goals, setGoals] = useState<DailyGoalsPayload>(FALLBACK_GOALS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [s, g] = await Promise.all([
      fetchJson<GamificationState>("/api/pathways/gamification/me"),
      fetchJson<DailyGoalsPayload>("/api/pathways/gamification/me/daily-goals"),
    ]);
    if (s) setState(s);
    if (g) setGoals(g);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
      setLoading(false);

      // Heartbeat: record activity at most once per UTC day per browser. The
      // server is also idempotent within a day, but skipping the round-trip
      // avoids needless writes. Best-effort with its own short timeout —
      // never block subsequent renders.
      try {
        const lastPing = localStorage.getItem(ACTIVITY_KEY);
        const today = new Date().toISOString().slice(0, 10);
        if (lastPing !== today) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
          await fetch("/api/pathways/gamification/me/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader() },
            signal: controller.signal,
          }).finally(() => clearTimeout(timeoutId));
          localStorage.setItem(ACTIVITY_KEY, today);
          if (!cancelled) await load();
        }
      } catch {
        /* heartbeat is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { state, goals, loading, refresh: load };
}
