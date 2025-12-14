import { useEffect, useState } from "react";
import { join } from "../services/api";

export type AggregatedProgress = {
  studentId: string;
  moduleSlug: string;
  percentComplete: number;
  lastLessonId: string | null;
  earnedXp: number;
  totals: { totalActivities: number; totalXp: number; timeSpentS: number };
};

export function useStudentProgress(studentId: string, moduleSlug = "stem-1") {
  const [data, setData] = useState<AggregatedProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const token = localStorage.getItem("bb_access_token");
        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(
          join(API_BASE, `/progress/${studentId}?module=${moduleSlug}`),
          { headers }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as AggregatedProgress;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "fetch_failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, moduleSlug, tick]);

  return { data, loading, error, refetch: () => setTick((v) => v + 1) };
}
