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
    const courses = cachedCourses(key);
    if (courses) {
      setState({ key, value: resolved(courses) });
      return;
    }
    let cancelled = false;
    setState({ key, value: pending });
    const request = loadCourses(key);
    request.consumers++;
    void request.promise
      .then((loaded) => {
        if (!cancelled && currentUserKey() === key)
          setState({ key, value: resolved(loaded) });
      })
      .catch(() => {
        if (!cancelled && currentUserKey() === key)
          setState({ key, value: { ...pending, status: "failed" } });
      });
    return () => {
      cancelled = true;
      request.consumers--;
      // StrictMode re-subscribes in the same commit. Abort only once the last
      // consumer is gone, so one page cannot cancel another page's shared load.
      queueMicrotask(() => {
        if (request.consumers === 0) {
          request.controller.abort();
          if (inFlight.get(key) === request) inFlight.delete(key);
        }
      });
    };
  }, [key, reloadKey]);
  return state.key === key ? state.value : pending;
}

export function useGradeBand(): GradeBand {
  return useGradeBandState().band;
}
