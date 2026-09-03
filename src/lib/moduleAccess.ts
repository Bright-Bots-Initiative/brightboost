/**
 * Centralized module-access logic for set-gated and specialization-locked content.
 *
 * Rules:
 * 1. Set 1 (Foundation) modules are always accessible.
 * 2. Set 2 (Exploration) modules are locked until all Set 1 activities are complete.
 *    Once unlocked, all 5 Set 2 modules are accessible at the same time.
 * 3. Specialization modules (Quantum Explorers / stem-1-intro) are hidden until
 *    the student has chosen a specialization.
 * 4. Specialization choice is gated behind completing STEM Set 3
 *    (enforced in Avatar.tsx + backend POST /avatar/select-archetype).
 *
 * ## The access model (#856)
 *
 * `resolveModuleAccess` is the single front door every student-facing surface
 * consults before it links to, opens, or initializes a module. It separates
 * concerns that used to be tangled (or simply missing) per surface:
 *
 * - **A — registration.** The module exists and is served by the catalog.
 * - **B — visibility.** `HIDDEN_MODULE_SLUGS` and set placeholders. The hidden
 *   set is *runtime state* (a mutable `Set` a release flag flips), so it is
 *   injected, never captured at import time.
 * - **C — grade eligibility.** Normalized: level `"K-2"` is allowed for **all**
 *   bands — banding is intra-activity by product design — while level `"G3-5"`
 *   requires a `g3_5` student. An unrecognized/absent level is unrestricted.
 *   The specialization/archetype gate is part of C (identity eligibility).
 * - **D — progression unlock.** Set locks, computed by the `stemSets`
 *   predicates over COMPLETED game activity IDs.
 * - **E — teacher assignment.** See the policy below.
 * - **F — navigation.** Whether the UI may link to (or open) the target — this
 *   is what the result is *for*.
 * - **G — authorization.** Explicitly OUT of scope: this primitive is frontend
 *   navigation/visibility POLICY, not a security boundary. Whether the server
 *   should also refuse a locked-set completion remains an owner decision
 *   (#856); nothing here changes backend behavior.
 *
 * ### Precedence
 *
 * `unregistered` → `hidden`/placeholder → `wrong_grade` → `not_specialized` →
 * `locked_set` (unless a teacher assignment overrides it) → allowed.
 *
 * `unregistered` and `hidden` are distinct *values* so tests and telemetry can
 * tell them apart, but every surface renders them with the **same** copy
 * (`MODULE_UNAVAILABLE_REASON_KEYS`) so hidden content is not distinguishable
 * from content that never existed. A Set 3 placeholder slot has no module
 * record, so it resolves as `unregistered` — that is what "placeholder" means
 * in this codebase (see `STEM_SET_3_IDS` vs `STEM_SET_3_MODULE_SLUGS`).
 *
 * ### Teacher-assignment policy (codified contract — flagged for owner confirmation)
 *
 * A valid teacher session assignment **overrides the set lock (D)** for its
 * specific target, but **never** overrides registration (A), visibility (B), or
 * grade eligibility (C, including the specialization gate). Grounded in the
 * existing end-to-end behavior (an assigned activity is navigable today),
 * design principle 6 (the adult is a guide) and principle 9's platform rule
 * that teacher assignments outrank surprise, plus #842's "assignment must not
 * be bypassed or obscured". The override is keyed on the assignment's module
 * slug: a set lock is a module/set-level gate, so an assignment naming content
 * inside a locked set lifts that lock for that module only.
 */
import {
  STEM_SET_2_MODULE_SLUGS,
  STEM_SET_3_MODULE_SLUGS,
  isSet2Locked,
  isSet3Locked,
} from "@/constants/stemSets";

// ── Specialization-gated module slugs ────────────────────────────────────
// Add future specialization-only modules here.
const SPECIALIZATION_MODULE_SLUGS = new Set([
  "stem-1-intro", // "Quantum Explorers" — hidden until archetype chosen
]);

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Robustly extract the student's archetype/specialization from avatar data.
 * The API may return nested `{ avatar: { archetype } }` or flat `{ archetype }`.
 */
export function getStudentArchetype(avatarData: unknown): string | null {
  if (!avatarData || typeof avatarData !== "object") return null;
  const obj = avatarData as Record<string, unknown>;

  // nested: avatar.avatar.archetype
  if (obj.avatar && typeof obj.avatar === "object") {
    const inner = obj.avatar as Record<string, unknown>;
    if (typeof inner.archetype === "string") return inner.archetype;
    if (typeof inner.specialization === "string") return inner.specialization;
  }

  // flat: avatar.archetype / avatar.specialization
  if (typeof obj.archetype === "string") return obj.archetype;
  if (typeof obj.specialization === "string") return obj.specialization;

  return null;
}

/** True when `slug` is a specialization-gated module (e.g. Quantum Explorers). */
export function isSpecializationModuleSlug(slug: string): boolean {
  return SPECIALIZATION_MODULE_SLUGS.has(slug);
}

/** True when `slug` is a Set 2 module. */
export function isSet2ModuleSlug(slug: string): boolean {
  return (STEM_SET_2_MODULE_SLUGS as readonly string[]).includes(slug);
}

/**
 * Whether Set 2 is currently locked for the student.
 * Pass the list of completed activity IDs from their progress.
 */
export function checkSet2Locked(completedActivityIds: string[]): boolean {
  return isSet2Locked(completedActivityIds);
}

/** True when `slug` is a Set 3 module. */
export function isSet3ModuleSlug(slug: string): boolean {
  return (STEM_SET_3_MODULE_SLUGS as readonly string[]).includes(slug);
}

/**
 * Whether Set 3 is currently locked for the student — mirrors the
 * Set 1 → Set 2 gate (Set 3 unlocks when all Set 2 activities are complete).
 */
export function checkSet3Locked(completedActivityIds: string[]): boolean {
  return isSet3Locked(completedActivityIds);
}

/**
 * Whether the student can access a given module.
 *
 * - Foundation/public modules → always true.
 * - Specialization modules → true only if the student has any archetype.
 */
export function canAccessModule({
  slug,
  archetype,
}: {
  slug: string;
  archetype: string | null;
}): boolean {
  if (!isSpecializationModuleSlug(slug)) return true;
  // Specialization modules require *any* archetype to be chosen
  return !!archetype;
}

// ── The access primitive (#856) ───────────────────────────────────────────

/** Why a target was refused. See the precedence list in the module jsdoc. */
export type ModuleAccessDenialReason =
  | "unregistered"
  | "hidden"
  | "wrong_grade"
  | "not_specialized"
  | "locked_set";

/**
 * Why a target was allowed — progression earned it, or a teacher assigned it.
 *
 * Kept in the result even though no surface discloses it yet: #842's guided
 * choice needs to say *"your teacher picked this"* rather than presenting an
 * assigned target as a free choice, and that disclosure reads this field.
 */
export type ModuleAccessSource = "progression" | "teacher_assignment";

export type ModuleAccessResult =
  | { allowed: true; source: ModuleAccessSource }
  | { allowed: false; reason: ModuleAccessDenialReason };

/** The student's resolved grade band (mirrors `useGradeBand`, k2 by default). */
export type ModuleAccessGradeBand = "k2" | "g3_5";

/** The slice of a catalog module record the policy actually reads. */
export interface ModuleAccessTarget {
  slug?: string | null;
  level?: string | null;
  published?: boolean | null;
}

export interface ResolveModuleAccessInput {
  /** The slug being navigated to / rendered. */
  slug: string;
  /**
   * The catalog record for `slug`, or `null` when the catalog has no such
   * module (unregistered — including Set 3 placeholder slots). `undefined` is
   * treated exactly like `null`: callers must not resolve access before they
   * know whether the module exists (fail closed).
   */
  module: ModuleAccessTarget | null | undefined;
  /** Runtime hidden-slug state — injected, never captured at import time. */
  hiddenSlugs: ReadonlySet<string>;
  /** COMPLETED game activity IDs from the student's progress. */
  completedActivityIds: readonly string[];
  /** The student's archetype/specialization, or null when unchosen. */
  archetype: string | null;
  /** The student's grade band (`useGradeBand`'s canonical k2 fallback). */
  gradeBand: ModuleAccessGradeBand;
  /** Module slugs a teacher has assigned to this student (policy E). */
  assignedModuleSlugs?: ReadonlySet<string> | readonly string[];
}

/**
 * i18n keys for the child-facing reason on an unavailable surface.
 *
 * `unregistered` and `hidden` deliberately map to the SAME key: a learner must
 * not be able to tell held-back content from content that does not exist.
 */
export const MODULE_UNAVAILABLE_REASON_KEYS: Record<
  ModuleAccessDenialReason,
  string
> = {
  unregistered: "modules.unavailable.generic",
  hidden: "modules.unavailable.generic",
  wrong_grade: "modules.unavailable.wrongGrade",
  not_specialized: "modules.unavailable.notSpecialized",
  locked_set: "modules.unavailable.lockedSet",
};

/**
 * Phase 1 of the policy: the visibility rule (B), which needs only the slug.
 *
 * Surfaces call this *before* fetching content so hidden/placeholder targets
 * are refused without a round-trip. `resolveModuleAccess` applies the same
 * rule again, so the two-phase evaluation is observationally equivalent: the
 * only divergence is that a hidden slug whose module also does not exist
 * reports `hidden` instead of `unregistered`, and both render identical copy.
 */
export function isHiddenTarget(
  slug: string,
  hiddenSlugs: ReadonlySet<string>,
): boolean {
  return hiddenSlugs.has(slug);
}

/**
 * True when the slug is gated by set progression (D).
 *
 * Consumers use this to decide whether progress/assignment data is worth
 * fetching at all — for an ungated slug the answer cannot change.
 */
export function isProgressionGatedSlug(slug: string): boolean {
  return isSet2ModuleSlug(slug) || isSet3ModuleSlug(slug);
}

/**
 * Normalize the catalog's free-form `level` string (`schema.prisma` documents
 * it as `"K-2"`, `"3-5"`, etc.) into a band requirement, or `null` when the
 * value carries no grade restriction we recognize.
 */
function normalizeLevel(
  level: string | null | undefined,
): ModuleAccessGradeBand | null {
  if (typeof level !== "string") return null;
  const compact = level.trim().toUpperCase().replace(/[\s_]/g, "");
  if (compact === "K-2" || compact === "K2") return "k2";
  if (
    compact === "G3-5" ||
    compact === "G35" ||
    compact === "3-5" ||
    compact === "35"
  ) {
    return "g3_5";
  }
  return null;
}

/**
 * Grade eligibility (C), normalized.
 *
 * K-2 content is allowed for **every** band — banding is intra-activity by
 * product design, and a 3-5 class still plays the K-2 STEM sets. G3-5 content
 * requires a `g3_5` student.
 *
 * **Accepted hole:** an unrecognized or absent level is treated as
 * unrestricted. `Module.level` is a free-form `String` (`schema.prisma`
 * documents it as `"K-2"`, `"3-5"`, etc.) with no enum or migration behind it,
 * so a typo, a future band, or a seed that forgets the field would otherwise
 * lock every child out of registered, visible, teacher-assignable content. The
 * failure mode we accept is the milder one — a mislabelled module stays
 * playable by everyone — because this is navigation policy, not a security
 * boundary. Tightening it means giving `level` a checked vocabulary first.
 */
export function isGradeEligible(
  level: string | null | undefined,
  gradeBand: ModuleAccessGradeBand,
): boolean {
  const required = normalizeLevel(level);
  if (required === null) return true;
  if (required === "k2") return true;
  return gradeBand === "g3_5";
}

/**
 * Does knowing the band change the answer for this level?
 *
 * Only `G3-5` content discriminates: `K-2` and unrecognized levels are open to
 * both bands. Consumers use this so an unresolved band blocks (or fails) the
 * decision **only** where it could actually matter — a K-2 module never waits
 * on `/student/courses`, and a band outage never turns into a wrong-grade
 * denial for content the band has no say over.
 */
export function gradeBandAffectsAccess(
  level: string | null | undefined,
): boolean {
  return isGradeEligible(level, "k2") !== isGradeEligible(level, "g3_5");
}

/** Progression lock (D) for a slug, given COMPLETED game activity IDs. */
function isProgressionLocked(
  slug: string,
  completedActivityIds: string[],
): boolean {
  if (isSet3ModuleSlug(slug)) return checkSet3Locked(completedActivityIds);
  if (isSet2ModuleSlug(slug)) return checkSet2Locked(completedActivityIds);
  return false;
}

/**
 * Normalize client-supplied progress before it can unlock anything.
 *
 * Stale or hand-edited client progress must not manufacture an unlock: unknown
 * IDs are already ignored by `countCompletedInSet`, but repeated IDs would
 * otherwise be counted more than once, so dedupe (and drop non-strings) here.
 */
function normalizeCompletedIds(ids: readonly string[]): string[] {
  return Array.from(
    new Set(ids.filter((id): id is string => typeof id === "string")),
  );
}

const EMPTY_SLUG_SET: ReadonlySet<string> = new Set<string>();

function toSlugSet(
  slugs: ReadonlySet<string> | readonly string[] | undefined,
): ReadonlySet<string> {
  if (!slugs) return EMPTY_SLUG_SET;
  return slugs instanceof Set ? slugs : new Set(slugs);
}

/**
 * The one front door: may this student navigate to / open this module?
 *
 * Pure and dependency-injected — every input (catalog record, hidden set,
 * progress, archetype, band, teacher assignments) is passed in, so the same
 * function answers for the dashboard's Continue scan, the module detail page,
 * the activity player, the assignment list and the teacher's picker.
 *
 * Reminder (policy G): this is frontend navigation/visibility POLICY, not a
 * security boundary.
 */
export function resolveModuleAccess(
  input: ResolveModuleAccessInput,
): ModuleAccessResult {
  const {
    slug,
    module,
    hiddenSlugs,
    completedActivityIds,
    archetype,
    gradeBand,
    assignedModuleSlugs,
  } = input;

  // A — registration. No record (or a record for a different/unpublished
  // module) means the target is not served: placeholders land here too.
  if (!module || typeof module !== "object") {
    return { allowed: false, reason: "unregistered" };
  }
  if (typeof module.slug === "string" && module.slug && module.slug !== slug) {
    return { allowed: false, reason: "unregistered" };
  }
  if (module.published === false) {
    return { allowed: false, reason: "unregistered" };
  }

  // B — visibility.
  if (isHiddenTarget(slug, hiddenSlugs)) {
    return { allowed: false, reason: "hidden" };
  }

  // C — grade eligibility, then the specialization gate.
  if (!isGradeEligible(module.level, gradeBand)) {
    return { allowed: false, reason: "wrong_grade" };
  }
  if (!canAccessModule({ slug, archetype })) {
    return { allowed: false, reason: "not_specialized" };
  }

  // D — progression, and E — the teacher-assignment override.
  if (isProgressionLocked(slug, normalizeCompletedIds(completedActivityIds))) {
    if (toSlugSet(assignedModuleSlugs).has(slug)) {
      return { allowed: true, source: "teacher_assignment" };
    }
    return { allowed: false, reason: "locked_set" };
  }

  return { allowed: true, source: "progression" };
}

/**
 * Policy E from the teacher's side: may this target be offered in the
 * assignment picker?
 *
 * A + B + C only. The set lock (D) is deliberately not applied, because the
 * assignment being created is itself that lock's override — but registration,
 * visibility and grade eligibility are never overridable, so hidden,
 * placeholder, unregistered and wrong-band content is never selectable.
 *
 * `archetype` defaults to `null`, which means **specialization-gated modules
 * are never assignable to a class**. That is deliberate and pinned by test:
 * an archetype is an individual choice each student makes on the avatar page,
 * so there is no class-wide answer a teacher could stand in for, and assigning
 * one would strand every student who has not chosen that specialization. If a
 * per-student assignment picker ever exists, it should pass that student's
 * archetype rather than relax this.
 */
export function canTeacherAssignModule({
  slug,
  module,
  hiddenSlugs,
  gradeBand,
  archetype = null,
}: {
  slug: string;
  module: ModuleAccessTarget | null | undefined;
  hiddenSlugs: ReadonlySet<string>;
  gradeBand: ModuleAccessGradeBand;
  archetype?: string | null;
}): boolean {
  return resolveModuleAccess({
    slug,
    module,
    hiddenSlugs,
    completedActivityIds: [],
    archetype,
    gradeBand,
    // The assignment under construction is its own override for the set lock.
    assignedModuleSlugs: [slug],
  }).allowed;
}
