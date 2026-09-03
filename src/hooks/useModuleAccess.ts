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
 * - an unregistered target (a real 404) resolves without waiting on anything
 *   else, so a ghost slug is refused exactly like a hidden one;
 * - the archetype is fetched only for specialization-gated slugs;
 * - progress is fetched only for progression-gated slugs (Set 2 / Set 3);
 * - the grade band is waited on only for content whose level the band actually
 *   discriminates (`gradeBandAffectsAccess`) — a K-2 module never blocks on
 *   `/student/courses`;
 * - teacher assignments are fetched only when a set lock would otherwise
 *   refuse the target — the assignment override is the only thing that could
 *   change the answer at that point.
 *
 * ## Three states, not two
 *
 * Infrastructure failures are not access decisions (design principle 9 /
 * `docs/safe-exploration-accessibility.md` §6). An input the decision needs
 * that cannot be loaded resolves to `status: "error"` — an honest
 * system-problem state the surface renders distinctly — never to a
 * learner-facing reason they would read as their own doing ("finish the games
 * before this one", "made for bigger kids"). `status: "pending"` means the
 * answer is still loading and the surface must keep showing its loading state,
 * never a "not found" card. The one deliberate exception is the assignment
 * list: its failure falls back to the progression answer, which is the
 * truthful answer for a student with no assignment.
 *
 * ## Known costs (accepted, not oversights)
 *
 * - A Set 2 / Set 3 activity deep link costs one extra `GET /progress` per
 *   mount (ActivityPlayer has no progress of its own). Ungated slugs — every
 *   Set 1 module and all G3-5 content — pay nothing. Deduping it would mean a
 *   shared progress cache, which is a bigger change than #856 owns.
 * - A page can mount this hook alongside a plain `useGradeBand()` (ActivityPlayer
 *   does: one for content banding, one for the gate). `useGradeBandState`
 *   dedupes the in-flight `/student/courses` request, so that costs one call,
 *   not two.
 *
 * Reminder (policy G): this is frontend navigation/visibility POLICY, not a
 * security boundary.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { HIDDEN_MODULE_SLUGS } from "@/constants/stemSets";
import { useGradeBandState } from "@/hooks/useGradeBand";
import { completedIdsFromProgressResponse } from "@/lib/progressResponse";
import {
  getStudentArchetype,
  gradeBandAffectsAccess,
  isHiddenTarget,
  isProgressionGatedSlug,
  isSpecializationModuleSlug,
  resolveModuleAccess,
  type ModuleAccessResult,
  type ModuleAccessTarget,
} from "@/lib/moduleAccess";

export type ModuleAccessState =
  /** Still loading an input the decision needs. Keep showing loading. */
  | { status: "pending"; access: null }
  | { status: "resolved"; access: ModuleAccessResult }
  /** An input could not be loaded. A system problem, not a learner outcome. */
  | { status: "error"; access: null };

const PENDING: ModuleAccessState = { status: "pending", access: null };
const ERROR: ModuleAccessState = { status: "error", access: null };
/** Stable empty progress for slugs no set lock can gate. */
const NO_COMPLETED_IDS: readonly string[] = [];

/** Internal marker for "this input failed to load", distinct from "unknown". */
const FAILED = Symbol("failed");
type OrFailed<T> = T | typeof FAILED | undefined;

export interface UseModuleAccessOptions {
  /** Route slug. `undefined` keeps the hook pending. */
  slug: string | undefined;
  /**
   * The catalog record for `slug`: `undefined` while it is still loading,
   * `null` once the catalog is known to have no such module (a real 404).
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
  /** Bump to retry every request this hook owns after a `status: "error"`. */
  attempt?: number;
}

export function useModuleAccess({
  slug,
  module,
  completedActivityIds,
  providesProgress = false,
  attempt = 0,
}: UseModuleAccessOptions): ModuleAccessState {
  const { band: gradeBand, status: bandStatus } = useGradeBandState(attempt);

  const hiddenDenied = !!slug && isHiddenTarget(slug, HIDDEN_MODULE_SLUGS);
  const unregistered = module === null;
  const inert = hiddenDenied || unregistered;
  const needsArchetype = !inert && !!slug && isSpecializationModuleSlug(slug);
  const needsProgress =
    !inert && !!slug && !providesProgress && isProgressionGatedSlug(slug);

  const [archetype, setArchetype] =
    useState<OrFailed<string | null>>(undefined);
  const [fetchedCompletedIds, setFetchedCompletedIds] =
    useState<OrFailed<string[]>>(undefined);
  const [assignedSlugs, setAssignedSlugs] = useState<Set<string> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!needsArchetype) return;
    let cancelled = false;
    setArchetype(undefined);
    Promise.resolve(api.getAvatar())
      .then((avatarData) => {
        if (!cancelled) setArchetype(getStudentArchetype(avatarData));
      })
      .catch(() => {
        if (!cancelled) setArchetype(FAILED);
      });
    return () => {
      cancelled = true;
    };
  }, [needsArchetype, slug, attempt]);

  useEffect(() => {
    if (!needsProgress) return;
    let cancelled = false;
    setFetchedCompletedIds(undefined);
    Promise.resolve(api.getProgress({ excludeUser: true }))
      // A rejection AND a resolved-but-malformed body both mean the same
      // thing: progress is unknown, so no answer that depends on it is safe.
      .then(completedIdsFromProgressResponse)
      .then((ids) => {
        if (!cancelled) setFetchedCompletedIds(ids);
      })
      .catch(() => {
        if (!cancelled) setFetchedCompletedIds(FAILED);
      });
    return () => {
      cancelled = true;
    };
  }, [needsProgress, slug, attempt]);

  const completed = providesProgress
    ? completedActivityIds
    : (completedActivityIds ??
      (needsProgress ? fetchedCompletedIds : NO_COMPLETED_IDS));

  // The policy lives in `resolveModuleAccess`; this hook only decides which
  // inputs are worth loading. `resolve` is called twice at most: once without
  // assignments (to learn whether a set lock is in play) and, only then, once
  // with them. It returns PENDING/ERROR sentinels rather than guessing.
  const resolve = useCallback(
    (
      assignedModuleSlugs: ReadonlySet<string> | undefined,
    ): ModuleAccessState => {
      if (!slug) return PENDING;
      if (hiddenDenied) {
        return {
          status: "resolved",
          access: { allowed: false, reason: "hidden" },
        };
      }
      if (module === undefined) return PENDING;

      // A registered target still needs its other inputs; an unregistered one
      // is refused on the record alone, so a ghost slug never waits on (or
      // fails because of) progress, archetype or band.
      if (module !== null) {
        if (needsArchetype) {
          if (archetype === FAILED) return ERROR;
          if (archetype === undefined) return PENDING;
        }
        if (completed === FAILED) return ERROR;
        if (completed === undefined) return PENDING;
        if (gradeBandAffectsAccess(module.level)) {
          if (bandStatus === "failed") return ERROR;
          if (bandStatus === "pending") return PENDING;
        }
      }

      return {
        status: "resolved",
        access: resolveModuleAccess({
          slug,
          module,
          hiddenSlugs: HIDDEN_MODULE_SLUGS,
          completedActivityIds:
            completed === FAILED || completed === undefined
              ? NO_COMPLETED_IDS
              : completed,
          archetype:
            archetype === FAILED || archetype === undefined ? null : archetype,
          gradeBand,
          assignedModuleSlugs,
        }),
      };
    },
    [
      slug,
      hiddenDenied,
      module,
      needsArchetype,
      archetype,
      completed,
      gradeBand,
      bandStatus,
    ],
  );

  // Provisional answer with no assignment override. Only when this refuses on
  // a set lock is the assignment list worth a request.
  const provisional = useMemo(() => resolve(undefined), [resolve]);

  const needsAssignments =
    provisional.status === "resolved" &&
    !provisional.access.allowed &&
    provisional.access.reason === "locked_set";

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
      // An unreachable assignment list falls back to the progression answer:
      // "you have not unlocked this yet" is the truthful state for a student
      // with no assignment, and the alternative is a page that never resolves.
      .catch(() => [] as string[])
      .then((slugs) => {
        if (!cancelled) setAssignedSlugs(new Set(slugs));
      });
    return () => {
      cancelled = true;
    };
  }, [needsAssignments, slug, attempt]);

  return useMemo<ModuleAccessState>(() => {
    if (!needsAssignments) return provisional;
    if (assignedSlugs === undefined) return PENDING;
    return resolve(assignedSlugs);
  }, [provisional, needsAssignments, assignedSlugs, resolve]);
}
