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
  STARTER_TRAITS,
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

  it("statContributions lists exactly the nonzero rows, and the clamp bites when the raw sum overflows", () => {
    const traits: TraitSelection = {
      eyes: "compound_eyes",
      ears: "hidden_ears",
      nose: "spiracles",
      movement: "wings",
      covering: "keeled_scales", // zero agility in air → must NOT appear
    };
    const rows = statContributions("air", traits, "agility");
    expect(rows).toEqual([
      { category: "eyes", option: "compound_eyes", base: 10, mod: 5 },
      { category: "ears", option: "hidden_ears", base: 5, mod: 0 },
      { category: "nose", option: "spiracles", base: 10, mod: 5 },
      { category: "movement", option: "wings", base: 55, mod: 30 },
    ]);
    const raw = rows.reduce((sum, r) => sum + r.base + r.mod, 0);
    expect(raw).toBe(120);
    expect(computeStats({ biome: "air", traits }).agility).toBe(100);
    // the same build in water does not overflow, so no clamp is applied
    expect(computeStats({ biome: "water", traits }).agility).toBe(
      statContributions("water", traits, "agility").reduce(
        (sum, r) => sum + r.base + r.mod,
        0,
      ),
    );
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

describe("science guards (adversarial-review corrections stay corrected)", () => {
  const en = (l: Localized) => l.en;

  it("an eyeless Buddy never GAINS sight from any biome (finding 7)", () => {
    for (const biome of BIOMES) {
      expect(
        TRAITS.eyes.no_eyes.biomeMod[biome].sight ?? 0,
      ).toBeLessThanOrEqual(0);
      expect(
        optionEffect("eyes", "no_eyes", biome).sight ?? 0,
      ).toBeLessThanOrEqual(TRAITS.eyes.no_eyes.base.sight ?? 0);
    }
  });

  it("gills breathe; the nares smell (finding 1)", () => {
    const card = scienceFor("nose", "gills");
    expect(en(card.label)).toMatch(/water-nose/);
    expect(en(card.what)).toMatch(/nostril/);
    expect(en(card.more)).toMatch(/nares/);
    expect(en(card.more)).not.toMatch(/fish smells with every breath/i);
    for (const biome of BIOMES) {
      const why = whyFor("nose", "gills", biome);
      expect(why).not.toBeNull();
      // gills may "pull oxygen"; they may never be the thing that smells
      expect(en(why!)).not.toMatch(
        /gills (sniff|smell|pull (in )?(smells?|scents?)|catch (smells?|scents?)|take in (smells?|scents?))/i,
      );
      expect(why!.es).not.toMatch(
        /branquias (huelen|olfatean|sacan (olores?|aromas?)|atrapan (olores?|aromas?))/i,
      );
    }
  });

  it("spiracles breathe; antennae smell; spiders are not insects (findings 2, 6)", () => {
    const card = scienceFor("nose", "spiracles");
    expect(en(card.label)).toMatch(/antennae/);
    expect(en(card.what)).toMatch(/antennae do the smelling/);
    expect(en(card.animals)).not.toMatch(/spider/i);
    expect(card.animals.es).not.toMatch(/araña/i);
    expect(en(whyFor("nose", "spiracles", "water")!)).toMatch(/antennae/i);
  });

  it("claws are claws, not hooves or gecko pads (finding 3)", () => {
    const card = scienceFor("movement", "claws");
    expect(en(card.animals)).not.toMatch(/goat|gecko/i);
    expect(en(card.more)).not.toMatch(/hoo(f|ves)/i);
    expect(en(whyFor("movement", "claws", "air")!)).not.toMatch(
      /hoo(f|ves)|goat/i,
    );
  });

  it("ladybugs are warning-coloured, skunks are not disruptive, chameleons are not sand lances (findings 4, 5, 23)", () => {
    expect(en(scienceFor("pattern", "spots").animals)).not.toMatch(/ladybug/i);
    expect(en(scienceFor("pattern", "warning").animals)).toMatch(/wasp|bee/i);
    expect(scienceFor("pattern", "warning").animals.es).not.toMatch(
      /mariquita/i,
    );
    expect(en(scienceFor("pattern", "stripes").animals)).not.toMatch(/skunk/i);
    expect(en(scienceFor("eyes", "rotating_eyes").animals)).not.toMatch(
      /sandlance|sand lance|seahorse/i,
    );
    expect(en(scienceFor("pattern", "spots").animals)).not.toMatch(/cheetah/i);
    expect(en(scienceFor("pattern", "spots").term)).toMatch(/cryptic/);
    expect(en(scienceFor("nose", "gills").animals)).not.toMatch(
      /crab|shrimp|lobster/i,
    );
    expect(en(whyFor("nose", "nose_lungs", "water")!)).not.toMatch(
      /no smelling happens/,
    );
    expect(en(scienceFor("movement", "wings").affects)).not.toMatch(
      /open forests/,
    );
  });

  it("third-pass corrections stay corrected (SCI-1..5)", () => {
    // crabs are not insects; the compound-eyes card talks about insects
    expect(en(scienceFor("eyes", "compound_eyes").animals)).not.toMatch(
      /crab|spider|shrimp|lobster/i,
    );
    // gills fail in air because it is DRY, not because it lacks oxygen
    const gillsAir = en(whyFor("nose", "gills", "air")!);
    expect(gillsAir).toMatch(/dry/i);
    expect(gillsAir).not.toMatch(/nothing to breathe|thin (dry )?air/i);
    // no regional vulgarity in the Spanish animal lists
    expect(scienceFor("eyes", "wide_set_eyes").animals.es).not.toMatch(
      /chocha/i,
    );
    // a bar reading 30 is not "nothing"
    expect(en(scienceFor("nose", "nose_lungs").more)).not.toMatch(
      /smells nothing\./,
    );
    expect(scienceFor("nose", "nose_lungs").more.es).not.toMatch(
      /y no huele nada\./,
    );
    // disruptive-coloration examples are disruptive, not aposematic or debated
    expect(en(scienceFor("pattern", "stripes").animals)).not.toMatch(
      /clownfish|skunk|coral snake/i,
    );
  });

  it("fourth-pass corrections stay corrected (B1–B4, polish)", () => {
    expect(en(scienceFor("nose", "gills").animals)).not.toMatch(/^fish,/i);
    expect(en(scienceFor("movement", "fins").animals)).not.toMatch(/^fish,/i);
    expect(en(scienceFor("ears", "jaw_vibration").animals)).not.toMatch(
      /elephant|lizard/i,
    );
    expect(en(scienceFor("ears", "hidden_ears").animals)).not.toMatch(
      /lizard/i,
    );
    expect(en(scienceFor("covering", "hard_shell").animals)).not.toMatch(
      /armadillo/i,
    );
    expect(en(scienceFor("pattern", "stripes").where)).not.toMatch(/coral/i);
    expect(en(scienceFor("pattern", "spots").where)).not.toMatch(/river/i);
    expect(en(scienceFor("movement", "wings").evolved)).not.toMatch(
      /arms became wings/i,
    );
    expect(en(scienceFor("eyes", "compound_eyes").animals)).not.toMatch(
      /grasshopper/i,
    );
    for (const category of CATEGORIES)
      for (const id of TRAIT_OPTIONS[category]) {
        const card = scienceFor(category, id);
        for (const part of [
          "what",
          "usedFor",
          "evolved",
          "animals",
          "where",
          "affects",
          "more",
        ] as const)
          expect(card[part].es, `${category}.${id}.${part}`).not.toMatch(
            /\bbichos?\b|\bchochas?\b|\bmariquitas?\b/i,
          );
      }
    expect(NAME_ADJECTIVE_LABEL.gentle.es).not.toBe("Gentil");
    expect(NAME_NOUN_LABEL.roamer.es).not.toBe("Vagabundo");
  });

  it("no animal is the exemplar of two sibling options in the same picker (structural)", () => {
    const names = (l: Localized) =>
      l.en
        .replace(/\.$/, "")
        .replace(/^all birds:\s*/i, "")
        .split(/,|\band\b|—/)
        .map((s) =>
          s
            .trim()
            .toLowerCase()
            .replace(/^(some|many|most|all)\s+/, ""),
        )
        .filter(Boolean);
    const check = (label: string, lists: [string, Localized][]) => {
      const seen = new Map<string, string>();
      for (const [option, animals] of lists)
        for (const animal of names(animals)) {
          const prior = seen.get(animal);
          expect(
            prior,
            `${label}: "${animal}" appears on both ${prior} and ${option}`,
          ).toBeUndefined();
          seen.set(animal, option);
        }
    };
    for (const category of CATEGORIES)
      check(
        category,
        TRAIT_OPTIONS[category].map((id) => [
          id,
          scienceFor(category, id).animals,
        ]),
      );
    check(
      "pattern",
      PATTERNS.map((id) => [id, scienceFor("pattern", id).animals]),
    );
  });

  it("a card that teaches insect anatomy lists only insects, and no list opens with a group noun followed by its own members", () => {
    const INSECTS =
      /^(dragonflies|flies|bees|wasps|hoverflies|beetles|grasshoppers|caterpillars|ants|butterflies|moths|crickets|mosquitoes)$/;
    for (const [category, id] of [
      ["eyes", "compound_eyes"],
      ["nose", "spiracles"],
    ] as const)
      for (const animal of en(scienceFor(category, id).animals)
        .replace(/\.$/, "")
        .split(/,\s*/))
        expect(animal.trim().toLowerCase(), `${category}.${id}`).toMatch(
          INSECTS,
        );
    for (const category of CATEGORIES)
      for (const id of TRAIT_OPTIONS[category])
        expect(en(scienceFor(category, id).animals)).not.toMatch(
          /^(fish|birds|insects|mammals|reptiles|amphibians),/i,
        );
  });

  it("evolution is told as differential survival, never use-and-disuse (finding 21)", () => {
    for (const category of CATEGORIES)
      for (const id of TRAIT_OPTIONS[category]) {
        const line = en(scienceFor(category, id).evolved);
        expect(line, `${category}.${id}.evolved`).not.toMatch(
          /slowly lost|because they (stopped|didn't) us/i,
        );
      }
    expect(en(scienceFor("eyes", "no_eyes").evolved)).toMatch(/generations/);
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

  it("recipeKey is stable, order-independent, and changes for EVERY field", () => {
    const a = good();
    const b = { ...good(), traits: { ...good().traits } };
    expect(recipeKey(a)).toBe(recipeKey(b));
    const variants: BuddyRecipe[] = [
      { ...good(), biome: "fire" },
      { ...good(), traits: { ...good().traits, eyes: "no_eyes" } },
      { ...good(), traits: { ...good().traits, ears: "pinna" } },
      { ...good(), traits: { ...good().traits, nose: "spiracles" } },
      { ...good(), traits: { ...good().traits, movement: "wings" } },
      { ...good(), traits: { ...good().traits, covering: "feathers" } },
      { ...good(), pattern: "stripes" },
      { ...good(), name: { adjective: "brave", noun: "splasher" } },
      { ...good(), name: { adjective: "swift", noun: "digger" } },
    ];
    const keys = new Set(variants.map(recipeKey));
    expect(keys.size).toBe(variants.length);
    expect(keys.has(recipeKey(a))).toBe(false);
  });

  it("cloneRecipe never aliases", () => {
    const a = good();
    const clone = cloneRecipe(a);
    expect(clone).toEqual(a);
    expect(clone).not.toBe(a);
    expect(clone.traits).not.toBe(a.traits);
    expect(clone.name).not.toBe(a.name);
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
    const starterStats = computeStats({
      biome: "earth",
      traits: STARTER_TRAITS,
    });
    const nowStats = computeStats(current);
    expect(summary.before).toEqual(starterStats);
    expect(summary.after).toEqual(nowStats);
    // exactly the stats that differ, in display order, each attributed to eyes
    const moved = STATS.filter((s) => starterStats[s] !== nowStats[s]);
    expect(moved.length).toBeGreaterThan(0);
    expect(summary.changes.map((c) => c.stat)).toEqual(moved);
    for (const change of summary.changes) {
      expect(change.before).toBe(starterStats[change.stat]);
      expect(change.after).toBe(nowStats[change.stat]);
      expect(change.delta).toBe(
        nowStats[change.stat] - starterStats[change.stat],
      );
      expect(change.changedContributions.map((c) => c.category)).toEqual([
        "eyes",
      ]);
    }
    // the eyeless Buddy's Sight goes DOWN (finding 7): never up in any biome
    for (const biome of BIOMES) {
      const r = starterRecipe(biome);
      r.traits.eyes = "no_eyes";
      expect(computeStats(r).sight).toBeLessThan(
        computeStats({ biome, traits: STARTER_TRAITS }).sight,
      );
    }
  });

  it("attribution is exact: a single swapped part is the only part blamed, for every swap in every biome", () => {
    let checked = 0;
    for (const biome of BIOMES) {
      const base = starterRecipe(biome);
      for (const category of CATEGORIES)
        for (const option of TRAIT_OPTIONS[category]) {
          if (base.traits[category] === option) continue;
          const next: BuddyRecipe = {
            ...base,
            traits: { ...base.traits, [category]: option },
          };
          const summary = diffBuilds(base, next);
          for (const change of summary.changes) {
            checked++;
            expect(
              change.changedContributions.map((c) => c.category),
              `${biome} ${category}→${option} ${change.stat}`,
            ).toEqual([category]);
            expect(change.changedContributions[0].option).toBe(option);
          }
        }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("attribution is exact: two swapped parts are each blamed only for the bars they moved", () => {
    const prev = starterRecipe("earth");
    const next = starterRecipe("earth");
    next.traits.eyes = "compound_eyes"; // sight and agility
    next.traits.covering = "hard_shell"; // agility only
    const summary = diffBuilds(prev, next);
    const sight = summary.changes.find((c) => c.stat === "sight");
    const agility = summary.changes.find((c) => c.stat === "agility");
    expect(sight?.changedContributions.map((c) => c.category)).toEqual([
      "eyes",
    ]);
    expect(agility?.changedContributions.map((c) => c.category).sort()).toEqual(
      ["covering", "eyes"],
    );
  });

  it("attribution is exact: a home change blames only parts whose modifier differs between the two homes", () => {
    const summary = diffBuilds(starterRecipe("earth"), starterRecipe("water"));
    expect(summary.changes.length).toBeGreaterThan(0);
    for (const change of summary.changes) {
      expect(change.changedContributions.length).toBeGreaterThan(0);
      for (const row of change.changedContributions) {
        const def = (TRAITS[row.category] as Record<string, TraitOption>)[
          row.option
        ];
        expect(def.biomeMod.earth[change.stat] ?? 0).not.toBe(
          def.biomeMod.water[change.stat] ?? 0,
        );
      }
    }
  });

  it("a part swap that moves no bar is reported as changes=[] with unchanged=false (the UI shows a 'nothing moved' card, not a dead end)", () => {
    const prev = starterRecipe("earth"); // short_fur
    const next = starterRecipe("earth");
    next.traits.covering = "smooth_scales"; // same agility in earth
    const summary = diffBuilds(prev, next);
    expect(summary.unchanged).toBe(false);
    expect(summary.changes).toEqual([]);
    expect(summary.before).toEqual(summary.after);
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
