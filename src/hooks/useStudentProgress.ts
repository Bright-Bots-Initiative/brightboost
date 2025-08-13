import { useEffect, useState } from 'react';

export type AggregatedProgress = {
  studentId: string;
  moduleSlug: string;
  percentComplete: number;
  lastLessonId: string | null;
  earnedXp: number;
  totals: { totalActivities: number; totalXp: number; timeSpentS: number };
};

export function useStudentProgress(studentId: string, moduleSlug = 'stem-1') {
  const [data, setData] = useState<AggregatedProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const API_BASE = import.meta.env.VITE_API_BASE || '';
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/progress/${studentId}?module=${moduleSlug}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as AggregatedProgress;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'fetch_failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [studentId, moduleSlug, tick, API_BASE]);

  return { data, loading, error, refetch: () => setTick((v) => v + 1) };
}
