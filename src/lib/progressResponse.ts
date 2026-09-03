/**
 * Normalizing `GET /get-progress` responses for the access policy (#856).
 *
 * Lives on its own rather than inside `useModuleAccess` so that every consumer
 * — the hook and `ModuleDetail` alike — reaches it across a module boundary,
 * which is also what makes the guard falsifiable at a single seam.
 */

/**
 * Read COMPLETED activity IDs out of a progress response, treating a response
 * with no `progress` array as a **failure**.
 *
 * `api.getProgress` never checks `res.ok` — it returns `res.json()` directly —
 * so a backend error resolves rather than rejects, carrying the routes' error
 * shape (`{ error: "Internal server error" }`). Reading that through `?? []`
 * would tell the policy this child has completed nothing, and refuse a Set 2
 * module they have already earned: a server fault reported as the learner's
 * own doing, which is exactly what design principle 9 and the accessibility
 * contract's §6 forbid.
 *
 * The shared `api.getProgress` helper is deliberately left alone — its
 * resolve-always behaviour is depended on outside this change
 * (`StudentDashboard`'s `Promise.all`, among others), so hardening it is its
 * own piece of work. Every access consumer routes through here instead.
 *
 * @throws when the response is not a progress payload.
 */
export function completedIdsFromProgressResponse(data: unknown): string[] {
  const rows = (data as { progress?: unknown } | null | undefined)?.progress;
  if (!Array.isArray(rows)) {
    throw new Error("getProgress resolved without a progress array");
  }
  return rows
    .filter((p) => (p as { status?: string })?.status === "COMPLETED")
    .map((p) => String((p as { activityId?: unknown })?.activityId));
}
