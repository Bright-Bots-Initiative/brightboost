/**
 * Hook to determine the current student's grade band from their enrolled courses.
 * Returns "k2" (default) or "g3_5" based on the highest-band class they're enrolled in.
 */
import { useState, useEffect } from "react";
import { api } from "@/services/api";

export type GradeBand = "k2" | "g3_5";

let cachedBand: GradeBand | null = null;

export function useGradeBand(): GradeBand {
  const [band, setBand] = useState<GradeBand>(cachedBand ?? "k2");

  useEffect(() => {
    if (cachedBand) return;
    api.getStudentCourses()
      .then((courses: any[]) => {
        // Use the highest grade band from any enrolled course
        const hasG35 = courses?.some((c: any) => c.gradeBand === "g3_5");
        const resolved: GradeBand = hasG35 ? "g3_5" : "k2";
        cachedBand = resolved;
        setBand(resolved);
      })
      .catch(() => {
        // Default to k2 on error
      });
  }, []);

  return band;
}
