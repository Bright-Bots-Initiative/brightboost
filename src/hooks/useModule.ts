import { useEffect, useState } from "react";

export type Activity = {
  id: string;
  index: number;
  kind: "INFO" | "INTERACT" | "REFLECT";
  title: string;
  xp: number;
};
export type Lesson = {
  id: string;
  index: number;
  title: string;
  activities: Activity[];
  assessment?: { id: string } | null;
};
export type Unit = {
  id: string;
  index: number;
  title: string;
  lessons: Lesson[];
};
export type Module = {
  slug: string;
  title: string;
  totalXp: number;
  units: Unit[];
  badges: { slug: string; name: string; xpBonus: number }[];
};

export function useModule(slug = "stem-1") {
  const [data, setData] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_BASE || "";
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/module/${slug}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Module;
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
  }, [slug]);

  return { data, loading, error };
}
