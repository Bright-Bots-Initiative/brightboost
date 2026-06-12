/**
 * Hook to determine the current student's grade band from their enrolled courses.
 * Returns "k2" (default) or "g3_5" based on the highest-band class they're enrolled in.
 */
import { useState, useEffect } from "react";
import { api } from "@/services/api";

export type GradeBand = "k2" | "g3_5";

// Cache keyed by user so a logout → login as a different student in the same
// tab never serves the previous student's band.
let cachedBand: { userKey: string; band: GradeBand } | null = null;

function currentUserKey(): string {
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return String(parsed.id);
    }
  } catch {
    // fall through to anonymous
  }
  return "anonymous";
}

/** Test-only escape hatch to clear the module-level cache between cases. */
export function __resetGradeBandCache() {
  cachedBand = null;
}

export function useGradeBand(): GradeBand {
  const userKey = currentUserKey();
  const [band, setBand] = useState<GradeBand>(
    cachedBand?.userKey === userKey ? cachedBand.band : "k2",
  );

  useEffect(() => {
    if (cachedBand?.userKey === userKey) {
      setBand(cachedBand.band);
      return;
    }
    let cancelled = false;
    api
      .getStudentCourses()
      .then((courses: any[]) => {
        // Use the highest grade band from any enrolled course
        const hasG35 = courses?.some((c: any) => c.gradeBand === "g3_5");
        const resolved: GradeBand = hasG35 ? "g3_5" : "k2";
        cachedBand = { userKey, band: resolved };
        if (!cancelled) setBand(resolved);
      })
      .catch(() => {
        // Default to k2 on error
      });
    return () => {
      cancelled = true;
    };
  }, [userKey]);

  return band;
}
