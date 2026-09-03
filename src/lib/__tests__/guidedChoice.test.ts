/**
 * #842 — the guided-choice eligibility contract.
 *
 * Three properties are pinned here:
 *
 * 1. **Every access verdict comes from `resolveModuleAccess`.** The policy is
 *    wrapped in a delegating spy so the tests can prove both directions: the
 *    resolver *calls* it for every candidate, and the resolver *obeys* it even
 *    when the answer contradicts what an inline predicate would have said.
 *    Inlining any predicate here (a `HIDDEN_MODULE_SLUGS` lookup, a set-lock
 *    check, a level comparison) makes the "obeys" cases fail.
 * 2. **Every exclusion carries a structured reason** — table-driven, one row
 *    per concern, asserting the reason and not merely "absent".
 * 3. **Continue is subject to the same policy as everything else.** The scan's
 *    target is re-checked against pass 1, so an unfiltered scan cannot hand
 *    back a refused module in `excluded` *and* a live route into it.
 * 4. **Route parity is structural.** Both surfaces build Continue's route with
 *    the shared builders in `continueScan.ts`, and the cases below import
 *    those builders rather than restating the template — a local copy is a
 *    proxy that stays green while the real routes drift apart. What parity
 *    does *not* claim is that the two surfaces always pick the same target;
 *    see `ResolveGuidedChoiceInput.scan`.
 *
 * `hiddenSlugs` is injected in every case: `HIDDEN_MODULE_SLUGS` is a mutable
 * Set a release flag flips at runtime, so no test may depend on its contents.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  STEM_SET_1_IDS,
  STEM_SET_2_IDS,
  STEM_SET_2_MODULE_SLUGS,
  STEM_SET_3_MODULE_SLUGS,
} from "@/constants/stemSets";
import {
  MODULES_INDEX_PATH,
  activityHref,
  moduleHref,
  buildModuleSlugPriority,
  scanForNextActivity,
  type ContinueScanResult,
} from "@/lib/continueScan";

// ── The delegating access spy (falsification harness) ─────────────────────
//
// Real behavior by default; `force` lets a test make the policy answer
// something an inline predicate never would.
const policy = vi.hoisted(() => ({
  calls: [] as { slug: string }[],
  force: null as
    | ((slug: string) => { allowed: boolean; [k: string]: unknown } | null)
    | null,
}));

vi.mock("@/lib/moduleAccess", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/moduleAccess")>();
  return {
    ...actual,
    resolveModuleAccess: (input: { slug: string }) => {
      policy.calls.push(input);
      const forced = policy.force?.(input.slug);
      if (forced) return forced;
      return actual.resolveModuleAccess(
        input as Parameters<typeof actual.resolveModuleAccess>[0],
      );
    },
  };
});

import {
  continueHref,
  destinationHref,
  moduleObjective,
  resolveGuidedChoice,
  type GuidedChoiceExclusionReason,
  type GuidedChoiceModule,
  type ResolveGuidedChoiceInput,
} from "@/lib/guidedChoice";

beforeEach(() => {
  policy.calls = [];
  policy.force = null;
});

// ── Fixtures ──────────────────────────────────────────────────────────────

const SET1_A = "k2-stem-bounce-buds";
const SET1_B = "k2-stem-gotcha-gears";
const SET2_A = STEM_SET_2_MODULE_SLUGS[0];
const SET3_A = STEM_SET_3_MODULE_SLUGS[0];
const SET3_UNBUILT = STEM_SET_3_MODULE_SLUGS[1];
const G35 = "g35-data-dash-sort-discover";
const SPECIALIZATION = "stem-1-intro";
const GHOST = "totally-made-up-slug";

const NO_HIDDEN: ReadonlySet<string> = new Set<string>();
const SET1_COMPLETE = [...STEM_SET_1_IDS];
const SET1_AND_2_COMPLETE = [...STEM_SET_1_IDS, ...STEM_SET_2_IDS];

function mod(
  slug: string,
  extra: Partial<GuidedChoiceModule> = {},
): GuidedChoiceModule {
  return {
    slug,
    title: `${slug} title`,
    description: `${slug} objective`,
    level: "K-2",
    published: true,
    ...extra,
  };
}

function resolve(overrides: Partial<ResolveGuidedChoiceInput> = {}) {
  return resolveGuidedChoice({
    modules: [mod(SET1_A), mod(SET1_B)],
    hiddenSlugs: NO_HIDDEN,
    completedActivityIds: [],
    archetype: null,
    gradeBand: "k2",
    scan: null,
    ...overrides,
  });
}

function reasonFor(
  result: { excluded: { moduleSlug: string; reason: string }[] },
  slug: string,
): string | undefined {
  return result.excluded.find((e) => e.moduleSlug === slug)?.reason;
}

function slugs(list: { moduleSlug: string }[]): string[] {
  return list.map((d) => d.moduleSlug);
}

// ── 1. The exclusion matrix ───────────────────────────────────────────────

describe("resolveGuidedChoice — exclusion reasons", () => {
  const rows: {
    name: string;
    slug: string;
    input: Partial<ResolveGuidedChoiceInput>;
    reason: GuidedChoiceExclusionReason;
  }[] = [
    {
      name: "a slug the catalog does not serve",
      slug: GHOST,
      // The record is present in the client's list but names a different slug,
      // which is how a stale feed manufactures a ghost.
      input: { modules: [{ ...mod(GHOST), slug: GHOST, published: false }] },
      reason: "unregistered",
    },
    {
      name: "a held-back (hidden) module",
      slug: SET1_A,
      input: { modules: [mod(SET1_A)], hiddenSlugs: new Set([SET1_A]) },
      reason: "hidden",
    },
    {
      name: "a declared-but-unbuilt Set 3 slot",
      slug: SET3_UNBUILT,
      // No catalog record: exactly what a placeholder slot is in this codebase.
      input: {
        modules: [{ slug: SET3_UNBUILT, title: null, published: false }],
        completedActivityIds: SET1_AND_2_COMPLETE,
      },
      reason: "placeholder",
    },
    {
      name: "content for a band this learner is not in",
      slug: G35,
      input: { modules: [mod(G35, { level: "3-5" })], gradeBand: "k2" },
      reason: "wrong_grade",
    },
    {
      name: "a specialization module before a specialization is chosen",
      slug: SPECIALIZATION,
      input: { modules: [mod(SPECIALIZATION)], archetype: null },
      reason: "not_context_eligible",
    },
    {
      name: "a Set 2 module before Set 1 is finished",
      slug: SET2_A,
      input: { modules: [mod(SET2_A)], completedActivityIds: [] },
      reason: "locked",
    },
    {
      name: "a Set 3 module before Set 2 is finished",
      slug: SET3_A,
      input: { modules: [mod(SET3_A)], completedActivityIds: SET1_COMPLETE },
      reason: "locked",
    },
  ];

  it.each(rows)("excludes $name as $reason", ({ slug, input, reason }) => {
    const result = resolve(input);
    expect(slugs(result.eligible)).not.toContain(slug);
    expect(slugs(result.revisit)).not.toContain(slug);
    expect(reasonFor(result, slug)).toBe(reason);
  });

  it("excludes the module Continue already points at, as a duplicate", () => {
    const result = resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(slugs(result.eligible)).toEqual([SET1_B]);
    expect(reasonFor(result, SET1_A)).toBe("completed_or_duplicate");
  });

  it("excludes a finished module from alternatives and offers it as revisit", () => {
    const result = resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      scan: scanResult({
        moduleSlug: SET1_B,
        completedModules: [{ slug: SET1_A, title: "done" }],
      }),
    });
    expect(slugs(result.eligible)).toEqual([]);
    expect(slugs(result.revisit)).toEqual([SET1_A]);
    expect(reasonFor(result, SET1_A)).toBe("completed_or_duplicate");
  });

  it("never offers a finished module that has since been held back", () => {
    // Access denial outranks completion: revisit is not a back door.
    const result = resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      hiddenSlugs: new Set([SET1_A]),
      scan: scanResult({
        moduleSlug: SET1_B,
        completedModules: [{ slug: SET1_A, title: "done" }],
      }),
    });
    expect(slugs(result.revisit)).toEqual([]);
    expect(reasonFor(result, SET1_A)).toBe("hidden");
  });

  it("never offers a finished module that has since been re-locked", () => {
    const result = resolve({
      modules: [mod(SET1_A), mod(SET2_A)],
      completedActivityIds: [], // Set 1 not complete → Set 2 locked again
      scan: scanResult({
        moduleSlug: SET1_A,
        completedModules: [{ slug: SET2_A, title: "done" }],
      }),
    });
    expect(slugs(result.revisit)).toEqual([]);
    expect(reasonFor(result, SET2_A)).toBe("locked");
  });
});

// ── 2. Stale / malformed client data ──────────────────────────────────────

describe("resolveGuidedChoice — stale and malformed client data", () => {
  it("cannot surface a gated Set 3 slug that a stale catalog still lists", () => {
    const result = resolve({
      modules: [mod(SET1_A), mod(SET3_A)],
      hiddenSlugs: new Set([SET3_A]),
      completedActivityIds: SET1_AND_2_COMPLETE, // set unlocked, still hidden
    });
    expect(slugs(result.eligible)).not.toContain(SET3_A);
    expect(reasonFor(result, SET3_A)).toBe("hidden");
  });

  it("cannot be unlocked by duplicated progress rows", () => {
    // Five copies of ONE finished Set 1 game must not read as five games.
    const padded = Array.from({ length: 5 }, () => STEM_SET_1_IDS[0]);
    const result = resolve({
      modules: [mod(SET2_A)],
      completedActivityIds: padded,
    });
    expect(reasonFor(result, SET2_A)).toBe("locked");
  });

  it("ignores junk progress rows entirely", () => {
    const junk = [
      "not-a-game",
      "",
      // Deliberately wrong types, as a hand-edited client payload would be.
      null as unknown as string,
      42 as unknown as string,
      { activityId: "bounce-buds" } as unknown as string,
    ];
    const result = resolve({
      modules: [mod(SET2_A)],
      completedActivityIds: junk,
    });
    expect(reasonFor(result, SET2_A)).toBe("locked");
  });

  it("treats a record with no usable slug as unregistered, without throwing", () => {
    const result = resolve({
      modules: [
        { slug: null, title: "no slug" },
        { slug: "   ", title: "blank slug" } as GuidedChoiceModule,
        mod(SET1_A),
      ],
    });
    expect(slugs(result.eligible)).toEqual([]); // SET1_A becomes Continue
    expect(result.excluded.filter((e) => e.moduleSlug === "")).toHaveLength(2);
    expect(
      result.excluded.every(
        (e) => e.moduleSlug !== "" || e.reason === "unregistered",
      ),
    ).toBe(true);
  });

  it("collapses duplicate catalog entries — a repeat is not a second chance", () => {
    const result = resolve({
      modules: [mod(SET1_A), mod(SET1_A), mod(SET1_B), mod(SET1_B)],
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(slugs(result.eligible)).toEqual([SET1_B]);
    expect(policy.calls.map((c) => c.slug)).toEqual([SET1_A, SET1_B]);
  });

  it("is inert for an unmapped slug with an unrecognized level", () => {
    // A future/typo'd level is unrestricted by documented policy (the accepted
    // hole in moduleAccess.isGradeEligible); it must still be a normal,
    // reasoned destination rather than a crash or a silent drop.
    const result = resolve({
      modules: [mod(SET1_A), mod("some-new-thing", { level: "Grade 12" })],
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(slugs(result.eligible)).toEqual(["some-new-thing"]);
    expect(result.eligible[0].setNumber).toBeUndefined();
  });
});

// ── 3. Grade bands and assignments ────────────────────────────────────────

describe("resolveGuidedChoice — bands and teacher assignments", () => {
  it("offers K-2 content to both bands (banding is intra-activity)", () => {
    for (const gradeBand of ["k2", "g3_5"] as const) {
      const result = resolve({
        modules: [mod(SET1_A), mod(SET1_B)],
        gradeBand,
        scan: scanResult({ moduleSlug: SET1_A }),
      });
      expect(slugs(result.eligible)).toEqual([SET1_B]);
    }
  });

  it("offers G3-5 content only to a g3_5 learner", () => {
    const modules = [mod(SET1_A), mod(G35, { level: "3-5" })];
    const forK2 = resolve({
      modules,
      gradeBand: "k2",
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(slugs(forK2.eligible)).toEqual([]);
    expect(reasonFor(forK2, G35)).toBe("wrong_grade");

    const for35 = resolve({
      modules,
      gradeBand: "g3_5",
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(slugs(for35.eligible)).toEqual([G35]);
  });

  it("offers a specialization module once an archetype is chosen", () => {
    const result = resolve({
      modules: [mod(SET1_A), mod(SPECIALIZATION)],
      archetype: "quantum",
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(slugs(result.eligible)).toEqual([SPECIALIZATION]);
  });

  it("makes an assigned locked module eligible, marked as the teacher's pick", () => {
    // Policy E, unchanged: the assignment lifts the set lock for its target.
    const result = resolve({
      modules: [mod(SET1_A), mod(SET2_A)],
      completedActivityIds: [], // Set 2 would otherwise be locked
      assignedModuleSlugs: [SET2_A],
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(slugs(result.eligible)).toEqual([SET2_A]);
    expect(result.eligible[0].whyAvailable).toBe("teacher_assignment");
  });

  it("marks progression-earned destinations as such, not as assignments", () => {
    const result = resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      assignedModuleSlugs: [SET2_A],
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(result.eligible[0].whyAvailable).toBe("progression");
  });

  it("attributes an assignment to an ALREADY-UNLOCKED module to the teacher", () => {
    // The commoner case by far, and the one that used to be invisible: the
    // access policy's `source` only says `teacher_assignment` when the
    // assignment lifted a set lock, so an assigned Set 1 module arrived as
    // plain `progression` and was shown to the child as a free choice they
    // earned. On the only surface that attributes assignments at all, that is
    // the assignment being reordered away.
    const result = resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      completedActivityIds: [],
      assignedModuleSlugs: [SET1_B], // Set 1 — no lock for it to override
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(result.eligible).toHaveLength(1);
    expect(result.eligible[0]).toMatchObject({
      moduleSlug: SET1_B,
      whyAvailable: "teacher_assignment",
    });
  });

  it("attributes assigned work in the revisit pool too", () => {
    const result = resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      assignedModuleSlugs: [SET1_B],
      scan: scanResult({
        moduleSlug: SET1_A,
        completedModules: [{ slug: SET1_B, title: "b" }],
      }),
    });
    expect(result.revisit[0]).toMatchObject({
      moduleSlug: SET1_B,
      whyAvailable: "teacher_assignment",
    });
  });

  it("accepts the assignment list as a Set or an array, identically", () => {
    const asArray = resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      assignedModuleSlugs: [SET1_B],
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    const asSet = resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      assignedModuleSlugs: new Set([SET1_B]),
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(asArray.eligible).toEqual(asSet.eligible);
    expect(asSet.eligible[0].whyAvailable).toBe("teacher_assignment");
  });

  it("does not attribute an assignment the access policy refused", () => {
    // Attribution is display, never a re-admission: a hidden assigned module
    // is still refused, and never appears with a teacher's name on it.
    const result = resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      hiddenSlugs: new Set([SET1_B]),
      assignedModuleSlugs: [SET1_B],
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(slugs(result.eligible)).toEqual([]);
    expect(slugs(result.revisit)).toEqual([]);
    expect(reasonFor(result, SET1_B)).toBe("hidden");
  });

  it("does not let an assignment override hidden, wrong-grade or ghost targets", () => {
    const result = resolve({
      modules: [
        mod(SET1_A),
        mod(SET1_B),
        mod(G35, { level: "3-5" }),
        { ...mod(GHOST), published: false },
      ],
      hiddenSlugs: new Set([SET1_B]),
      gradeBand: "k2",
      assignedModuleSlugs: [SET1_B, G35, GHOST],
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(slugs(result.eligible)).toEqual([]);
    expect(reasonFor(result, SET1_B)).toBe("hidden");
    expect(reasonFor(result, G35)).toBe("wrong_grade");
    expect(reasonFor(result, GHOST)).toBe("unregistered");
  });
});

// ── 4. Falsification: the resolver has no access opinions of its own ──────

describe("resolveGuidedChoice — routes every access decision through the policy", () => {
  it("asks the policy exactly once per unique candidate, with the injected inputs", () => {
    const hiddenSlugs = new Set([SET1_B]);
    resolve({
      modules: [mod(SET1_A), mod(SET1_B), mod(SET2_A)],
      hiddenSlugs,
      completedActivityIds: SET1_COMPLETE,
      archetype: "quantum",
      gradeBand: "g3_5",
      assignedModuleSlugs: [SET2_A],
    });
    expect(policy.calls.map((c) => c.slug)).toEqual([SET1_A, SET1_B, SET2_A]);
    for (const call of policy.calls as unknown as Record<string, unknown>[]) {
      expect(call.hiddenSlugs).toBe(hiddenSlugs);
      expect(call.completedActivityIds).toEqual(SET1_COMPLETE);
      expect(call.archetype).toBe("quantum");
      expect(call.gradeBand).toBe("g3_5");
    }
  });

  it("offers a hidden slug when the policy says allowed (no inline hidden check)", () => {
    // Falsification. If this file re-derived visibility itself, SET1_B would
    // still be filtered out here and this assertion would fail.
    policy.force = (slug) =>
      slug === SET1_B ? { allowed: true, source: "progression" } : null;
    const result = resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      hiddenSlugs: new Set([SET1_B]),
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(slugs(result.eligible)).toEqual([SET1_B]);
  });

  it("offers a locked Set 2 slug when the policy says allowed (no inline lock check)", () => {
    policy.force = (slug) =>
      slug === SET2_A ? { allowed: true, source: "progression" } : null;
    const result = resolve({
      modules: [mod(SET1_A), mod(SET2_A)],
      completedActivityIds: [],
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(slugs(result.eligible)).toEqual([SET2_A]);
  });

  it("refuses an ordinary Set 1 slug when the policy denies it", () => {
    policy.force = (slug) =>
      slug === SET1_B ? { allowed: false, reason: "locked_set" } : null;
    const result = resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(slugs(result.eligible)).toEqual([]);
    expect(reasonFor(result, SET1_B)).toBe("locked");
  });
});

// ── 5. Continue ───────────────────────────────────────────────────────────

function scanResult(opts: {
  moduleSlug?: string;
  lessonId?: string;
  activityId?: string;
  completedModules?: { slug: string; title: string }[];
}): ContinueScanResult {
  return {
    nextOne: opts.moduleSlug
      ? {
          moduleSlug: opts.moduleSlug,
          moduleTitle: `${opts.moduleSlug} title`,
          unitId: "u1",
          unitTitle: "Unit 1",
          lessonId: opts.lessonId ?? "l1",
          lessonTitle: "Lesson 1",
          activityId: opts.activityId ?? "a1",
          activityTitle: "Activity 1",
          kind: "INTERACT",
          orderKey: "1.1.1",
        }
      : null,
    upNext: [],
    completedModules: opts.completedModules ?? [],
  };
}

describe("resolveGuidedChoice — Continue", () => {
  it("uses the scan's target verbatim", () => {
    const result = resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      scan: scanResult({
        moduleSlug: SET1_B,
        lessonId: "lesson-9",
        activityId: "act-9",
      }),
    });
    expect(result.continueTarget).toMatchObject({
      kind: "activity",
      moduleSlug: SET1_B,
      lessonId: "lesson-9",
      activityId: "act-9",
    });
  });

  it("falls back to the first allowed module in catalog order with no progress", () => {
    const result = resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      scan: scanResult({}),
    });
    expect(result.continueTarget).toEqual({
      kind: "module",
      moduleSlug: SET1_A,
      moduleTitle: `${SET1_A} title`,
      isReplay: false,
    });
    // …and the module Continue leads into is not also offered as an alternative.
    expect(slugs(result.eligible)).toEqual([SET1_B]);
    expect(reasonFor(result, SET1_A)).toBe("completed_or_duplicate");
  });

  it("skips a refused module when picking the fallback", () => {
    const result = resolve({
      modules: [mod(SET2_A), mod(SET1_A)],
      completedActivityIds: [], // Set 2 locked → cannot be the fallback
      scan: null,
    });
    expect(result.continueTarget).toMatchObject({
      kind: "module",
      moduleSlug: SET1_A,
    });
  });

  it("prefers an unfinished module for the fallback", () => {
    const result = resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      scan: scanResult({ completedModules: [{ slug: SET1_A, title: "done" }] }),
    });
    expect(result.continueTarget).toMatchObject({ moduleSlug: SET1_B });
    expect(slugs(result.revisit)).toEqual([SET1_A]);
  });

  it("is null when nothing is available at all", () => {
    const result = resolve({ modules: [], scan: null });
    expect(result.continueTarget).toBeNull();
    expect(continueHref(result.continueTarget)).toBe("/student/modules");
    expect(result.eligible).toEqual([]);
    expect(result.revisit).toEqual([]);
  });

  it("builds the destination route for an alternative", () => {
    expect(destinationHref({ moduleSlug: SET1_B })).toBe(
      `/student/modules/${SET1_B}`,
    );
  });
});

// ── 5b. Continue obeys the access policy too ──────────────────────────────

describe("Continue is subject to the same policy as everything else", () => {
  // Continue is the one destination a learner is most likely to press, and
  // until this was fixed it was the one destination that never went through
  // `resolveModuleAccess`: the scan's answer was carried through verbatim. A
  // caller handing in an unfiltered scan got the refused module reported in
  // `excluded` AND a live route into that same module.
  const refusals: {
    name: string;
    slug: string;
    input: Partial<ResolveGuidedChoiceInput>;
    reason: GuidedChoiceExclusionReason;
  }[] = [
    {
      name: "a held-back module",
      slug: SET1_B,
      input: {
        modules: [mod(SET1_A), mod(SET1_B)],
        hiddenSlugs: new Set([SET1_B]),
      },
      reason: "hidden",
    },
    {
      name: "content for another band",
      slug: G35,
      input: {
        modules: [mod(SET1_A), mod(G35, { level: "3-5" })],
        gradeBand: "k2",
      },
      reason: "wrong_grade",
    },
    {
      name: "a locked Set 2 module",
      slug: SET2_A,
      input: { modules: [mod(SET1_A), mod(SET2_A)], completedActivityIds: [] },
      reason: "locked",
    },
  ];

  it.each(refusals)(
    "never routes Continue into $name, even when the scan names it",
    ({ slug, input, reason }) => {
      const result = resolve({
        ...input,
        // An UNFILTERED scan — the scan is expected to apply the same policy,
        // but the resolver may not assume it did.
        scan: scanResult({ moduleSlug: slug }),
      });
      expect(result.continueTarget?.moduleSlug).not.toBe(slug);
      expect(continueHref(result.continueTarget)).not.toContain(slug);
      // …and it is still reported as refused, with its own reason.
      expect(reasonFor(result, slug)).toBe(reason);
      // …and Continue falls to the module fallback rather than to nothing.
      expect(result.continueTarget).toMatchObject({
        kind: "module",
        moduleSlug: SET1_A,
      });
    },
  );

  it("never routes Continue into a module the catalog does not serve", () => {
    const result = resolve({
      modules: [mod(SET1_A)],
      scan: scanResult({ moduleSlug: GHOST }),
    });
    expect(result.continueTarget?.moduleSlug).not.toBe(GHOST);
    expect(continueHref(result.continueTarget)).not.toContain(GHOST);
    expect(result.continueTarget).toMatchObject({ moduleSlug: SET1_A });
  });

  it("routes Continue nowhere at all when nothing survives pass 1", () => {
    const result = resolve({
      modules: [mod(SET1_B)],
      hiddenSlugs: new Set([SET1_B]),
      scan: scanResult({ moduleSlug: SET1_B }),
    });
    expect(result.continueTarget).toBeNull();
    expect(continueHref(result.continueTarget)).toBe(MODULES_INDEX_PATH);
  });

  it("still uses the scan's target when the policy allows it", () => {
    // The guard narrows nothing it should not: a permitted scan target is
    // still carried through verbatim.
    const result = resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      scan: scanResult({
        moduleSlug: SET1_B,
        lessonId: "l7",
        activityId: "a7",
      }),
    });
    expect(result.continueTarget).toMatchObject({
      kind: "activity",
      moduleSlug: SET1_B,
      lessonId: "l7",
      activityId: "a7",
    });
  });
});

// ── 5c. Everything finished ───────────────────────────────────────────────

describe("when the learner has finished everything available", () => {
  function allDone() {
    return resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      scan: scanResult({
        completedModules: [
          { slug: SET1_A, title: "a" },
          { slug: SET1_B, title: "b" },
        ],
      }),
    });
  }

  it("marks Continue as a replay rather than calling it a fresh start", () => {
    expect(allDone().continueTarget).toEqual({
      kind: "module",
      moduleSlug: SET1_A,
      moduleTitle: `${SET1_A} title`,
      isReplay: true,
    });
  });

  it("still lists every finished module under Revisit, Continue's included", () => {
    // The module Continue offers to replay is a finished module like any
    // other; dropping it from Revisit as a "duplicate" would hide it from the
    // only list that admits finished work exists.
    const result = allDone();
    expect(slugs(result.revisit)).toEqual([SET1_A, SET1_B]);
    expect(result.eligible).toEqual([]);
  });

  it("does not mark an unfinished Continue target as a replay", () => {
    const result = resolve({
      modules: [mod(SET1_A), mod(SET1_B)],
      scan: scanResult({ completedModules: [{ slug: SET1_A, title: "a" }] }),
    });
    expect(result.continueTarget).toMatchObject({
      moduleSlug: SET1_B,
      isReplay: false,
    });
    expect(slugs(result.revisit)).toEqual([SET1_A]);
  });
});

// ── 6. Continue parity with the student dashboard ─────────────────────────

describe("Continue parity — Modules page vs student dashboard", () => {
  function moduleFixture(slug: string, activityIds: string[]) {
    return {
      slug,
      title: `${slug} title`,
      units: [
        {
          id: `${slug}-u1`,
          title: "Unit 1",
          order: 1,
          lessons: [
            {
              id: `${slug}-l1`,
              title: "Lesson 1",
              order: 1,
              activities: activityIds.map((id, i) => ({
                id,
                title: `${id} title`,
                kind: "INTERACT",
                order: i + 1,
              })),
            },
          ],
        },
      ],
    };
  }

  const CATALOG: Record<string, unknown> = {
    [SET1_A]: moduleFixture(SET1_A, ["bounce-buds", "bb-2"]),
    [SET1_B]: moduleFixture(SET1_B, ["gotcha-gears"]),
    [SET2_A]: moduleFixture(SET2_A, ["maze-maps"]),
  };

  /**
   * The route the student dashboard actually navigates to, built the way
   * `StudentDashboard.goToNext()` builds it — by calling the **real shared
   * builders**, not by restating the template here.
   *
   * That distinction is the whole point. An earlier version of this helper
   * held a private copy of the template, which meant the dashboard's real
   * route could be rewritten and this suite stayed green: it was comparing
   * `continueHref` against the test's own idea of the dashboard rather than
   * against the dashboard. Mutating `activityHref` or `MODULES_INDEX_PATH` now
   * fails cases on both surfaces at once.
   */
  function dashboardHref(scan: ContinueScanResult): string {
    const n = scan.nextOne;
    if (!n) return MODULES_INDEX_PATH;
    return activityHref(n);
  }

  it("builds Continue's route with the same builder the dashboard calls", () => {
    // The structural claim, stated directly: no literal on either side.
    const target = {
      kind: "activity" as const,
      moduleSlug: SET1_A,
      moduleTitle: "t",
      lessonId: "l9",
      activityId: "a9",
      activityTitle: "a",
      isReplay: false,
    };
    expect(continueHref(target)).toBe(activityHref(target));
    expect(continueHref(null)).toBe(MODULES_INDEX_PATH);
    expect(destinationHref({ moduleSlug: SET1_B })).toBe(moduleHref(SET1_B));
  });

  async function runScan(
    progress: { moduleSlug: string; activityId: string; status: string }[],
    completedActivityIds: string[],
  ) {
    const catalogList = [mod(SET1_A), mod(SET1_B), mod(SET2_A)];
    const slugPriority = buildModuleSlugPriority(
      catalogList.map((m) => ({ slug: m.slug as string })),
      progress,
    );
    const isAllowed = (slug: string) =>
      resolveGuidedChoice({
        modules: catalogList.filter((m) => m.slug === slug),
        hiddenSlugs: NO_HIDDEN,
        completedActivityIds,
        archetype: null,
        gradeBand: "k2",
        scan: null,
      }).continueTarget !== null;

    const scan = await scanForNextActivity({
      slugPriority,
      progress,
      loadModule: async (slug) => {
        const found = CATALOG[slug];
        if (!found) throw new Error(`no module ${slug}`);
        return found;
      },
      isAllowed,
    });
    return {
      scan: scan as ContinueScanResult,
      catalogList,
      completedActivityIds,
    };
  }

  it("sends the learner to the same activity the dashboard would", async () => {
    const progress = [
      {
        moduleSlug: SET1_A,
        activityId: "bounce-buds",
        status: "COMPLETED",
        updatedAt: new Date().toISOString(),
      },
    ];
    const { scan, catalogList, completedActivityIds } = await runScan(
      progress,
      ["bounce-buds"],
    );

    const guided = resolveGuidedChoice({
      modules: catalogList,
      hiddenSlugs: NO_HIDDEN,
      completedActivityIds,
      archetype: null,
      gradeBand: "k2",
      scan,
    });

    expect(scan.nextOne).not.toBeNull();
    expect(continueHref(guided.continueTarget)).toBe(dashboardHref(scan));
    expect(continueHref(guided.continueTarget)).toBe(
      `/student/modules/${SET1_A}/lessons/${SET1_A}-l1/activities/bb-2`,
    );
  });

  it("agrees with the dashboard when a locked module sits earlier in priority", async () => {
    // Regression pin against the foundation's continueScan tests: the access
    // policy skips the locked module and Continue lands on the same allowed
    // one both surfaces would pick.
    const { scan, catalogList, completedActivityIds } = await runScan([], []);
    const guided = resolveGuidedChoice({
      modules: catalogList,
      hiddenSlugs: NO_HIDDEN,
      completedActivityIds,
      archetype: null,
      gradeBand: "k2",
      scan,
    });
    expect(continueHref(guided.continueTarget)).toBe(dashboardHref(scan));
    expect(guided.continueTarget).toMatchObject({ moduleSlug: SET1_A });
    // The locked Set 2 module is never an alternative either.
    expect(slugs(guided.eligible)).toEqual([SET1_B]);
    expect(reasonFor(guided, SET2_A)).toBe("locked");
  });

  it("is unchanged when everything is allowed", async () => {
    const { scan, catalogList } = await runScan([], SET1_AND_2_COMPLETE);
    const guided = resolveGuidedChoice({
      modules: catalogList,
      hiddenSlugs: NO_HIDDEN,
      completedActivityIds: SET1_AND_2_COMPLETE,
      archetype: null,
      gradeBand: "k2",
      scan,
    });
    expect(continueHref(guided.continueTarget)).toBe(dashboardHref(scan));
    expect(guided.continueTarget).toMatchObject({ kind: "activity" });
  });
});

// ── 7. Destination content ────────────────────────────────────────────────

describe("destination content comes from the catalog, never invented", () => {
  it("uses description, then subtitle, then empty", () => {
    expect(moduleObjective(mod("x", { description: "Ride and rhyme" }))).toBe(
      "Ride and rhyme",
    );
    expect(
      moduleObjective({ slug: "x", description: null, subtitle: "Fallback" }),
    ).toBe("Fallback");
    expect(moduleObjective({ slug: "x" })).toBe("");
    expect(moduleObjective({ slug: "x", description: "   " })).toBe("");
  });

  it("carries title, objective, set number and availability on each destination", () => {
    const result = resolve({
      modules: [
        mod(SET1_A),
        mod(SET2_A, { title: "Maze Maps", description: "Plan the best path" }),
      ],
      completedActivityIds: SET1_COMPLETE,
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(result.eligible).toEqual([
      {
        moduleSlug: SET2_A,
        title: "Maze Maps",
        objective: "Plan the best path",
        setNumber: 2,
        whyAvailable: "progression",
      },
    ]);
  });

  it("falls back to the slug when the catalog title is unusable", () => {
    const result = resolve({
      modules: [mod(SET1_A), mod(SET1_B, { title: null })],
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(result.eligible[0].title).toBe(SET1_B);
  });

  it("preserves the caller's ordering, so the output is deterministic", () => {
    const forward = resolve({
      modules: [mod(SET1_A), mod(SET1_B), mod("z-extra")],
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    const reversed = resolve({
      modules: [mod(SET1_A), mod("z-extra"), mod(SET1_B)],
      scan: scanResult({ moduleSlug: SET1_A }),
    });
    expect(slugs(forward.eligible)).toEqual([SET1_B, "z-extra"]);
    expect(slugs(reversed.eligible)).toEqual(["z-extra", SET1_B]);
  });
});
