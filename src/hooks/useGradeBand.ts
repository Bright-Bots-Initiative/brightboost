/** One session-scoped course result for grade eligibility and dashboard extras. */
import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { withRequestDeadline } from "@/lib/requestDeadline";

export type GradeBand = "k2" | "g3_5";
export type GradeBandStatus = "pending" | "resolved" | "failed";
export type StudentCourse = {
  courseId: string;
  courseName: string;
  gradeBand?: string;
};
type BandState = {
  band: GradeBand;
  status: GradeBandStatus;
  courses: StudentCourse[] | null;
};
const pending: BandState = { band: "k2", status: "pending", courses: null };
const CACHE_TTL_MS = 60_000;
let cached: { key: string; courses: StudentCourse[]; at: number } | null = null;
type CourseRequest = {
  promise: Promise<StudentCourse[]>;
  controller: AbortController;
  consumers: number;
};
const inFlight = new Map<string, CourseRequest>();
const invalidationListeners = new Set<(key: string) => void>();

function currentUserKey(): string {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    // Memory-only; never persist or log the session key.
    return JSON.stringify([
      user?.id ?? "anonymous",
      localStorage.getItem("bb_access_token"),
    ]);
  } catch {
    return "anonymous";
  }
}

function cachedCourses(key: string): StudentCourse[] | null {
  return cached?.key === key && Date.now() - cached.at < CACHE_TTL_MS
    ? cached.courses
    : null;
}

function resolved(courses: StudentCourse[]): BandState {
  return {
    band: courses.some((c) => c.gradeBand === "g3_5") ? "g3_5" : "k2",
    status: "resolved",
    courses,
  };
}

function loadCourses(key: string): CourseRequest {
  const existing = inFlight.get(key);
  if (existing && !existing.controller.signal.aborted) return existing;
  const controller = new AbortController();
  const request: CourseRequest = {
    controller,
    consumers: 0,
    // Deferring the API call also turns a synchronous throw into a rejection.
    promise: withRequestDeadline(
      (signal) => api.getStudentCourses({ signal }),
      controller.signal,
    ).then((courses) => {
      if (
        !Array.isArray(courses) ||
        courses.some((course) => !course || typeof course !== "object")
      ) {
        throw new Error("Invalid course list");
      }
      if (currentUserKey() === key && !controller.signal.aborted)
        cached = { key, courses, at: Date.now() };
      return courses;
    }),
  };
  inFlight.set(key, request);
  void request.promise
    .catch(() => undefined)
    .finally(() => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    });
  return request;
}

/** Refresh membership after a confirmed enrollment change, including mounted consumers. */
export function invalidateGradeBandCache() {
  const key = currentUserKey();
  if (cached?.key === key) cached = null;
  inFlight.get(key)?.controller.abort();
  inFlight.delete(key);
  for (const listener of invalidationListeners) listener(key);
}

/** Test-only escape hatch; production caches expire and requests are cancellable. */
export function __resetGradeBandCache() {
  cached = null;
  for (const request of inFlight.values()) request.controller.abort();
  inFlight.clear();
}

/** Content may use the k2 fallback; access decisions must wait for resolved. */
export function useGradeBandState(reloadKey = 0): BandState {
  const key = currentUserKey();
  const [state, setState] = useState<{ key: string; value: BandState }>(() => {
    const courses = cachedCourses(key);
    return { key, value: courses ? resolved(courses) : pending };
  });
  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout>;
    let release: (() => void) | undefined;

    function refresh(invalidated = false) {
      clearTimeout(timer);
      release?.();
      release = undefined;
      const run = ++generation;
      if (cancelled || currentUserKey() !== key) return;
      const courses = cachedCourses(key);
      if (courses) {
        setState({ key, value: resolved(courses) });
        // A mounted consumer also expires: TTL must not depend on navigation.
        timer = setTimeout(
          () => refresh(),
          Math.max(1, CACHE_TTL_MS - (Date.now() - cached!.at)),
        );
        return;
      }
      // Background freshness must not unmount an activity every minute.
      // An explicit enrollment change invalidates the old answer immediately.
      setState((previous) =>
        !invalidated &&
        previous.key === key &&
        previous.value.status === "resolved"
          ? previous
          : { key, value: pending },
      );
      const request = loadCourses(key);
      request.consumers++;
      release = () => {
        request.consumers--;
        // StrictMode re-subscribes in the same commit. One consumer must not
        // cancel a shared request still needed by another mounted surface.
        queueMicrotask(() => {
          if (request.consumers === 0) {
            request.controller.abort();
            if (inFlight.get(key) === request) inFlight.delete(key);
          }
        });
      };
      const isCurrent = () =>
        !cancelled && generation === run && currentUserKey() === key;
      void request.promise
        .then((loaded) => {
          if (isCurrent()) setState({ key, value: resolved(loaded) });
        })
        .catch(() => {
          if (isCurrent())
            setState({ key, value: { ...pending, status: "failed" } });
        })
        .finally(() => {
          // Bound freshness and retries without spinning on an unavailable API.
          if (isCurrent()) timer = setTimeout(() => refresh(), CACHE_TTL_MS);
        });
    }
    const onInvalidate = (changedKey: string) => {
      if (changedKey === key) refresh(true);
    };
    invalidationListeners.add(onInvalidate);
    refresh();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      invalidationListeners.delete(onInvalidate);
      release?.();
    };
  }, [key, reloadKey]);
  return state.key === key ? state.value : pending;
}

export function useGradeBand(): GradeBand {
  return useGradeBandState().band;
}
