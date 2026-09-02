/**
 * Biome Buddy model invariants (design §5). The state space is bounded
 * (4 × 4 × 4 × 5 × 6 selections × 4 biomes = 7 680 builds), so the
 * properties are checked EXHAUSTIVELY rather than sampled.
 */
import { describe, expect, it } from "vitest";
import {
  BIOMES,
  CATEGORIES,
  NAME_ADJECTIVES,
  NAME_NOUNS,
  PATTERNS,
  STATS,
  TRAITS,
  TRAIT_OPTIONS,
  computeStats,
  diffBuilds,
  optionEffect,
  recipeKey,
  starterRecipe,
  statContributions,
  unlockedPickers,
  nextUnlock,
  validateRecipe,
  cloneRecipe,
  type Biome,
  type BuddyRecipe,
  type Category,
  type Stat,
  type TraitOption,
  type TraitSelection,
} from "../biomeBuddyModel";
import {
  BIOME_INFO,
  NAME_ADJECTIVE_LABEL,
  NAME_NOUN_LABEL,
  PATTERN_SCIENCE,
  SCIENCE,
  WHY,
  renderBuddyName,
  scienceFor,
  whyFor,
  type Localized,
  type ScienceCard,
} from "../biomeBuddyContent";

/** Every selection, once. */
function* allSelections(): Generator<TraitSelection> {
  for (const eyes of TRAIT_OPTIONS.eyes)
    for (const ears of TRAIT_OPTIONS.ears)
      for (const nose of TRAIT_OPTIONS.nose)
        for (const movement of TRAIT_OPTIONS.movement)
          for (const covering of TRAIT_OPTIONS.covering)
            yield { eyes, ears, nose, movement, covering };
}

function options(category: Category): [string, TraitOption][] {
  return Object.entries(TRAITS[category] as Record<string, TraitOption>);
}

describe("enum exhaustiveness", () => {
  it("TRAITS defines exactly the ids listed in TRAIT_OPTIONS, per category", () => {
    for (const category of CATEGORIES) {
      expect(Object.keys(TRAITS[category]).sort()).toEqual(
        [...TRAIT_OPTIONS[category]].sort(),
      );
    }
  });

  it("every option declares a modifier entry for ALL four biomes (invariant 1)", () => {
    for (const category of CATEGORIES)
      for (const [id, def] of options(category)) {
        expect(Object.keys(def.biomeMod).sort(), `${category}.${id}`).toEqual(
          [...BIOMES].sort(),
        );
        for (const biome of BIOMES)
          for (const [stat, value] of Object.entries(def.biomeMod[biome])) {
            expect(STATS).toContain(stat);
            expect(
              Number.isInteger(value),
              `${category}.${id}.${biome}.${stat}`,
            ).toBe(true);
          }
        for (const [stat, value] of Object.entries(def.base)) {
          expect(STATS).toContain(stat);
          expect(Number.isInteger(value)).toBe(true);
        }
        expect(def.emoji.length).toBeGreaterThan(0);
      }
  });

  it("ids are snake_case ASCII (they travel in share URLs)", () => {
    const all = [
      ...BIOMES,
      ...PATTERNS,
      ...NAME_ADJECTIVES,
      ...NAME_NOUNS,
      ...CATEGORIES.flatMap((c) => [...TRAIT_OPTIONS[c]]),
    ];
    for (const id of all) expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(new Set(all).size).toBe(all.length); // no cross-enum collisions
  });
});

describe("stat calculation", () => {
  it("clamps every stat to 0–100 for every selection × biome (invariant 2)", () => {
    let count = 0;
    for (const biome of BIOMES)
      for (const traits of allSelections()) {
        const stats = computeStats({ biome, traits });
        for (const stat of STATS) {
          expect(stats[stat]).toBeGreaterThanOrEqual(0);
          expect(stats[stat]).toBeLessThanOrEqual(100);
          expect(Number.isInteger(stats[stat])).toBe(true);
        }
        count++;
      }
    expect(count).toBe(4 * 4 * 4 * 4 * 5 * 6);
  });

  it("no selection maxes all four stats in any biome (invariant 3 — no 'correct build')", () => {
    for (const biome of BIOMES)
      for (const traits of allSelections()) {
        const stats = computeStats({ biome, traits });
        const maxed = STATS.filter((stat) => stats[stat] >= 100).length;
        expect(maxed, `${biome} ${JSON.stringify(traits)}`).toBeLessThan(4);
      }
  });

  it("no selection maxes even three stats — trade-offs stay visible", () => {
    for (const biome of BIOMES)
      for (const traits of allSelections()) {
        const stats = computeStats({ biome, traits });
        expect(STATS.filter((s) => stats[s] >= 100).length).toBeLessThanOrEqual(
          2,
        );
      }
  });

  it("every stat is REACHABLE high (≥ 85) in at least one biome, so bars feel alive", () => {
    for (const stat of STATS) {
      let best = 0;
      for (const biome of BIOMES)
        for (const traits of allSelections())
          best = Math.max(best, computeStats({ biome, traits })[stat]);
      expect(best, stat).toBeGreaterThanOrEqual(85);
    }
  });

  it("every biome has a different best build for at least two stats (biome matters)", () => {
    const bestFor = (biome: Biome, stat: Stat) => {
      let best: { v: number; key: string } = { v: -1, key: "" };
      for (const traits of allSelections()) {
        const v = computeStats({ biome, traits })[stat];
        if (v > best.v) best = { v, key: JSON.stringify(traits) };
      }
      return best.key;
    };
    for (const stat of STATS) {
      const keys = new Set(BIOMES.map((biome) => bestFor(biome, stat)));
      expect(keys.size, stat).toBeGreaterThanOrEqual(2);
    }
  });

  it("is deterministic: same recipe → same stats, and a fresh equal object agrees (invariant 6)", () => {
    for (const biome of BIOMES)
      for (const traits of allSelections()) {
        const a = computeStats({ biome, traits });
        const b = computeStats({ biome, traits: { ...traits } });
        expect(a).toEqual(b);
      }
  });

  it("statContributions sums to the (unclamped) stat and only lists nonzero rows", () => {
    const traits: TraitSelection = {
      eyes: "compound_eyes",
      ears: "hidden_ears",
      nose: "spiracles",
      movement: "wings",
      covering: "feathers",
    };
    const rows = statContributions("air", traits, "agility");
    for (const row of rows) expect(row.base !== 0 || row.mod !== 0).toBe(true);
    const raw = rows.reduce((sum, r) => sum + r.base + r.mod, 0);
    expect(raw).toBeGreaterThan(100); // wings+compound+spiracles+feathers in air overflow…
    expect(computeStats({ biome: "air", traits }).agility).toBe(100); // …and clamp
  });

  it("optionEffect matches the matrix (contribution correctness spot-checks from the design doc)", () => {
    expect(optionEffect("nose", "gills", "water")).toEqual({
      smell: 75,
      agility: 5,
    });
    expect(optionEffect("nose", "gills", "fire")).toEqual({
      smell: 10,
      agility: -20,
    });
    expect(optionEffect("covering", "hard_shell", "air")).toEqual({
      agility: -35,
    });
    expect(optionEffect("eyes", "compound_eyes", "air")).toEqual({
      sight: 85,
      agility: 15,
    });
  });

  it("gills are the design's headline biome-dependency lesson: best in water, worst in fire", () => {
    const base: TraitSelection = { ...starterRecipe().traits, nose: "gills" };
    const smell = Object.fromEntries(
      BIOMES.map((b) => [b, computeStats({ biome: b, traits: base }).smell]),
    ) as Record<Biome, number>;
    expect(smell.water).toBeGreaterThan(smell.earth);
    expect(smell.earth).toBeGreaterThan(smell.fire);
    expect(smell.water).toBeGreaterThan(smell.air);
  });
});

describe("explanation completeness (invariant 4)", () => {
  const nonEmpty = (l: Localized, label: string) => {
    expect(l.en.trim().length, `${label}.en`).toBeGreaterThan(0);
    expect(l.es.trim().length, `${label}.es`).toBeGreaterThan(0);
    expect(l.en, `${label} es==en`).not.toEqual(l.es);
  };

  it("every (option, biome) pair with a nonzero modifier has an en+es why-line", () => {
    for (const category of CATEGORIES)
      for (const [id, def] of options(category))
        for (const biome of BIOMES) {
          const nonzero = Object.values(def.biomeMod[biome]).some(
            (v) => v !== 0,
          );
          const why = whyFor(category, id as never, biome);
          if (nonzero) {
            expect(why, `${category}.${id}.${biome}`).not.toBeNull();
            nonEmpty(why!, `why.${category}.${id}.${biome}`);
          } else {
            // A why-line for a zero modifier would explain a change that
            // never happens — keep the table honest in both directions.
            expect(
              why,
              `${category}.${id}.${biome} has a why-line but no modifier`,
            ).toBeNull();
          }
        }
  });

  it("WHY carries no ids outside the closed enums", () => {
    for (const category of CATEGORIES) {
      const table = WHY[category] as Record<string, Record<string, unknown>>;
      for (const [option, byBiome] of Object.entries(table)) {
        expect(TRAIT_OPTIONS[category] as readonly string[]).toContain(option);
        for (const biome of Object.keys(byBiome))
          expect(BIOMES).toContain(biome);
      }
    }
  });

  it("every option and pattern has a complete 8-part science card in en + es", () => {
    const parts: (keyof ScienceCard)[] = [
      "label",
      "term",
      "what",
      "usedFor",
      "evolved",
      "animals",
      "where",
      "affects",
      "more",
    ];
    for (const category of CATEGORIES)
      for (const id of TRAIT_OPTIONS[category]) {
        const card = scienceFor(category, id);
        for (const part of parts)
          nonEmpty(card[part], `${category}.${id}.${part}`);
      }
    for (const pattern of PATTERNS) {
      const card = scienceFor("pattern", pattern);
      for (const part of parts)
        nonEmpty(card[part], `pattern.${pattern}.${part}`);
    }
    expect(Object.keys(SCIENCE).sort()).toEqual([...CATEGORIES].sort());
    expect(Object.keys(PATTERN_SCIENCE).sort()).toEqual([...PATTERNS].sort());
  });

  it("every biome has a four-sentence kid description in en + es", () => {
    for (const biome of BIOMES) {
      const info = BIOME_INFO[biome];
      nonEmpty(info.label, `${biome}.label`);
      nonEmpty(info.subtitle, `${biome}.subtitle`);
      nonEmpty(info.fauna, `${biome}.fauna`);
      for (const lang of ["en", "es"] as const) {
        const sentences = info.description[lang]
          .split(/[.!?]\s+|[.!?]$/)
          .filter(Boolean);
        expect(sentences.length, `${biome}.description.${lang}`).toBe(4);
      }
    }
  });

  it("science-card kid sentences stay short (K–2 bar: ≤ 22 words) for the 'what' line", () => {
    for (const category of CATEGORIES)
      for (const id of TRAIT_OPTIONS[category]) {
        const words = scienceFor(category, id).what.en.split(/\s+/).length;
        expect(words, `${category}.${id}.what`).toBeLessThanOrEqual(22);
      }
  });
});

describe("name kit", () => {
  it("renders from ids in both locales with locale word order", () => {
    expect(renderBuddyName({ adjective: "swift", noun: "finfox" }, "en")).toBe(
      "Swift Finfox",
    );
    expect(renderBuddyName({ adjective: "swift", noun: "finfox" }, "es")).toBe(
      "Aletazorro Veloz",
    );
    expect(
      renderBuddyName({ adjective: "swift", noun: "finfox" }, "zh-CN"),
    ).toBe(
      "Swift Finfox", // unsupported locale → English, never a raw id
    );
  });

  it("every adjective and noun id has en + es labels", () => {
    for (const id of NAME_ADJECTIVES) {
      expect(NAME_ADJECTIVE_LABEL[id].en).toBeTruthy();
      expect(NAME_ADJECTIVE_LABEL[id].es).toBeTruthy();
    }
    for (const id of NAME_NOUNS) {
      expect(NAME_NOUN_LABEL[id].en).toBeTruthy();
      expect(NAME_NOUN_LABEL[id].es).toBeTruthy();
    }
  });
});

describe("recipe validation (invariant 5)", () => {
  const good = (): BuddyRecipe => ({
    version: 1,
    biome: "water",
    traits: {
      eyes: "compound_eyes",
      ears: "tympanum",
      nose: "gills",
      movement: "fins",
      covering: "smooth_scales",
    },
    pattern: "countershading",
    name: { adjective: "swift", noun: "splasher" },
  });

  it("accepts a valid recipe and returns a fresh object", () => {
    const input = good();
    const result = validateRecipe(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recipe).toEqual(input);
    expect(result.recipe).not.toBe(input);
    expect(result.recipe.traits).not.toBe(input.traits);
  });

  it.each([
    ["not an object", 42, "not_object"],
    ["null", null, "not_object"],
    ["array", [], "not_object"],
    [
      "unknown top-level field",
      { ...good(), stats: { sight: 100 } },
      "unknown_field",
    ],
    ["future version", { ...good(), version: 2 }, "version"],
    ["string version", { ...good(), version: "1" }, "version"],
    ["unknown biome", { ...good(), biome: "lava" }, "biome"],
    ["numeric biome", { ...good(), biome: 1 }, "biome"],
    ["missing category", { ...good(), traits: { eyes: "no_eyes" } }, "traits"],
    [
      "extra category",
      { ...good(), traits: { ...good().traits, touch: "whiskers" } },
      "traits",
    ],
    [
      "unknown category option",
      { ...good(), traits: { ...good().traits, eyes: "laser_eyes" } },
      "trait_option",
    ],
    [
      "option from another category",
      { ...good(), traits: { ...good().traits, eyes: "gills" } },
      "trait_option",
    ],
    ["unknown pattern", { ...good(), pattern: "plaid" }, "pattern"],
    ["free-text name", { ...good(), name: "Nathaniel" }, "name"],
    [
      "unknown name field",
      { ...good(), name: { ...good().name, text: "hi" } },
      "unknown_field",
    ],
    [
      "unknown adjective",
      { ...good(), name: { adjective: "evil", noun: "roamer" } },
      "name",
    ],
  ])("rejects %s", (_label, input, error) => {
    const result = validateRecipe(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(error);
  });

  it("does not let a prototype-polluted object through", () => {
    const sneaky = Object.create({ version: 1 });
    Object.assign(sneaky, good());
    expect(validateRecipe(sneaky).ok).toBe(false);
  });

  it("recipeKey is stable and order-independent; cloneRecipe never aliases", () => {
    const a = good();
    const b = { ...good(), traits: { ...good().traits } };
    expect(recipeKey(a)).toBe(recipeKey(b));
    const clone = cloneRecipe(a);
    clone.traits.eyes = "no_eyes";
    clone.name.noun = "digger";
    expect(a.traits.eyes).toBe("compound_eyes");
    expect(a.name.noun).toBe("splasher");
  });
});

describe("Test & Learn diff", () => {
  it("compares against the starter when there is no previous test and lists only moved stats", () => {
    const current = starterRecipe("earth");
    current.traits.eyes = "no_eyes";
    const summary = diffBuilds(null, current);
    expect(summary.unchanged).toBe(false);
    expect(summary.changes.map((c) => c.stat)).toContain("sight");
    for (const change of summary.changes) {
      expect(change.delta).toBe(change.after - change.before);
      expect(change.delta).not.toBe(0);
      expect(
        change.changedContributions.every((c) => c.category === "eyes"),
      ).toBe(true);
    }
  });

  it("flags an identical re-test as unchanged (the 'nothing moved' wondering card)", () => {
    const r = starterRecipe("fire");
    const summary = diffBuilds({ biome: r.biome, traits: r.traits }, r);
    expect(summary.unchanged).toBe(true);
    expect(summary.changes).toEqual([]);
  });

  it("a biome change alone attributes moved stats to biome-sensitive parts", () => {
    const prev = starterRecipe("earth");
    const next = starterRecipe("water");
    const summary = diffBuilds(prev, next);
    expect(summary.unchanged).toBe(false);
    for (const change of summary.changes)
      expect(change.changedContributions.every((c) => c.mod !== 0)).toBe(true);
  });
});

describe("Guided unlock ladder (iteration, never correctness)", () => {
  it("k2 starts with eyes + movement and opens one picker per test, capped at all six", () => {
    expect(unlockedPickers("k2", 0)).toEqual(["eyes", "movement"]);
    expect(unlockedPickers("k2", 1)).toEqual(["eyes", "movement", "ears"]);
    expect(unlockedPickers("k2", 4)).toHaveLength(6);
    expect(unlockedPickers("k2", 99)).toHaveLength(6);
    expect(unlockedPickers("k2", -3)).toEqual(["eyes", "movement"]);
    expect(nextUnlock("k2", 0)).toBe("ears");
    expect(nextUnlock("k2", 4)).toBeNull();
  });

  it("older bands open every picker from the start", () => {
    expect(unlockedPickers("g35", 0)).toHaveLength(6);
    expect(unlockedPickers("g68", 0)).toHaveLength(6);
    expect(nextUnlock("g35", 0)).toBeNull();
  });
});
