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

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { ...(init?.headers ?? {}), ...authHeader() },
      ...init,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function useGamification() {
  const [state, setState] = useState<GamificationState | null>(null);
  const [goals, setGoals] = useState<DailyGoalsPayload | null>(null);
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
      // avoids needless writes.
      try {
        const lastPing = localStorage.getItem(ACTIVITY_KEY);
        const today = new Date().toISOString().slice(0, 10);
        if (lastPing !== today) {
          await fetch("/api/pathways/gamification/me/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader() },
          });
          localStorage.setItem(ACTIVITY_KEY, today);
          await load(); // refresh streak count
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
