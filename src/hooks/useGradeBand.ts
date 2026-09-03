/**
 * Hook to determine the current student's grade band from their enrolled courses.
 * Returns "k2" (default) or "g3_5" based on the highest-band class they're enrolled in.
 */
import { useState, useEffect } from "react";
import { api } from "@/services/api";

export type GradeBand = "k2" | "g3_5";

/**
 * Whether the band is still being resolved, is known, or could not be loaded.
 *
 * Content decisions (story overrides, quiz variant, game config) deliberately
 * run on the `k2` default while this is `pending` or `failed` — the youngest
 * band is the safe scaffolded default. **Access** decisions must not: treating
 * an unresolved band as `k2` would tell a 3-5 child their own G3-5 module is
 * "made for bigger kids", reporting an infrastructure failure as a learner
 * outcome (design principle 9 / accessibility contract §6). #856 consumes
 * `useGradeBandState` for exactly that reason.
 */
export type GradeBandStatus = "pending" | "resolved" | "failed";

// Cache keyed by user so a logout → login as a different student in the same
// tab never serves the previous student's band.
let cachedBand: { userKey: string; band: GradeBand } | null = null;

// In-flight dedupe: a page can mount several consumers (ActivityPlayer wants
// the band for content banding while the access policy wants it for the gate),
// and each used to issue its own `/student/courses` request. They now share
// one, so the band is resolved — and can fail — exactly once per attempt.
let inFlight: { userKey: string; promise: Promise<GradeBand> } | null = null;

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
  inFlight = null;
}

/** One shared load per user per attempt; resolves the band, caches on success. */
function loadBand(userKey: string): Promise<GradeBand> {
  if (inFlight?.userKey === userKey) return inFlight.promise;
  const promise = api.getStudentCourses().then((courses: any[]) => {
    // Use the highest grade band from any enrolled course
    const hasG35 = courses?.some((c: any) => c.gradeBand === "g3_5");
    const resolved: GradeBand = hasG35 ? "g3_5" : "k2";
    cachedBand = { userKey, band: resolved };
    return resolved;
  });
  inFlight = { userKey, promise };
  // Clear the slot either way so a retry after a failure actually re-requests.
  promise
    .catch(() => undefined)
    .finally(() => {
      if (inFlight?.promise === promise) inFlight = null;
    });
  return promise;
}

/**
 * The band plus how far its resolution got.
 *
 * `band` keeps the historical contract: `k2` until (and unless) the student's
 * courses say otherwise, so content consumers can ignore `status` entirely.
 *
 * Known gap, deliberately deferred (#856 follow-up): a `/student/courses`
 * outage still quietly narrows a 3-5 student's **dashboard** to the k2 view,
 * so their G3-5 content drops out of "Play Next" with no explanation. The
 * deep-link surfaces refuse to guess and surface a system problem instead, but
 * the dashboard only orders content and has no error surface of its own, so it
 * keeps the historical default rather than blocking the whole page.
 *
 * @param reloadKey bump to retry after a `failed` status.
 */
export function useGradeBandState(reloadKey = 0): {
  band: GradeBand;
  status: GradeBandStatus;
} {
  const userKey = currentUserKey();
  const cached = cachedBand?.userKey === userKey ? cachedBand : null;
  const [state, setState] = useState<{
    band: GradeBand;
    status: GradeBandStatus;
  }>(
    cached
      ? { band: cached.band, status: "resolved" }
      : { band: "k2", status: "pending" },
  );

  useEffect(() => {
    if (cachedBand?.userKey === userKey) {
      setState({ band: cachedBand.band, status: "resolved" });
      return;
    }
    let cancelled = false;
    setState((prev) =>
      prev.status === "pending" ? prev : { band: "k2", status: "pending" },
    );
    loadBand(userKey)
      .then((resolved) => {
        if (!cancelled) setState({ band: resolved, status: "resolved" });
      })
      .catch(() => {
        // Content keeps the k2 default; access consumers must read `status`
        // and refuse to turn this failure into a learner-facing denial.
        if (!cancelled) setState({ band: "k2", status: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [userKey, reloadKey]);

  return state;
}

export function useGradeBand(): GradeBand {
  return useGradeBandState().band;
}
