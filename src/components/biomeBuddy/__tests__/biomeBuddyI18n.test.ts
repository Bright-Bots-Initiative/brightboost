/**
 * i18n parity (review finding 15): every `biomeBuddy.*` key a component
 * references must exist in BOTH en and es, the two trees must have the same
 * shape, and the content tables must be genuinely translated — not just
 * present. Component tests mock `t()` to its defaultValue, so without this
 * file the locale JSON could be deleted wholesale and every test stay green.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import en from "../../../locales/en/common.json";
import es from "../../../locales/es/common.json";
import {
  BIOME_INFO,
  CATEGORY_LABEL,
  NAME_ADJECTIVE_LABEL,
  NAME_NOUN_LABEL,
  PATTERN_SCIENCE,
  SCIENCE,
  STAT_LABEL,
  WHY,
  WONDER_POOL,
  type Localized,
} from "../biomeBuddyContent";
import {
  BIOMES,
  CATEGORIES,
  PATTERNS,
  TRAIT_OPTIONS,
} from "../biomeBuddyModel";

type Tree = { [key: string]: string | Tree };

const enTree = (en as { biomeBuddy: Tree }).biomeBuddy;
const esTree = (es as { biomeBuddy: Tree }).biomeBuddy;

function leaves(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string"
      ? [`${prefix}${key}`]
      : leaves(value, `${prefix}${key}.`),
  );
}

function get(tree: Tree, dotted: string): string | undefined {
  let node: string | Tree | undefined = tree;
  for (const part of dotted.split(".")) {
    if (!node || typeof node === "string") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** Every static `t("biomeBuddy.…")` key across the feature's source files,
 *  plus the dynamic template families expanded from their closed enums. */
function referencedKeys(): string[] {
  const roots = [
    path.resolve(__dirname, ".."),
    path.resolve(__dirname, "../../../pages"),
  ];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "__tests__") walk(full);
      } else if (
        /\.tsx?$/.test(entry.name) &&
        /BiomeBuddy|biomeBuddy|screens|StatBars|ScienceCard|ShareButton|ProgressDots|Overlay/.test(
          full,
        )
      ) {
        files.push(full);
      }
    }
  };
  for (const root of roots) walk(root);
  const keys = new Set<string>();
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(
      /t\(\s*"biomeBuddy\.([A-Za-z0-9_.]+)"/g,
    ))
      keys.add(match[1]);
    for (const match of source.matchAll(
      /t\(\s*`biomeBuddy\.([A-Za-z0-9_.]+)\.\$\{/g,
    )) {
      const family = match[1];
      const members: Record<string, readonly string[]> = {
        steps: ["choose", "create", "test", "name"],
        "title.band": ["k2", "g35", "g68"],
        "stat.band": ["low", "some", "good", "great"],
        science: ["usedFor", "evolved", "animals", "where", "affects"],
      };
      for (const member of members[family] ?? [])
        keys.add(`${family}.${member}`);
    }
  }
  expect(files.length).toBeGreaterThan(10);
  return [...keys].sort();
}

describe("biomeBuddy.* locale parity", () => {
  it("en and es carry identical key trees", () => {
    expect(leaves(esTree).sort()).toEqual(leaves(enTree).sort());
    expect(leaves(enTree).length).toBeGreaterThan(100);
  });

  it("every key a component references exists in en AND es", () => {
    const keys = referencedKeys();
    expect(keys.length).toBeGreaterThan(80);
    const missingEn = keys.filter((k) => get(enTree, k) === undefined);
    const missingEs = keys.filter((k) => get(esTree, k) === undefined);
    expect(missingEn).toEqual([]);
    expect(missingEs).toEqual([]);
  });

  it("every referenced key is translated, not copied (except proper nouns / interpolation-only strings)", () => {
    const allowedSame = new Set([
      "shell.title",
      "share.title",
      "create.pickAria",
      "steps.aria",
      "test.page",
    ]);
    const same = referencedKeys().filter(
      (k) => !allowedSame.has(k) && get(enTree, k) === get(esTree, k),
    );
    expect(same).toEqual([]);
  });

  it("no en/es key is left with a stale {{biome}} where the localized phrase belongs", () => {
    for (const tree of [enTree, esTree])
      for (const key of [
        "create.statsHeading",
        "science.effect",
        "science.noEffect",
        "test.heading",
        "test.whyIntro",
        "sharePage.stats",
        "sharePage.why",
      ])
        expect(get(tree, key), key).toMatch(/\{\{where\}\}/);
  });

  it("interpolation placeholders match between en and es for every key", () => {
    for (const key of leaves(enTree)) {
      const ph = (s: string | undefined) =>
        [...(s ?? "").matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
      expect(ph(get(esTree, key)), key).toEqual(ph(get(enTree, key)));
    }
  });
});

describe("content tables are translated", () => {
  const translated = (l: Localized, label: string) => {
    expect(l.en.trim().length, `${label}.en`).toBeGreaterThan(0);
    expect(l.es.trim().length, `${label}.es`).toBeGreaterThan(0);
    expect(l.en.trim().toLowerCase(), `${label} es==en`).not.toBe(
      l.es.trim().toLowerCase(),
    );
  };

  it("labels, biomes, stats, name kit and wonder prompts differ between en and es", () => {
    for (const stat of Object.keys(STAT_LABEL) as (keyof typeof STAT_LABEL)[])
      translated(STAT_LABEL[stat], `stat.${stat}`);
    for (const key of Object.keys(
      CATEGORY_LABEL,
    ) as (keyof typeof CATEGORY_LABEL)[])
      translated(CATEGORY_LABEL[key], `category.${key}`);
    for (const biome of BIOMES) {
      translated(BIOME_INFO[biome].label, `${biome}.label`);
      translated(BIOME_INFO[biome].subtitle, `${biome}.subtitle`);
      translated(BIOME_INFO[biome].inPhrase, `${biome}.inPhrase`);
      translated(BIOME_INFO[biome].description, `${biome}.description`);
      translated(BIOME_INFO[biome].fauna, `${biome}.fauna`);
      expect(BIOME_INFO[biome].inPhrase.es).toMatch(/^en (el|la) /);
      expect(BIOME_INFO[biome].inPhrase.en).toMatch(/^in the /);
    }
    for (const [id, l] of Object.entries(NAME_ADJECTIVE_LABEL)) {
      expect(l.en).not.toBe(id);
      expect(l.es).not.toBe(id);
    }
    for (const [id, l] of Object.entries(NAME_NOUN_LABEL)) {
      expect(l.en).not.toBe(id);
      expect(l.es).not.toBe(id);
    }
    // invented creature words may legitimately coincide; real adjectives may not
    for (const l of Object.values(NAME_ADJECTIVE_LABEL))
      translated(l, "adjective");
    for (const w of WONDER_POOL) translated(w, "wonder");
  });

  it("every science card part and every why-line differ between en and es", () => {
    const parts = [
      "label",
      "term",
      "what",
      "usedFor",
      "evolved",
      "animals",
      "where",
      "affects",
      "more",
    ] as const;
    for (const category of CATEGORIES)
      for (const option of TRAIT_OPTIONS[category]) {
        const card = (
          SCIENCE[category] as Record<
            string,
            Record<(typeof parts)[number], Localized>
          >
        )[option];
        for (const part of parts)
          if (part !== "term")
            translated(card[part], `${category}.${option}.${part}`);
      }
    for (const pattern of PATTERNS)
      for (const part of parts)
        if (part !== "term")
          translated(
            PATTERN_SCIENCE[pattern][part],
            `pattern.${pattern}.${part}`,
          );
    for (const category of CATEGORIES) {
      const table = WHY[category] as Record<string, Record<string, Localized>>;
      for (const [option, byBiome] of Object.entries(table))
        for (const [biome, line] of Object.entries(byBiome))
          translated(line, `why.${category}.${option}.${biome}`);
    }
  });
});
