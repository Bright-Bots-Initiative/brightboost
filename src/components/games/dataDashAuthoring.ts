// Phase 0 — Data Dash authored-challenge: shared types, validation, and the
// play-time resolver. A kid authors by STRUCTURED CHOICES ONLY (cards from the
// fixed pool, a sort rule, a hidden rule). The chart question is DERIVED here at
// play time from the data — there is no free-text field, so nothing a kid types
// renders to other kids.
//
// The validation mirrors backend/src/services/dataDashChallenge.ts (the security
// boundary). This copy gives the authoring form instant feedback; the backend
// re-validates on save.

import {
  DATA_DASH_CARDS,
  SORT_RULES,
  type DataCard,
  type SortRuleKey,
} from "./DataDashSortDiscoverGame";

type Attr = "sunlightNeed" | "waterNeed" | "leafType" | "seedType" | "growthSpeed";

export const SORT_RULE_KEYS: SortRuleKey[] = ["sunlightNeed", "waterNeed", "leafType"];

export const INFER_RULE_OPTIONS: Attr[] = [
  "sunlightNeed",
  "waterNeed",
  "leafType",
  "seedType",
  "growthSpeed",
];

export const MIN_CARDS = 4;

// Human labels for the attribute options. These are game-domain content (like
// the English SORT_RULES in the game component, which is not yet i18n'd); the
// authoring form's own chrome IS translated via t().
export const ATTR_LABELS: Record<string, string> = {
  sunlightNeed: "Sunlight need",
  waterNeed: "Water need",
  leafType: "Leaf type",
  seedType: "Seed type",
  growthSpeed: "Growth speed",
};

export interface DataDashChallenge {
  v: 1;
  cardIds: string[];
  sortRule: SortRuleKey;
  inferRule: Attr;
}

export type ChartQuestion = { prompt: string; choices: string[]; answerIndex: number };

// Lazily built so this module can be imported before DataDashSortDiscoverGame
// has finished evaluating. The two modules import from each other (the game
// pulls in resolveChallenge; this file pulls in DATA_DASH_CARDS), so touching
// DATA_DASH_CARDS at module-eval time would read it before initialization.
// Deferring to first call sidesteps that circular-init order entirely.
let _pool: Record<string, DataCard> | null = null;
function pool(): Record<string, DataCard> {
  if (!_pool) {
    _pool = Object.fromEntries(DATA_DASH_CARDS.map((c) => [c.id, c]));
  }
  return _pool;
}

function distinctValues(cards: DataCard[], attr: Attr): number {
  return new Set(cards.map((c) => c[attr])).size;
}

function valueCounts(cards: DataCard[], attr: Attr): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of cards) counts.set(c[attr], (counts.get(c[attr]) ?? 0) + 1);
  return counts;
}

function hasUniqueMax(cards: DataCard[], attr: Attr): boolean {
  const sorted = [...valueCounts(cards, attr).values()].sort((a, b) => b - a);
  return sorted.length >= 1 && (sorted.length === 1 || sorted[0] > sorted[1]);
}

function partitionSignature(cards: DataCard[], attr: Attr): string {
  const groups = new Map<string, string[]>();
  for (const c of cards) {
    const bucket = groups.get(c[attr]) ?? [];
    bucket.push(c.id);
    groups.set(c[attr], bucket);
  }
  return JSON.stringify([...groups.values()].map((ids) => [...ids].sort()).sort());
}

export type ChallengeValidation = { ok: true } | { ok: false; error: string };

/** Same checks as the backend — solvable + unambiguous. */
export function validateDataDashChallenge(
  challenge: Partial<DataDashChallenge> | null | undefined,
): ChallengeValidation {
  if (!challenge || typeof challenge !== "object") {
    return { ok: false, error: "challenge must be an object" };
  }
  if (challenge.v !== 1) return { ok: false, error: "unsupported challenge version" };

  const { cardIds, sortRule, inferRule } = challenge;
  if (!Array.isArray(cardIds)) return { ok: false, error: "cardIds must be an array" };
  if (cardIds.length < MIN_CARDS) return { ok: false, error: `pick at least ${MIN_CARDS} plants` };
  if (new Set(cardIds).size !== cardIds.length) return { ok: false, error: "duplicate plant" };
  if (cardIds.some((id) => !(id in pool()))) return { ok: false, error: "unknown plant" };
  if (!sortRule || !SORT_RULE_KEYS.includes(sortRule)) return { ok: false, error: "invalid sort rule" };
  if (!inferRule || !INFER_RULE_OPTIONS.includes(inferRule)) return { ok: false, error: "invalid hidden rule" };

  const cards = cardIds.map((id) => pool()[id]);

  if (distinctValues(cards, sortRule as Attr) < 2)
    return { ok: false, error: "all plants share the same sort value — pick a rule that splits them" };
  if (!hasUniqueMax(cards, sortRule as Attr))
    return { ok: false, error: "the sort groups tie — the chart question would have no single answer" };
  if (distinctValues(cards, inferRule) < 2)
    return { ok: false, error: "the hidden rule does not group these plants" };

  const inferSig = partitionSignature(cards, inferRule);
  for (const other of INFER_RULE_OPTIONS) {
    if (other === inferRule) continue;
    if (partitionSignature(cards, other) === inferSig)
      return { ok: false, error: "another attribute groups the plants the same way — pick a different hidden rule" };
  }
  return { ok: true };
}

/** Derive the (templated, no free-text) chart question from the data. */
export function buildDerivedChartQuestion(cards: DataCard[], sortRule: SortRuleKey): ChartQuestion {
  const values = SORT_RULES[sortRule].values;
  const counts = valueCounts(cards, sortRule as Attr);
  let answerIndex = 0;
  let best = -1;
  values.forEach((v, i) => {
    const n = counts.get(v) ?? 0;
    if (n > best) {
      best = n;
      answerIndex = i;
    }
  });
  return {
    prompt: `Which "${SORT_RULES[sortRule].label}" group has the most plants?`,
    choices: values,
    answerIndex,
  };
}

export interface ResolvedChallenge {
  cards: DataCard[];
  sortRule: SortRuleKey;
  inferRule: Attr;
  inferOptions: string[];
  chartQuestions: ChartQuestion[];
}

// Default (unauthored) challenge — preserves the game's original behavior.
// A function (not a const) so it reads DATA_DASH_CARDS at call time, after both
// modules in the import cycle have finished evaluating. See pool() above.
function defaultResolved(): ResolvedChallenge {
  return {
    cards: DATA_DASH_CARDS,
    sortRule: "sunlightNeed",
    inferRule: "seedType",
    inferOptions: ["sunlightNeed", "waterNeed", "seedType", "growthSpeed"],
    chartQuestions: [
    {
      prompt: "Which claim is best supported by the chart?",
      choices: ["Most plants need full sunlight.", "Most plants need shade.", "All plants need partial sunlight."],
      answerIndex: 0,
    },
    {
      prompt: "What evidence best supports your claim?",
      choices: ["The full-sun bar is tallest.", "Fern has frond leaves.", "Plant bed A has three cards."],
      answerIndex: 0,
    },
    ],
  };
}

/**
 * Resolve a (possibly authored) challenge from a game config into the data the
 * playfield renders. Falls back to the original hardcoded challenge when no
 * valid `challenge` is present — so the seeded Data Dash activity is unchanged.
 */
export function resolveChallenge(config: unknown): ResolvedChallenge {
  const challenge = (config as { challenge?: unknown } | null)?.challenge as
    | DataDashChallenge
    | undefined;
  if (!challenge || !validateDataDashChallenge(challenge).ok) {
    return defaultResolved();
  }
  const cards = challenge.cardIds.map((id) => pool()[id]);
  return {
    cards,
    sortRule: challenge.sortRule,
    inferRule: challenge.inferRule,
    inferOptions: INFER_RULE_OPTIONS,
    chartQuestions: [buildDerivedChartQuestion(cards, challenge.sortRule)],
  };
}
