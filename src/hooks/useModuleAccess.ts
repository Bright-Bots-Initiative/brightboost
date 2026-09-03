/**
 * Data-loading front for `resolveModuleAccess` (#856).
 *
 * The policy itself is pure (`src/lib/moduleAccess.ts`); this hook is the thin
 * seam that feeds it on the two deep-link surfaces (ModuleDetail and
 * ActivityPlayer), so neither page grows its own copy of the rules.
 *
 * It fetches as little as the answer requires:
 * - the hidden-slug rule needs nothing, and resolves on the first render, so a
 *   held-back target is refused before any content request goes out;
 * - the archetype is fetched only for specialization-gated slugs;
 * - progress is fetched only for progression-gated slugs (Set 2 / Set 3);
 * - teacher assignments are fetched only when a set lock would otherwise
 *   refuse the target — the assignment override is the only thing that could
 *   change the answer at that point.
 *
 * Reminder (policy G): this is frontend navigation/visibility POLICY, not a
 * security boundary.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { HIDDEN_MODULE_SLUGS } from "@/constants/stemSets";
import { useGradeBand } from "@/hooks/useGradeBand";
import {
  getStudentArchetype,
  isHiddenTarget,
  isProgressionGatedSlug,
  isSpecializationModuleSlug,
  resolveModuleAccess,
  type ModuleAccessResult,
  type ModuleAccessTarget,
} from "@/lib/moduleAccess";

export type ModuleAccessState =
  | { status: "pending"; access: null }
  | { status: "resolved"; access: ModuleAccessResult };

const PENDING: ModuleAccessState = { status: "pending", access: null };
/** Stable empty progress for slugs no set lock can gate. */
const NO_COMPLETED_IDS: readonly string[] = [];

export interface UseModuleAccessOptions {
  /** Route slug. `undefined` keeps the hook pending. */
  slug: string | undefined;
  /**
   * The catalog record for `slug`: `undefined` while it is still loading,
   * `null` once the catalog is known to have no such module.
   */
  module: ModuleAccessTarget | null | undefined;
  /**
   * COMPLETED activity IDs, when the caller already has them. Supplying them
   * avoids a duplicate `getProgress` round-trip (ModuleDetail already loads
   * progress for its done/replay chips).
   */
  completedActivityIds?: readonly string[];
  /**
   * Set when the caller loads progress itself: the hook then waits for
   * `completedActivityIds` instead of issuing its own request, so a Set 2 / 3
   * module page does not fetch progress twice.
   */
  providesProgress?: boolean;
}

export function useModuleAccess({
  slug,
  module,
  completedActivityIds,
  providesProgress = false,
}: UseModuleAccessOptions): ModuleAccessState {
  const gradeBand = useGradeBand();

  const hiddenDenied = !!slug && isHiddenTarget(slug, HIDDEN_MODULE_SLUGS);
  const needsArchetype = !!slug && isSpecializationModuleSlug(slug);
  const needsProgress =
    !!slug && !providesProgress && isProgressionGatedSlug(slug);

  const [archetype, setArchetype] = useState<string | null | undefined>(
    undefined,
  );
  const [fetchedCompletedIds, setFetchedCompletedIds] = useState<
    string[] | undefined
  >(undefined);
  const [assignedSlugs, setAssignedSlugs] = useState<Set<string> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (hiddenDenied || !needsArchetype) return;
    let cancelled = false;
    Promise.resolve(api.getAvatar())
      .then((avatarData) => {
        if (!cancelled) setArchetype(getStudentArchetype(avatarData));
      })
      .catch(() => {
        // Unknown archetype is treated as "not chosen" — fail closed.
        if (!cancelled) setArchetype(null);
      });
    return () => {
      cancelled = true;
    };
  }, [hiddenDenied, needsArchetype, slug]);

  useEffect(() => {
    if (hiddenDenied || !needsProgress) return;
    let cancelled = false;
    Promise.resolve(api.getProgress({ excludeUser: true }))
      .then(
        (data: { progress?: { status?: string; activityId?: unknown }[] }) =>
          (data?.progress ?? [])
            .filter((p) => p?.status === "COMPLETED")
            .map((p) => String(p.activityId)),
      )
      .catch(() => [] as string[])
      .then((ids) => {
        if (!cancelled) setFetchedCompletedIds(ids);
      });
    return () => {
      cancelled = true;
    };
  }, [hiddenDenied, needsProgress, slug]);

  const completed = providesProgress
    ? completedActivityIds
    : (completedActivityIds ??
      (needsProgress ? fetchedCompletedIds : NO_COMPLETED_IDS));

  // The policy lives in `resolveModuleAccess`; this hook only decides which
  // inputs are worth loading. `resolve` is called twice at most: once without
  // assignments (to learn whether a set lock is in play) and, only then, once
  // with them.
  const resolve = useCallback(
    (
      assignedModuleSlugs: ReadonlySet<string> | undefined,
    ): ModuleAccessResult | null => {
      if (!slug) return null;
      if (hiddenDenied) return { allowed: false, reason: "hidden" as const };
      if (module === undefined) return null;
      if (needsArchetype && archetype === undefined) return null;
      if (completed === undefined) return null;
      return resolveModuleAccess({
        slug,
        module,
        hiddenSlugs: HIDDEN_MODULE_SLUGS,
        completedActivityIds: completed,
        archetype: archetype ?? null,
        gradeBand,
        assignedModuleSlugs,
      });
    },
    [
      slug,
      hiddenDenied,
      module,
      needsArchetype,
      archetype,
      completed,
      gradeBand,
    ],
  );

  // Provisional answer with no assignment override. Only when this refuses on
  // a set lock is the assignment list worth a request.
  const provisional = useMemo(() => resolve(undefined), [resolve]);

  const needsAssignments =
    !!provisional &&
    !provisional.allowed &&
    provisional.reason === "locked_set";

  useEffect(() => {
    if (!needsAssignments) return;
    let cancelled = false;
    Promise.resolve(api.getStudentAssignments())
      .then((sessions: { moduleSlug?: string | null }[]) =>
        Array.isArray(sessions)
          ? sessions
              .map((s) => s?.moduleSlug)
              .filter((s): s is string => typeof s === "string" && !!s)
          : [],
      )
      .catch(() => [] as string[])
      .then((slugs) => {
        if (!cancelled) setAssignedSlugs(new Set(slugs));
      });
    return () => {
      cancelled = true;
    };
  }, [needsAssignments, slug]);

  return useMemo<ModuleAccessState>(() => {
    if (!provisional) return PENDING;
    if (!needsAssignments) return { status: "resolved", access: provisional };
    if (assignedSlugs === undefined) return PENDING;
    const withAssignments = resolve(assignedSlugs);
    if (!withAssignments) return PENDING;
    return { status: "resolved", access: withAssignments };
  }, [provisional, needsAssignments, assignedSlugs, resolve]);
}
