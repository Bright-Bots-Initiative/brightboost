/** Stable, curated choices. The saved word IDs can be read in another language. */
const words = {
  "a1.brave": { en: "Brave", es: "valiente" },
  "a1.little": { en: "Little", es: "pequeña" },
  "a1.clever": { en: "Clever", es: "ingeniosa" },
  "a1.curious": { en: "Curious", es: "curiosa" },
  "a2.copper": { en: "Copper", es: "de cobre" },
  "a2.sun": { en: "Sun", es: "del sol" },
  "a2.moon": { en: "Moon", es: "de la luna" },
  "a2.star": { en: "Star", es: "de las estrellas" },
  "n.forge": { en: "Forge", es: "Fragua" },
  "n.machine": { en: "Machine", es: "Máquina" },
  "n.wheel": { en: "Wheel", es: "Rueda" },
  "n.spark": { en: "Spark", es: "Chispa" },
} as const;

type WordId = keyof typeof words;
export interface StudioNameSeed {
  adj1: Extract<WordId, `a1.${string}`>;
  adj2: Extract<WordId, `a2.${string}`>;
  noun: Extract<WordId, `n.${string}`>;
  poolLocale: "en" | "es";
}

interface Pool {
  adj1: StudioNameSeed["adj1"][];
  adj2: StudioNameSeed["adj2"][];
  noun: StudioNameSeed["noun"][];
}
const pools: Record<StudioNameSeed["poolLocale"], Pool> = {
  en: {
    adj1: ["a1.brave", "a1.little", "a1.clever"],
    adj2: ["a2.copper", "a2.sun", "a2.moon"],
    noun: ["n.forge", "n.machine", "n.wheel"],
  },
  es: {
    adj1: ["a1.curious", "a1.little", "a1.brave"],
    adj2: ["a2.star", "a2.moon", "a2.sun"],
    noun: ["n.spark", "n.wheel", "n.machine"],
  },
};

function curatedLocale(language: string): StudioNameSeed["poolLocale"] {
  // Vietnamese and Chinese use the English word pool for this first release.
  return language.toLowerCase().split(/[-_]/)[0] === "es" ? "es" : "en";
}

export function isStudioNameSeed(value: unknown): value is StudioNameSeed {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const v = value as Record<string, unknown>;
  if (v.poolLocale !== "en" && v.poolLocale !== "es") return false;
  const pool = pools[v.poolLocale];
  return (
    Object.keys(v).length === 4 &&
    pool.adj1.some((id) => id === v.adj1) &&
    pool.adj2.some((id) => id === v.adj2) &&
    pool.noun.some((id) => id === v.noun)
  );
}

/** Sample a different entire name on the first draw, even with a constant RNG. */
export function newStudioName(
  language: string,
  previous?: StudioNameSeed,
): StudioNameSeed {
  const poolLocale = curatedLocale(language);
  const pool = pools[poolLocale];
  const choices: StudioNameSeed[] = [];
  for (const adj1 of pool.adj1) {
    for (const adj2 of pool.adj2) {
      for (const noun of pool.noun) {
        if (
          previous?.adj1 !== adj1 ||
          previous.adj2 !== adj2 ||
          previous.noun !== noun
        )
          choices.push({ adj1, adj2, noun, poolLocale });
      }
    }
  }
  return choices[Math.floor(Math.random() * choices.length)];
}

export function renderStudioName(
  seed: StudioNameSeed,
  language: string,
): string {
  const lang = curatedLocale(language);
  const order: WordId[] =
    lang === "es"
      ? [seed.noun, seed.adj1, seed.adj2]
      : [seed.adj1, seed.adj2, seed.noun];
  return order.map((id) => words[id][lang]).join(" ");
}
