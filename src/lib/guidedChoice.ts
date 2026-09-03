/**
 * Guided choice within already-unlocked STEM sets (#842).
 *
 * ## What this is
 *
 * The single authoritative eligibility selector behind the Modules page's four
 * navigation choices: **Continue** (the ordered path), **Try another path**
 * (alternatives), **Revisit** (replay finished work) and **Surprise me** (one
 * seeded pick from the alternatives).
 *
 * Design principle 9 draws the boundary this file has to hold:
 *
 * > Safe exploration happens **within** the deliberately ordered, gated
 * > learning structure — inside content already unlocked — never as a bypass of
 * > set progression, mastery requirements, or teacher assignments.
 *
 * and, for the surprise specifically:
 *
 * > Surprise chooses only among experiences that are registered, visible,
 * > unlocked, grade-appropriate, and appropriate to the learner's completion
 * > state and context.
 *
 * ## How it holds that boundary
 *
 * **Every access decision is `resolveModuleAccess` (`src/lib/moduleAccess.ts`).**
 * There is deliberately not one inline predicate here — no `HIDDEN_MODULE_SLUGS`
 * lookup, no `checkSet2Locked` call, no level comparison, no archetype test.
 * Re-deriving any of those would create a second, drifting copy of the gate,
 * which is exactly the failure #856 existed to remove. If a rule needs to
 * change, it changes in `moduleAccess.ts` and this file inherits it.
 *
 * What this file *does* own is the part that is not an access question:
 * - which access denials mean what in **choice** vocabulary (see below);
 * - completion and duplication — a finished module and the module Continue is
 *   already pointing at are both real destinations, just not *alternatives*;
 * - the shape of a destination the UI and the surprise disclosure read.
 *
 * ## Purity
 *
 * Every input is injected: catalog records, hidden set, progress, archetype,
 * band, teacher assignments and the Continue scan result. No fetching, no
 * `Date`, no `Math.random`, no module-level state. The surprise pick itself is
 * a separate pure function (`pickSeeded` in `src/lib/seededRng.ts`) so tests
 * pin a seed rather than stubbing global randomness (#842 Part 1).
 *
 * Reminder, inherited from `moduleAccess.ts` policy G: this is frontend
 * navigation/visibility POLICY, not a security boundary.
 */
import {
  isSet2ModuleSlug,
  isSet3ModuleSlug,
  resolveModuleAccess,
  type ModuleAccessGradeBand,
  type ModuleAccessSource,
  type ModuleAccessTarget,
} from "@/lib/moduleAccess";
import { STEM_SET_3_MODULE_SLUGS } from "@/constants/stemSets";
import type { ContinueScanResult } from "@/lib/continueScan";

// ── Vocabulary ────────────────────────────────────────────────────────────

/**
 * Why a candidate is not an *alternative* the learner may be offered.
 *
 * Only reasons the product actually supports. Five of the seven are the access
 * policy's own denials, renamed into choice vocabulary; two are this layer's.
 *
 * | reason                   | source                                                     |
 * | ------------------------ | ---------------------------------------------------------- |
 * | `unregistered`           | access `unregistered` — no served catalog record           |
 * | `hidden`                 | access `hidden` — held back by `HIDDEN_MODULE_SLUGS`       |
 * | `placeholder`            | access `unregistered` **and** the slug is a declared slot  |
 * | `wrong_grade`            | access `wrong_grade`                                       |
 * | `not_context_eligible`   | access `not_specialized` — identity/context eligibility    |
 * | `locked`                 | access `locked_set` — progression, no assignment override  |
 * | `completed_or_duplicate` | this layer: already finished, or already the Continue target |
 *
 * `placeholder` is a *refinement* of `unregistered`, not a competing rule: a
 * declared-but-unbuilt set slot (`STEM_SET_3_MODULE_SLUGS` with no catalog
 * record — see the `STEM_SET_3_IDS` vs `STEM_SET_3_MODULE_SLUGS` note in
 * `moduleAccess.ts`) is refused by exactly the same access call, and is only
 * *labelled* differently so tests and telemetry can prove placeholder slots
 * were considered and refused rather than never considered at all.
 *
 * Both extra reasons are strictly narrowing: nothing the access policy refuses
 * can ever be re-admitted here.
 */
export type GuidedChoiceExclusionReason =
  | "unregistered"
  | "hidden"
  | "placeholder"
  | "wrong_grade"
  | "locked"
  | "completed_or_duplicate"
  | "not_context_eligible";

/**
 * Why a destination is available to this learner — `ModuleAccessSource`
 * unchanged, so the disclosure can honestly say *"your teacher picked this"*
 * instead of presenting assigned work as a free choice (#842: assignments are
 * never bypassed or obscured; accessibility contract §7).
 */
export type GuidedChoiceAvailability = ModuleAccessSource;

/** The slice of a catalog record guided choice reads. */
export interface GuidedChoiceModule extends ModuleAccessTarget {
  title?: string | null;
  description?: string | null;
  subtitle?: string | null;
}

/** One offerable destination. */
export interface GuidedChoiceDestination {
  moduleSlug: string;
  /** Raw catalog title. Callers localize content names at render time. */
  title: string;
  /**
   * The learning objective shown before any navigation (issue: "Show the
   * selected destination and learning objective before launching").
   *
   * Taken from existing catalog fields only — `description`, then `subtitle`.
   * No objective text is invented here; an empty string means the catalog has
   * none and the UI falls back to localized generic copy rather than to
   * fabricated content.
   */
  objective: string;
  /** 1, 2 or 3 for STEM set content; `undefined` for anything else. */
  setNumber?: 1 | 2 | 3;
  whyAvailable: GuidedChoiceAvailability;
}

/** One refused candidate, with the reason that refused it. */
export interface GuidedChoiceExclusion {
  moduleSlug: string;
  reason: GuidedChoiceExclusionReason;
}

/**
 * Where Continue goes.
 *
 * `kind: "activity"` is the canonical scan's answer — byte-for-byte the same
 * target the student dashboard uses, because it comes from the same
 * `ContinueScanResult`. `kind: "module"` is the no-progress-yet fallback (the
 * first allowed module in catalog order). `null` means there is nothing this
 * learner may open at all, and the UI shows the modules index.
 */
export type GuidedContinueTarget =
  | {
      kind: "activity";
      moduleSlug: string;
      moduleTitle: string;
      lessonId: string;
      activityId: string;
      activityTitle: string;
    }
  | { kind: "module"; moduleSlug: string; moduleTitle: string }
  | null;

export interface GuidedChoiceResult {
  /** The dominant action's destination. */
  continueTarget: GuidedContinueTarget;
  /** "Try another path": allowed, unfinished, not the Continue target. */
  eligible: GuidedChoiceDestination[];
  /** "Revisit": allowed and fully finished. Empty ⇒ the UI omits the action. */
  revisit: GuidedChoiceDestination[];
  /** Every refused candidate and why. Ordered as the candidates were. */
  excluded: GuidedChoiceExclusion[];
}

export interface ResolveGuidedChoiceInput {
  /**
   * Catalog module records exactly as the caller means to offer them —
   * including any the caller has *not* pre-filtered. Ordering is the caller's
   * (Modules.tsx sorts by its canonical `MODULE_ORDER`) and is preserved, so
   * the output is deterministic without this file owning presentation order.
   *
   * Untrusted by design: stale, duplicated, malformed and gated records are
   * expected here and are refused with a reason, never silently dropped.
   */
  modules: readonly GuidedChoiceModule[];
  /** Runtime hidden-slug state — injected, never captured at import time. */
  hiddenSlugs: ReadonlySet<string>;
  /** COMPLETED game activity IDs from the student's progress. */
  completedActivityIds: readonly string[];
  archetype: string | null;
  gradeBand: ModuleAccessGradeBand;
  /** Teacher-assigned module slugs (access policy E). */
  assignedModuleSlugs?: ReadonlySet<string> | readonly string[];
  /**
   * The canonical Continue scan (`scanForNextActivity`). `null` — the caller
   * has not scanned, or the scan was cancelled — falls back to the first
   * allowed module rather than inventing a target.
   */
  scan?: ContinueScanResult | null;
  /**
   * Declared set slots, used only to tell a `placeholder` apart from a plain
   * `unregistered`. Defaults to the Set 3 module slugs.
   */
  declaredSlotSlugs?: readonly string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Which STEM set a slug belongs to, for display only. */
function setNumberFor(slug: string): 1 | 2 | 3 | undefined {
  if (isSet3ModuleSlug(slug)) return 3;
  if (isSet2ModuleSlug(slug)) return 2;
  return undefined;
}

/**
 * The objective string, from existing catalog fields only.
 *
 * Mirrors what `Modules.tsx` already renders on a module card
 * (`description ?? subtitle`), so the disclosure shows the learner the same
 * sentence the card does rather than a second, divergent description.
 */
export function moduleObjective(module: GuidedChoiceModule): string {
  const raw =
    (typeof module.description === "string" && module.description.trim()) ||
    (typeof module.subtitle === "string" && module.subtitle.trim()) ||
    "";
  return raw;
}

function titleOf(module: GuidedChoiceModule, slug: string): string {
  return typeof module.title === "string" && module.title.trim()
    ? module.title
    : slug;
}

/** Slugs of modules the scan found to be fully finished. */
function completedSlugSet(scan: ContinueScanResult | null | undefined) {
  return new Set(
    (scan?.completedModules ?? [])
      .map((m) => m?.slug)
      .filter((s): s is string => typeof s === "string" && !!s),
  );
}

// ── The resolver ──────────────────────────────────────────────────────────

/**
 * Resolve everything the four navigation choices need.
 *
 * Two passes, because Continue has to be known before "alternative" means
 * anything: whichever module Continue leads into is not a second option, it is
 * the first one, and that is equally true of the no-progress-yet fallback.
 *
 * **Pass 1 — access.** Per candidate: the slug must be usable at all (a
 * malformed record is `unregistered`), then `resolveModuleAccess` decides.
 * Nothing in pass 2 can re-admit what pass 1 refused, so a module that was
 * finished and has since been hidden, re-locked or re-banded is refused
 * outright rather than offered as a fond replay.
 *
 * **Pass 2 — role.** Continue's module is `completed_or_duplicate`; a fully
 * finished module leaves the alternatives pool and joins `revisit`; the rest
 * are the alternatives, in the caller's order.
 */
export function resolveGuidedChoice(
  input: ResolveGuidedChoiceInput,
): GuidedChoiceResult {
  const {
    modules,
    hiddenSlugs,
    completedActivityIds,
    archetype,
    gradeBand,
    assignedModuleSlugs,
    scan,
    declaredSlotSlugs = STEM_SET_3_MODULE_SLUGS,
  } = input;

  const declaredSlots = new Set<string>(declaredSlotSlugs);
  const completedSlugs = completedSlugSet(scan);
  const scanSlug = scan?.nextOne?.moduleSlug ?? null;

  const allowed: GuidedChoiceDestination[] = [];
  const excluded: GuidedChoiceExclusion[] = [];

  // ── Pass 1: the access decision, once per unique candidate ──────────────
  const seen = new Set<string>();
  const list = Array.isArray(modules) ? modules : [];

  for (const module of list) {
    const slug =
      module && typeof module.slug === "string" ? module.slug.trim() : "";

    // A record with no usable slug names nothing the catalog can serve. It is
    // reported under the empty slug rather than dropped, so a malformed feed
    // is visible in the exclusion list instead of silently shrinking the pool.
    if (!slug) {
      excluded.push({ moduleSlug: "", reason: "unregistered" });
      continue;
    }
    // Stale feeds repeat entries; a duplicate must not become a second chance.
    if (seen.has(slug)) continue;
    seen.add(slug);

    // ── The one access decision. Nothing below re-derives any part of it. ──
    const access = resolveModuleAccess({
      slug,
      module,
      hiddenSlugs,
      completedActivityIds,
      archetype,
      gradeBand,
      assignedModuleSlugs,
    });

    if (!access.allowed) {
      excluded.push({
        moduleSlug: slug,
        reason: mapDenial(access.reason, slug, declaredSlots),
      });
      continue;
    }

    allowed.push({
      moduleSlug: slug,
      title: titleOf(module, slug),
      objective: moduleObjective(module),
      setNumber: setNumberFor(slug),
      whyAvailable: access.source,
    });
  }

  // ── Continue, then pass 2: what each surviving candidate is *for* ───────
  //
  // The fallback is the first allowed module the learner has not finished, so
  // "start playing" does not open something they already completed; if they
  // have finished everything available, the first allowed module is still a
  // better answer than dropping them on an empty index.
  const fallback =
    allowed.find((d) => !completedSlugs.has(d.moduleSlug)) ??
    allowed[0] ??
    null;
  const continueTarget = buildContinueTarget(scan, fallback);
  // Whichever module Continue actually leads into — the scan's, or the
  // fallback's — is the one the alternatives must not duplicate.
  const continueSlug = continueTarget?.moduleSlug ?? scanSlug;

  const eligible: GuidedChoiceDestination[] = [];
  const revisit: GuidedChoiceDestination[] = [];

  for (const destination of allowed) {
    const slug = destination.moduleSlug;
    if (slug === continueSlug) {
      excluded.push({ moduleSlug: slug, reason: "completed_or_duplicate" });
      continue;
    }
    if (completedSlugs.has(slug)) {
      revisit.push(destination);
      excluded.push({ moduleSlug: slug, reason: "completed_or_duplicate" });
      continue;
    }
    eligible.push(destination);
  }

  return { continueTarget, eligible, revisit, excluded };
}

/**
 * Access denial → choice vocabulary.
 *
 * Total over `ModuleAccessDenialReason`: the `switch` has no `default`, so
 * adding a denial reason in `moduleAccess.ts` fails this file's type-check
 * rather than silently mapping to something plausible.
 */
function mapDenial(
  reason:
    | "unregistered"
    | "hidden"
    | "wrong_grade"
    | "not_specialized"
    | "locked_set",
  slug: string,
  declaredSlots: ReadonlySet<string>,
): GuidedChoiceExclusionReason {
  switch (reason) {
    case "unregistered":
      return declaredSlots.has(slug) ? "placeholder" : "unregistered";
    case "hidden":
      return "hidden";
    case "wrong_grade":
      return "wrong_grade";
    case "not_specialized":
      return "not_context_eligible";
    case "locked_set":
      return "locked";
  }
}

function buildContinueTarget(
  scan: ContinueScanResult | null | undefined,
  fallback: GuidedChoiceDestination | null,
): GuidedContinueTarget {
  const next = scan?.nextOne;
  if (next && next.moduleSlug && next.lessonId && next.activityId) {
    return {
      kind: "activity",
      moduleSlug: next.moduleSlug,
      moduleTitle: next.moduleTitle,
      lessonId: next.lessonId,
      activityId: next.activityId,
      activityTitle: next.activityTitle,
    };
  }
  if (fallback) {
    return {
      kind: "module",
      moduleSlug: fallback.moduleSlug,
      moduleTitle: fallback.title,
    };
  }
  return null;
}

// ── Routing ───────────────────────────────────────────────────────────────

/** Where the modules index lives — Continue's last resort. */
export const MODULES_INDEX_PATH = "/student/modules";

/**
 * The route Continue navigates to.
 *
 * The `activity` form is character-for-character the student dashboard's
 * `goToNext()` route, so the two surfaces send a learner to the same place for
 * the same scan; `src/lib/__tests__/guidedChoice.test.ts` pins that parity.
 */
export function continueHref(target: GuidedContinueTarget): string {
  if (!target) return MODULES_INDEX_PATH;
  if (target.kind === "activity") {
    return `${MODULES_INDEX_PATH}/${target.moduleSlug}/lessons/${target.lessonId}/activities/${target.activityId}`;
  }
  return `${MODULES_INDEX_PATH}/${target.moduleSlug}`;
}

/** The route a chosen alternative / revisit destination opens. */
export function destinationHref(destination: { moduleSlug: string }): string {
  return `${MODULES_INDEX_PATH}/${destination.moduleSlug}`;
}
