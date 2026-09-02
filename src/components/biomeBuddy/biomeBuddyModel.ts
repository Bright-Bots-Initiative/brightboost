/**
 * Biome Buddy — pure model (design: docs/games/biome-buddy-design.md §5).
 *
 * Typed const data + pure functions, NO React and NO i18n imports so every
 * invariant is unit-testable in isolation (Waterworks `waterworksSim.ts`
 * precedent). Everything a Buddy IS lives here as closed enums:
 *
 *   biome · five stat-driving trait categories · identity-only pattern ·
 *   structured name kit · contribution matrix · stat calculation ·
 *   recipe validation/versioning.
 *
 * House invariants (each pinned by `__tests__/biomeBuddyModel.test.ts`):
 *   1. every option declares a modifier entry for ALL four biomes;
 *   2. every stat clamps to 0–100 for every selection × biome;
 *   3. no selection maxes all four stats in any biome — trade-offs are the
 *      curriculum, there is no "correct build";
 *   4. every nonzero modifier has a why-line (see biomeBuddyContent.ts);
 *   5. closed-enum validation rejects unknown values and unknown fields;
 *   6. same recipe → same stats (pure);
 *   7. same recipe → same sprite (BuddySprite.tsx renders from this data only).
 */

// ── Closed enums ────────────────────────────────────────────────────────────

export const BIOMES = ["earth", "water", "fire", "air"] as const;
export type Biome = (typeof BIOMES)[number];

export const STATS = ["sight", "hearing", "smell", "agility"] as const;
export type Stat = (typeof STATS)[number];

/** Stat-driving categories, in display order. */
export const CATEGORIES = [
  "eyes",
  "ears",
  "nose",
  "movement",
  "covering",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const TRAIT_OPTIONS = {
  eyes: ["no_eyes", "rotating_eyes", "wide_set_eyes", "compound_eyes"],
  ears: ["hidden_ears", "pinna", "jaw_vibration", "tympanum"],
  nose: ["gills", "nose_lungs", "forked_tongue", "spiracles"],
  movement: ["wings", "fins", "webbed_feet", "claws", "padded_paws"],
  covering: [
    "short_fur",
    "long_fur",
    "smooth_scales",
    "keeled_scales",
    "hard_shell",
    "feathers",
  ],
} as const satisfies Record<Category, readonly string[]>;

export type OptionId<C extends Category = Category> =
  (typeof TRAIT_OPTIONS)[C][number];
export type AnyOptionId = OptionId<Category>;

/** Identity-only picker (no stat effect in v1; a future "Hiding" stat can
 *  activate a matrix without UI change). */
export const PATTERNS = [
  "stripes",
  "spots",
  "countershading",
  "warning",
  "camouflage",
] as const;
export type Pattern = (typeof PATTERNS)[number];

export type TraitSelection = { [C in Category]: OptionId<C> };

export type StatBlock = Record<Stat, number>;

// ── Contribution matrix ─────────────────────────────────────────────────────

export interface TraitOption {
  emoji: string;
  /** Biome-independent contribution. */
  base: Partial<StatBlock>;
  /** Per-biome modifier — every biome MUST be present (invariant 1). */
  biomeMod: Record<Biome, Partial<StatBlock>>;
}

type TraitTable = { [C in Category]: Record<OptionId<C>, TraitOption> };

/**
 * Authoring baseline. Each stat's primary driver is one category
 * (eyes→sight, ears→hearing, nose→smell, movement→agility); body covering and
 * a few sensory options add secondary agility/hearing/smell effects. Values
 * are tuned so every stat can reach ≥90 in its best biome while no build can
 * reach 100 on all four (invariant 3 is enforced by exhaustive test, not by
 * hope).
 */
export const TRAITS: TraitTable = {
  eyes: {
    no_eyes: {
      emoji: "🙈",
      base: { sight: 5, hearing: 10, smell: 10 },
      biomeMod: {
        earth: { hearing: 5 },
        water: { smell: 5 },
        fire: {},
        air: { hearing: -5 },
      },
    },
    rotating_eyes: {
      emoji: "🦎",
      base: { sight: 60 },
      biomeMod: {
        earth: { sight: 25 },
        water: { sight: -15 },
        fire: { sight: 5 },
        air: {},
      },
    },
    wide_set_eyes: {
      emoji: "🐰",
      base: { sight: 65, agility: 5 },
      biomeMod: {
        earth: { sight: 5 },
        water: { sight: -10 },
        fire: { sight: 20 },
        air: { sight: 10 },
      },
    },
    compound_eyes: {
      emoji: "🦟",
      base: { sight: 55, agility: 10 },
      biomeMod: {
        earth: {},
        water: { sight: -15 },
        fire: { sight: 5 },
        air: { sight: 30, agility: 5 },
      },
    },
  },
  ears: {
    hidden_ears: {
      emoji: "🐦",
      base: { hearing: 40, agility: 5 },
      biomeMod: {
        earth: {},
        water: { hearing: 5 },
        fire: {},
        air: { hearing: 10 },
      },
    },
    pinna: {
      emoji: "🦊",
      base: { hearing: 70 },
      biomeMod: {
        earth: { hearing: 5 },
        water: { hearing: -25 },
        fire: { hearing: 15 },
        air: { hearing: -10, agility: -5 },
      },
    },
    jaw_vibration: {
      emoji: "🐍",
      base: { hearing: 40 },
      biomeMod: {
        earth: { hearing: 20 },
        water: { hearing: -10 },
        fire: { hearing: 15 },
        air: { hearing: -20 },
      },
    },
    tympanum: {
      emoji: "🐸",
      base: { hearing: 55 },
      biomeMod: {
        earth: { hearing: 10 },
        water: { hearing: 20 },
        fire: { hearing: -20 },
        air: {},
      },
    },
  },
  nose: {
    gills: {
      emoji: "🐟",
      base: { smell: 50 },
      biomeMod: {
        earth: { smell: -25, agility: -10 },
        water: { smell: 25, agility: 5 },
        fire: { smell: -40, agility: -20 },
        air: { smell: -30, agility: -15 },
      },
    },
    nose_lungs: {
      emoji: "🐶",
      base: { smell: 50 },
      biomeMod: {
        earth: { smell: 15 },
        water: { smell: -20 },
        fire: { smell: -5 },
        air: {},
      },
    },
    forked_tongue: {
      emoji: "👅",
      base: { smell: 60 },
      biomeMod: {
        earth: { smell: 15 },
        water: { smell: -15 },
        fire: { smell: 20 },
        air: { smell: -15 },
      },
    },
    spiracles: {
      emoji: "🐛",
      base: { smell: 30, agility: 10 },
      biomeMod: {
        earth: { smell: 5 },
        water: { smell: -20 },
        fire: { smell: 5 },
        air: { smell: 5, agility: 5 },
      },
    },
  },
  movement: {
    wings: {
      emoji: "🦅",
      base: { agility: 55, sight: 5 },
      biomeMod: {
        earth: { agility: -5 },
        water: { agility: -25 },
        fire: { agility: 5 },
        air: { agility: 30 },
      },
    },
    fins: {
      emoji: "🐠",
      base: { agility: 55 },
      biomeMod: {
        earth: { agility: -35 },
        water: { agility: 35 },
        fire: { agility: -40 },
        air: { agility: -35 },
      },
    },
    webbed_feet: {
      emoji: "🦆",
      base: { agility: 45 },
      biomeMod: {
        earth: {},
        water: { agility: 25 },
        fire: { agility: -20 },
        air: { agility: -15 },
      },
    },
    claws: {
      emoji: "🐾",
      base: { agility: 50 },
      biomeMod: {
        earth: { agility: 25 },
        water: { agility: -20 },
        fire: { agility: 10 },
        air: { agility: 15 },
      },
    },
    padded_paws: {
      emoji: "🐈",
      base: { agility: 55 },
      biomeMod: {
        earth: { agility: 10 },
        water: { agility: -15 },
        fire: { agility: 20 },
        air: { agility: -5 },
      },
    },
  },
  covering: {
    short_fur: {
      emoji: "🐹",
      base: { agility: 5 },
      biomeMod: {
        earth: { agility: 5 },
        water: { agility: -5 },
        fire: {},
        air: {},
      },
    },
    long_fur: {
      emoji: "🐑",
      base: { agility: -5 },
      biomeMod: {
        earth: {},
        water: { agility: -15 },
        fire: { agility: -10 },
        air: { agility: 5 },
      },
    },
    smooth_scales: {
      emoji: "🐟",
      base: { agility: 5 },
      biomeMod: {
        earth: { agility: 5 },
        water: { agility: 10 },
        fire: { agility: 5 },
        air: { agility: -5 },
      },
    },
    keeled_scales: {
      emoji: "🦎",
      base: {},
      biomeMod: {
        earth: { agility: 5 },
        water: { agility: -5 },
        fire: { agility: 10 },
        air: {},
      },
    },
    hard_shell: {
      emoji: "🐢",
      base: { agility: -15 },
      biomeMod: {
        earth: { agility: -10 },
        water: { agility: -15 },
        fire: { agility: -5 },
        air: { agility: -20 },
      },
    },
    feathers: {
      emoji: "🦜",
      base: { agility: 5 },
      biomeMod: {
        earth: {},
        water: { agility: 5 },
        fire: { agility: -5 },
        air: { agility: 15 },
      },
    },
  },
};

export const PATTERN_EMOJI: Record<Pattern, string> = {
  stripes: "🦓",
  spots: "🐆",
  countershading: "🦈",
  warning: "🐝",
  camouflage: "🍂",
};

export const BIOME_EMOJI: Record<Biome, string> = {
  earth: "🌱",
  water: "💧",
  fire: "🔥",
  air: "🌬️",
};

export const STAT_EMOJI: Record<Stat, string> = {
  sight: "👁️",
  hearing: "👂",
  smell: "👃",
  agility: "💨",
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  eyes: "👁️",
  ears: "👂",
  nose: "👃",
  movement: "💨",
  covering: "🛡️",
};

// ── Name kit (structured choices, no free text — ids are what get stored) ───

export const NAME_ADJECTIVES = [
  "swift",
  "brave",
  "sparkly",
  "mighty",
  "gentle",
  "sunny",
  "bold",
  "happy",
] as const;
export const NAME_NOUNS = [
  "finfox",
  "hopper",
  "glider",
  "digger",
  "splasher",
  "crawler",
  "flutter",
  "roamer",
] as const;
export type NameAdjective = (typeof NAME_ADJECTIVES)[number];
export type NameNoun = (typeof NAME_NOUNS)[number];

export interface BuddyName {
  adjective: NameAdjective;
  noun: NameNoun;
}

// ── Recipe ──────────────────────────────────────────────────────────────────

export const RECIPE_VERSION = 1 as const;

/** The complete, closed-enum description of a Buddy. Stats are DERIVED from
 *  this — never stored, never trusted from outside. */
export interface BuddyRecipe {
  version: typeof RECIPE_VERSION;
  biome: Biome;
  traits: TraitSelection;
  pattern: Pattern;
  name: BuddyName;
}

/** The starter Buddy a new build begins from (also what Guided K–2 locked
 *  categories hold until they unlock). */
export const STARTER_TRAITS: TraitSelection = {
  eyes: "wide_set_eyes",
  ears: "hidden_ears",
  nose: "nose_lungs",
  movement: "padded_paws",
  covering: "short_fur",
};
export const STARTER_PATTERN: Pattern = "spots";
export const STARTER_NAME: BuddyName = { adjective: "sunny", noun: "roamer" };

export function starterRecipe(biome: Biome = "earth"): BuddyRecipe {
  return {
    version: RECIPE_VERSION,
    biome,
    traits: { ...STARTER_TRAITS },
    pattern: STARTER_PATTERN,
    name: { ...STARTER_NAME },
  };
}

/** Deep copy so a remix can never alias (and so mutate) its source. */
export function cloneRecipe(recipe: BuddyRecipe): BuddyRecipe {
  return {
    version: recipe.version,
    biome: recipe.biome,
    traits: { ...recipe.traits },
    pattern: recipe.pattern,
    name: { ...recipe.name },
  };
}

// ── Type guards ─────────────────────────────────────────────────────────────

export function isBiome(value: unknown): value is Biome {
  return (
    typeof value === "string" && (BIOMES as readonly string[]).includes(value)
  );
}
export function isStat(value: unknown): value is Stat {
  return (
    typeof value === "string" && (STATS as readonly string[]).includes(value)
  );
}
export function isCategory(value: unknown): value is Category {
  return (
    typeof value === "string" &&
    (CATEGORIES as readonly string[]).includes(value)
  );
}
export function isPattern(value: unknown): value is Pattern {
  return (
    typeof value === "string" && (PATTERNS as readonly string[]).includes(value)
  );
}
export function isOptionOf<C extends Category>(
  category: C,
  value: unknown,
): value is OptionId<C> {
  return (
    typeof value === "string" &&
    (TRAIT_OPTIONS[category] as readonly string[]).includes(value)
  );
}
export function isNameAdjective(value: unknown): value is NameAdjective {
  return (
    typeof value === "string" &&
    (NAME_ADJECTIVES as readonly string[]).includes(value)
  );
}
export function isNameNoun(value: unknown): value is NameNoun {
  return (
    typeof value === "string" &&
    (NAME_NOUNS as readonly string[]).includes(value)
  );
}

// ── Stats ───────────────────────────────────────────────────────────────────

export function clampStat(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export interface Contribution {
  category: Category;
  option: AnyOptionId;
  /** Biome-independent part. */
  base: number;
  /** Biome-dependent part. */
  mod: number;
}

/** Per-category breakdown of one stat in one biome (only nonzero rows). */
export function statContributions(
  biome: Biome,
  traits: TraitSelection,
  stat: Stat,
): Contribution[] {
  const rows: Contribution[] = [];
  for (const category of CATEGORIES) {
    const option = traits[category];
    const def = (TRAITS[category] as Record<string, TraitOption>)[option];
    const base = def.base[stat] ?? 0;
    const mod = def.biomeMod[biome][stat] ?? 0;
    if (base !== 0 || mod !== 0) rows.push({ category, option, base, mod });
  }
  return rows;
}

export function statValue(
  biome: Biome,
  traits: TraitSelection,
  stat: Stat,
): number {
  let total = 0;
  for (const row of statContributions(biome, traits, stat))
    total += row.base + row.mod;
  return clampStat(total);
}

export function computeStats(
  recipe: Pick<BuddyRecipe, "biome" | "traits">,
): StatBlock {
  const out = {} as StatBlock;
  for (const stat of STATS)
    out[stat] = statValue(recipe.biome, recipe.traits, stat);
  return out;
}

/** What ONE option contributes to each stat in a biome — the science card's
 *  "this changes" line. */
export function optionEffect(
  category: Category,
  option: AnyOptionId,
  biome: Biome,
): Partial<StatBlock> {
  const def = (TRAITS[category] as Record<string, TraitOption>)[option];
  const out: Partial<StatBlock> = {};
  for (const stat of STATS) {
    const v = (def.base[stat] ?? 0) + (def.biomeMod[biome][stat] ?? 0);
    if (v !== 0) out[stat] = v;
  }
  return out;
}

/** The (category, option) pairs whose biome modifier is nonzero for `stat`
 *  — these are what Test & Learn explains. */
export function biomeSensitiveContributions(
  biome: Biome,
  traits: TraitSelection,
  stat: Stat,
): Contribution[] {
  return statContributions(biome, traits, stat).filter((row) => row.mod !== 0);
}

// ── Test & Learn diff ───────────────────────────────────────────────────────

export interface StatChange {
  stat: Stat;
  before: number;
  after: number;
  delta: number;
  /** Categories whose option differs between the two builds and touches this
   *  stat in the AFTER biome (why-lines are looked up from these). */
  changedContributions: Contribution[];
}

export interface TestSummary {
  biome: Biome;
  before: StatBlock;
  after: StatBlock;
  changes: StatChange[]; // only stats whose value moved, display order
  /** True when the tested recipe differs from the previous one in no trait
   *  and no biome (the "nothing moved" wondering card). */
  unchanged: boolean;
}

export function diffBuilds(
  previous: Pick<BuddyRecipe, "biome" | "traits"> | null,
  current: Pick<BuddyRecipe, "biome" | "traits">,
): TestSummary {
  const base = previous ?? { biome: current.biome, traits: STARTER_TRAITS };
  const before = computeStats(base);
  const after = computeStats(current);
  const biomeChanged = base.biome !== current.biome;
  const changedCategories = CATEGORIES.filter(
    (category) => base.traits[category] !== current.traits[category],
  );
  const changes: StatChange[] = [];
  for (const stat of STATS) {
    if (before[stat] === after[stat]) continue;
    const rows = statContributions(current.biome, current.traits, stat).filter(
      (row) =>
        changedCategories.includes(row.category) ||
        (biomeChanged && row.mod !== 0),
    );
    // A swapped part whose NEW option adds nothing to this stat still moved
    // it (the old option did) — keep it in the explanation so the child sees
    // which part is responsible, never an empty "why".
    for (const category of changedCategories)
      if (!rows.some((row) => row.category === category))
        rows.push({
          category,
          option: current.traits[category],
          base: 0,
          mod: 0,
        });
    changes.push({
      stat,
      before: before[stat],
      after: after[stat],
      delta: after[stat] - before[stat],
      changedContributions: rows,
    });
  }
  return {
    biome: current.biome,
    before,
    after,
    changes,
    unchanged: !biomeChanged && changedCategories.length === 0,
  };
}

// ── Bands + Guided unlock ladder ────────────────────────────────────────────

export const BANDS = ["k2", "g35", "g68"] as const;
export type Band = (typeof BANDS)[number];
export function isBand(value: unknown): value is Band {
  return (
    typeof value === "string" && (BANDS as readonly string[]).includes(value)
  );
}

/** Pickers in unlock order for 🐣 Guided. Progress is measured by TESTS RUN
 *  (iteration), never by stat values — there is no "correct build" to reward. */
export type Picker = Category | "pattern";
export const PICKERS: readonly Picker[] = [...CATEGORIES, "pattern"];
export const GUIDED_START: readonly Picker[] = ["eyes", "movement"];
export const GUIDED_UNLOCK_ORDER: readonly Picker[] = [
  "ears",
  "nose",
  "covering",
  "pattern",
];

export function unlockedPickers(band: Band, testsCompleted: number): Picker[] {
  if (band !== "k2") return [...PICKERS];
  const extra = Math.max(
    0,
    Math.min(GUIDED_UNLOCK_ORDER.length, Math.floor(testsCompleted)),
  );
  return [...GUIDED_START, ...GUIDED_UNLOCK_ORDER.slice(0, extra)];
}

export function nextUnlock(band: Band, testsCompleted: number): Picker | null {
  if (band !== "k2") return null;
  const index = Math.max(0, Math.floor(testsCompleted));
  return GUIDED_UNLOCK_ORDER[index] ?? null;
}

// ── Recipe validation (closed enums, unknown fields rejected) ───────────────

export type RecipeError =
  | "not_object"
  | "unknown_field"
  | "version"
  | "biome"
  | "traits"
  | "trait_option"
  | "pattern"
  | "name";

export type RecipeResult =
  | { ok: true; recipe: BuddyRecipe }
  | { ok: false; error: RecipeError; detail?: string };

const RECIPE_KEYS = new Set(["version", "biome", "traits", "pattern", "name"]);
const NAME_KEYS = new Set(["adjective", "noun"]);
const CATEGORY_SET = new Set<string>(CATEGORIES);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Strict: every enum checked, exactly the expected keys at every level.
 * Anything else — an extra `stats` object, a sixth category, a numeric
 * biome — is rejected. Returns a FRESH object (never the input) so callers
 * can't be handed a prototype-polluted or later-mutated reference.
 */
export function validateRecipe(value: unknown): RecipeResult {
  if (!isPlainObject(value)) return { ok: false, error: "not_object" };
  for (const key of Object.keys(value))
    if (!RECIPE_KEYS.has(key))
      return { ok: false, error: "unknown_field", detail: key };
  if (value.version !== RECIPE_VERSION)
    return { ok: false, error: "version", detail: String(value.version) };
  if (!isBiome(value.biome))
    return { ok: false, error: "biome", detail: String(value.biome) };
  if (!isPlainObject(value.traits)) return { ok: false, error: "traits" };
  const traitKeys = Object.keys(value.traits);
  if (traitKeys.length !== CATEGORIES.length)
    return { ok: false, error: "traits", detail: "count" };
  for (const key of traitKeys)
    if (!CATEGORY_SET.has(key))
      return { ok: false, error: "unknown_field", detail: `traits.${key}` };
  const traits = {} as TraitSelection;
  for (const category of CATEGORIES) {
    const option = value.traits[category];
    if (!isOptionOf(category, option))
      return {
        ok: false,
        error: "trait_option",
        detail: `${category}:${String(option)}`,
      };
    (traits as Record<Category, string>)[category] = option;
  }
  if (!isPattern(value.pattern))
    return { ok: false, error: "pattern", detail: String(value.pattern) };
  if (!isPlainObject(value.name)) return { ok: false, error: "name" };
  for (const key of Object.keys(value.name))
    if (!NAME_KEYS.has(key))
      return { ok: false, error: "unknown_field", detail: `name.${key}` };
  if (!isNameAdjective(value.name.adjective) || !isNameNoun(value.name.noun))
    return { ok: false, error: "name" };
  return {
    ok: true,
    recipe: {
      version: RECIPE_VERSION,
      biome: value.biome,
      traits,
      pattern: value.pattern,
      name: { adjective: value.name.adjective, noun: value.name.noun },
    },
  };
}

/** Stable, order-independent identity for "same recipe" comparisons. */
export function recipeKey(recipe: BuddyRecipe): string {
  return [
    recipe.version,
    recipe.biome,
    ...CATEGORIES.map((category) => recipe.traits[category]),
    recipe.pattern,
    recipe.name.adjective,
    recipe.name.noun,
  ].join("|");
}
