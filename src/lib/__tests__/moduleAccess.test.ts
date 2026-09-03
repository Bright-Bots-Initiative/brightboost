/**
 * #856 — the module access matrix.
 *
 * Table-driven and discriminating: every row names the concern it exercises
 * (registration, visibility, grade eligibility, specialization, progression,
 * teacher assignment) and asserts the *reason*, not just "denied".
 *
 * `hiddenSlugs` is injected everywhere: `HIDDEN_MODULE_SLUGS` is a mutable Set
 * a release flag flips at runtime, so no test may depend on its contents.
 */
import { describe, it, expect } from "vitest";
import {
  MODULE_UNAVAILABLE_REASON_KEYS,
  canTeacherAssignModule,
  isGradeEligible,
  isHiddenTarget,
  isProgressionGatedSlug,
  resolveModuleAccess,
  type ModuleAccessGradeBand,
  type ModuleAccessResult,
  type ResolveModuleAccessInput,
} from "@/lib/moduleAccess";
import {
  STEM_SET_1_IDS,
  STEM_SET_2_IDS,
  STEM_SET_2_MODULE_SLUGS,
  STEM_SET_3_MODULE_SLUGS,
} from "@/constants/stemSets";

const SET1_MODULE = "k2-stem-bounce-buds";
const SET2_MODULE = STEM_SET_2_MODULE_SLUGS[0];
const SET3_MODULE = STEM_SET_3_MODULE_SLUGS[0];
const G35_MODULE = "g35-data-dash-sort-discover";
const SPECIALIZATION_MODULE = "stem-1-intro";

const NO_HIDDEN: ReadonlySet<string> = new Set<string>();
const SET1_COMPLETE = [...STEM_SET_1_IDS];
const SET1_AND_2_COMPLETE = [...STEM_SET_1_IDS, ...STEM_SET_2_IDS];

function mod(slug: string, level: string | null = "K-2") {
  return { slug, level, published: true };
}

function resolve(
  overrides: Partial<ResolveModuleAccessInput> & { slug: string },
): ModuleAccessResult {
  return resolveModuleAccess({
    module: mod(overrides.slug),
    hiddenSlugs: NO_HIDDEN,
    completedActivityIds: [],
    archetype: null,
    gradeBand: "k2",
    ...overrides,
  });
}

type Row = {
  name: string;
  input: Partial<ResolveModuleAccessInput> & { slug: string };
  expected: ModuleAccessResult;
};

const MATRIX: Row[] = [
  // ── A: registration ────────────────────────────────────────────────────
  {
    name: "registered + unlocked + correct grade is allowed by progression",
    input: { slug: SET1_MODULE },
    expected: { allowed: true, source: "progression" },
  },
  {
    name: "unregistered slug (no catalog record) is denied",
    input: { slug: "no-such-module", module: null },
    expected: { allowed: false, reason: "unregistered" },
  },
  {
    name: "a Set 3 placeholder slot has no module record, so it is unregistered",
    input: { slug: "k2-stem-set3-slot-2", module: null },
    expected: { allowed: false, reason: "unregistered" },
  },
  {
    name: "a record for a different slug is not a registration",
    input: { slug: SET1_MODULE, module: mod("some-other-module") },
    expected: { allowed: false, reason: "unregistered" },
  },
  {
    name: "an unpublished record is not served",
    input: {
      slug: SET1_MODULE,
      module: { slug: SET1_MODULE, level: "K-2", published: false },
    },
    expected: { allowed: false, reason: "unregistered" },
  },

  // ── B: visibility ──────────────────────────────────────────────────────
  {
    name: "a hidden slug is denied",
    input: { slug: SET1_MODULE, hiddenSlugs: new Set([SET1_MODULE]) },
    expected: { allowed: false, reason: "hidden" },
  },

  // ── C: grade eligibility ───────────────────────────────────────────────
  {
    name: "k2 student is denied G3-5 content",
    input: {
      slug: G35_MODULE,
      module: mod(G35_MODULE, "G3-5"),
      gradeBand: "k2",
    },
    expected: { allowed: false, reason: "wrong_grade" },
  },
  {
    name: "g3_5 student may play G3-5 content",
    input: {
      slug: G35_MODULE,
      module: mod(G35_MODULE, "G3-5"),
      gradeBand: "g3_5",
    },
    expected: { allowed: true, source: "progression" },
  },
  {
    name: "g3_5 student may play K-2 content (banding is intra-activity)",
    input: { slug: SET1_MODULE, gradeBand: "g3_5" },
    expected: { allowed: true, source: "progression" },
  },
  {
    name: "an unrecognized level carries no grade restriction",
    input: { slug: "e2e-quiz-module", module: mod("e2e-quiz-module", null) },
    expected: { allowed: true, source: "progression" },
  },

  // ── C': specialization ─────────────────────────────────────────────────
  {
    name: "a specialization module without an archetype is denied",
    input: { slug: SPECIALIZATION_MODULE, archetype: null },
    expected: { allowed: false, reason: "not_specialized" },
  },
  {
    name: "a specialization module with an archetype is allowed",
    input: { slug: SPECIALIZATION_MODULE, archetype: "quantum" },
    expected: { allowed: true, source: "progression" },
  },

  // ── D: progression ─────────────────────────────────────────────────────
  {
    name: "Set 2 is locked until Set 1 is complete",
    input: { slug: SET2_MODULE, completedActivityIds: [] },
    expected: { allowed: false, reason: "locked_set" },
  },
  {
    name: "Set 2 opens once Set 1 is complete",
    input: { slug: SET2_MODULE, completedActivityIds: SET1_COMPLETE },
    expected: { allowed: true, source: "progression" },
  },
  {
    name: "Set 3 is locked while Set 2 is unfinished",
    input: { slug: SET3_MODULE, completedActivityIds: SET1_COMPLETE },
    expected: { allowed: false, reason: "locked_set" },
  },
  {
    name: "Set 3 opens once Set 2 is complete",
    input: { slug: SET3_MODULE, completedActivityIds: SET1_AND_2_COMPLETE },
    expected: { allowed: true, source: "progression" },
  },
  {
    name: "stale client progress full of unknown IDs cannot manufacture an unlock",
    input: {
      slug: SET2_MODULE,
      completedActivityIds: [
        "not-a-game",
        "bounce-buds-v2",
        "",
        "quantum-quest ",
        "totally-made-up",
      ],
    },
    expected: { allowed: false, reason: "locked_set" },
  },
  {
    name: "a repeated completion cannot stand in for five different games",
    input: {
      slug: SET2_MODULE,
      completedActivityIds: [
        "bounce-buds",
        "bounce-buds",
        "bounce-buds",
        "bounce-buds",
        "bounce-buds",
        "bounce-buds",
      ],
    },
    expected: { allowed: false, reason: "locked_set" },
  },

  // ── E: teacher assignment ──────────────────────────────────────────────
  {
    name: "a teacher assignment overrides the set lock for its target",
    input: {
      slug: SET2_MODULE,
      completedActivityIds: [],
      assignedModuleSlugs: [SET2_MODULE],
    },
    expected: { allowed: true, source: "teacher_assignment" },
  },
  {
    name: "an assignment to another module does not unlock this one",
    input: {
      slug: SET2_MODULE,
      completedActivityIds: [],
      assignedModuleSlugs: [STEM_SET_2_MODULE_SLUGS[1]],
    },
    expected: { allowed: false, reason: "locked_set" },
  },
  {
    name: "an assignment never overrides visibility",
    input: {
      slug: SET2_MODULE,
      hiddenSlugs: new Set([SET2_MODULE]),
      assignedModuleSlugs: [SET2_MODULE],
    },
    expected: { allowed: false, reason: "hidden" },
  },
  {
    name: "an assignment never overrides grade eligibility",
    input: {
      slug: G35_MODULE,
      module: mod(G35_MODULE, "G3-5"),
      gradeBand: "k2",
      assignedModuleSlugs: [G35_MODULE],
    },
    expected: { allowed: false, reason: "wrong_grade" },
  },
  {
    name: "an assignment never overrides registration",
    input: {
      slug: "no-such-module",
      module: null,
      assignedModuleSlugs: ["no-such-module"],
    },
    expected: { allowed: false, reason: "unregistered" },
  },
  {
    name: "an assignment never overrides the specialization gate",
    input: {
      slug: SPECIALIZATION_MODULE,
      archetype: null,
      assignedModuleSlugs: [SPECIALIZATION_MODULE],
    },
    expected: { allowed: false, reason: "not_specialized" },
  },

  // ── Precedence ─────────────────────────────────────────────────────────
  {
    name: "hidden outranks a set lock",
    input: {
      slug: SET2_MODULE,
      hiddenSlugs: new Set([SET2_MODULE]),
      completedActivityIds: [],
    },
    expected: { allowed: false, reason: "hidden" },
  },
  {
    name: "unregistered outranks hidden",
    input: {
      slug: SET2_MODULE,
      module: null,
      hiddenSlugs: new Set([SET2_MODULE]),
    },
    expected: { allowed: false, reason: "unregistered" },
  },
  {
    name: "wrong grade outranks a set lock",
    input: {
      slug: SET2_MODULE,
      module: mod(SET2_MODULE, "G3-5"),
      gradeBand: "k2",
      completedActivityIds: [],
    },
    expected: { allowed: false, reason: "wrong_grade" },
  },
];

describe("resolveModuleAccess — access matrix (#856)", () => {
  it.each(MATRIX)("$name", ({ input, expected }) => {
    expect(resolve(input)).toEqual(expected);
  });
});

describe("grade eligibility normalization", () => {
  const bands: ModuleAccessGradeBand[] = ["k2", "g3_5"];

  it.each(["K-2", "k-2", "K2", " K-2 "])(
    "level %s is open to every band",
    (level) => {
      for (const band of bands) {
        expect(isGradeEligible(level, band)).toBe(true);
      }
    },
  );

  it.each(["G3-5", "g3-5", "3-5", "G3_5"])(
    "level %s requires the g3_5 band",
    (level) => {
      expect(isGradeEligible(level, "k2")).toBe(false);
      expect(isGradeEligible(level, "g3_5")).toBe(true);
    },
  );

  it.each([null, undefined, "", "Explorer", "6-8"])(
    "unrecognized level %s carries no restriction",
    (level) => {
      for (const band of bands) {
        expect(isGradeEligible(level, band)).toBe(true);
      }
    },
  );
});

describe("cheap pre-checks stay consistent with the full policy", () => {
  it("isHiddenTarget reads the injected runtime set, not a captured one", () => {
    const runtimeHidden = new Set<string>();
    expect(isHiddenTarget(SET1_MODULE, runtimeHidden)).toBe(false);
    runtimeHidden.add(SET1_MODULE);
    expect(isHiddenTarget(SET1_MODULE, runtimeHidden)).toBe(true);
    expect(resolve({ slug: SET1_MODULE, hiddenSlugs: runtimeHidden })).toEqual({
      allowed: false,
      reason: "hidden",
    });
  });

  it("isProgressionGatedSlug marks exactly the slugs a set lock can refuse", () => {
    for (const slug of STEM_SET_2_MODULE_SLUGS) {
      expect(isProgressionGatedSlug(slug)).toBe(true);
    }
    for (const slug of STEM_SET_3_MODULE_SLUGS) {
      expect(isProgressionGatedSlug(slug)).toBe(true);
    }
    expect(isProgressionGatedSlug(SET1_MODULE)).toBe(false);
    expect(isProgressionGatedSlug(G35_MODULE)).toBe(false);

    // An ungated slug can never be refused for locked_set, whatever the
    // progress — which is why consumers may skip fetching progress for it.
    expect(resolve({ slug: SET1_MODULE, completedActivityIds: [] })).toEqual({
      allowed: true,
      source: "progression",
    });
  });
});

describe("denial copy never leaks whether content exists", () => {
  it("unregistered and hidden render the same reason", () => {
    expect(MODULE_UNAVAILABLE_REASON_KEYS.hidden).toBe(
      MODULE_UNAVAILABLE_REASON_KEYS.unregistered,
    );
  });

  it("wrong_grade and locked_set are allowed to be specific", () => {
    const generic = MODULE_UNAVAILABLE_REASON_KEYS.unregistered;
    expect(MODULE_UNAVAILABLE_REASON_KEYS.wrong_grade).not.toBe(generic);
    expect(MODULE_UNAVAILABLE_REASON_KEYS.locked_set).not.toBe(generic);
    expect(MODULE_UNAVAILABLE_REASON_KEYS.wrong_grade).not.toBe(
      MODULE_UNAVAILABLE_REASON_KEYS.locked_set,
    );
  });
});

describe("canTeacherAssignModule — the picker's view of policy E", () => {
  it("offers locked-set content (the assignment is its own override)", () => {
    expect(
      canTeacherAssignModule({
        slug: SET2_MODULE,
        module: mod(SET2_MODULE),
        hiddenSlugs: NO_HIDDEN,
        gradeBand: "k2",
      }),
    ).toBe(true);
  });

  it("never offers hidden or placeholder content", () => {
    expect(
      canTeacherAssignModule({
        slug: SET3_MODULE,
        module: mod(SET3_MODULE),
        hiddenSlugs: new Set([SET3_MODULE]),
        gradeBand: "k2",
      }),
    ).toBe(false);
    expect(
      canTeacherAssignModule({
        slug: "k2-stem-set3-slot-2",
        module: null,
        hiddenSlugs: NO_HIDDEN,
        gradeBand: "k2",
      }),
    ).toBe(false);
  });

  it("never offers content outside the class's band", () => {
    expect(
      canTeacherAssignModule({
        slug: G35_MODULE,
        module: mod(G35_MODULE, "G3-5"),
        hiddenSlugs: NO_HIDDEN,
        gradeBand: "k2",
      }),
    ).toBe(false);
    expect(
      canTeacherAssignModule({
        slug: G35_MODULE,
        module: mod(G35_MODULE, "G3-5"),
        hiddenSlugs: NO_HIDDEN,
        gradeBand: "g3_5",
      }),
    ).toBe(true);
  });

  it("never offers specialization-gated content to a whole class", () => {
    expect(
      canTeacherAssignModule({
        slug: SPECIALIZATION_MODULE,
        module: mod(SPECIALIZATION_MODULE),
        hiddenSlugs: NO_HIDDEN,
        gradeBand: "k2",
      }),
    ).toBe(false);
  });
});
