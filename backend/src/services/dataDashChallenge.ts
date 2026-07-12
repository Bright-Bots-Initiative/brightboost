// Phase 0 — Data Dash authored-challenge validation (server-authoritative).
//
// A kid authors a challenge by STRUCTURED CHOICES ONLY (which cards from a fixed
// pool, which sort rule, which hidden rule). There is NO free-text field that
// renders to other kids — the chart question is DERIVED from the data at play
// time. So the only thing to validate here is that the challenge is *solvable*
// and *unambiguous*; there is no content to moderate.
//
// This mirrors the front-end author-time check in
// src/components/games/dataDashAuthoring.ts, but the BACKEND copy is the
// security boundary: never trust the client. The card pool below is copied from
// DATA_DASH_CARDS in src/components/games/DataDashSortDiscoverGame.tsx and must
// stay in sync with it (ids + attribute values). Only the attributes used for
// validation are duplicated here (display name/plantBed live on the frontend).

import type { ContentValidation } from "./creationContent";

type Attr =
  | "sunlightNeed"
  | "waterNeed"
  | "leafType"
  | "seedType"
  | "growthSpeed";

// Phase A sort rules a kid may pick (must mirror SORT_RULES on the frontend).
export const SORT_RULE_KEYS = [
  "sunlightNeed",
  "waterNeed",
  "leafType",
] as const;

// Phase B hidden-rule options (and the decoys shown alongside the answer).
export const INFER_RULE_OPTIONS = [
  "sunlightNeed",
  "waterNeed",
  "leafType",
  "seedType",
  "growthSpeed",
] as const;

export const MIN_CARDS = 4;

// id → attribute map. COPY of DATA_DASH_CARDS (kept in sync with the frontend).
export const DATA_DASH_POOL: Record<string, Record<Attr, string>> = {
  bean: { sunlightNeed: "full", waterNeed: "medium", leafType: "broad", seedType: "pod", growthSpeed: "fast" },
  fern: { sunlightNeed: "shade", waterNeed: "high", leafType: "frond", seedType: "spore", growthSpeed: "medium" },
  pine: { sunlightNeed: "full", waterNeed: "low", leafType: "needle", seedType: "cone", growthSpeed: "slow" },
  pea: { sunlightNeed: "full", waterNeed: "medium", leafType: "broad", seedType: "pod", growthSpeed: "fast" },
  moss: { sunlightNeed: "shade", waterNeed: "high", leafType: "frond", seedType: "spore", growthSpeed: "slow" },
  spruce: { sunlightNeed: "partial", waterNeed: "low", leafType: "needle", seedType: "cone", growthSpeed: "medium" },
  sunflower: { sunlightNeed: "full", waterNeed: "medium", leafType: "broad", seedType: "pod", growthSpeed: "fast" },
  hosta: { sunlightNeed: "shade", waterNeed: "high", leafType: "broad", seedType: "pod", growthSpeed: "medium" },
};

export interface DataDashChallenge {
  v: 1;
  cardIds: string[];
  sortRule: (typeof SORT_RULE_KEYS)[number];
  inferRule: (typeof INFER_RULE_OPTIONS)[number];
}

/** Canonical signature of how an attribute partitions a set of cards. */
function partitionSignature(cardIds: string[], attr: Attr): string {
  const groups = new Map<string, string[]>();
  for (const id of cardIds) {
    const value = DATA_DASH_POOL[id][attr];
    const bucket = groups.get(value) ?? [];
    bucket.push(id);
    groups.set(value, bucket);
  }
  // Group by attribute-value -> sorted card ids; then sort the groups so the
  // signature is independent of label/order (we compare grouping shape only).
  return JSON.stringify(
    [...groups.values()].map((ids) => [...ids].sort()).sort(),
  );
}

function distinctValues(cardIds: string[], attr: Attr): number {
  return new Set(cardIds.map((id) => DATA_DASH_POOL[id][attr])).size;
}

/** Does the attribute's value counts have a single strict maximum? */
function hasUniqueMax(cardIds: string[], attr: Attr): boolean {
  const counts = new Map<string, number>();
  for (const id of cardIds) {
    const v = DATA_DASH_POOL[id][attr];
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const sorted = [...counts.values()].sort((a, b) => b - a);
  return sorted.length >= 1 && (sorted.length === 1 || sorted[0] > sorted[1]);
}

/**
 * Validate an authored Data Dash challenge: well-formed, solvable, unambiguous.
 * Returns the shared ContentValidation result so creationContent can surface a
 * specific error to the author.
 */
export function validateDataDashChallenge(content: unknown): ContentValidation {
  const c = content as Partial<DataDashChallenge> | null;
  if (!c || typeof c !== "object") {
    return { ok: false, error: "challenge must be an object" };
  }

  const allowedKeys = new Set(["v", "cardIds", "sortRule", "inferRule"]);
  const extraKeys = Object.keys(c).filter((key) => !allowedKeys.has(key));
  if(extraKeys.length > 0) {
    return { ok: false, error: "unexpected field(s)" };
  }

  if (c.v !== 1) {
    return { ok: false, error: "unsupported challenge version" };
  }

  const { cardIds, sortRule, inferRule } = c;

  if (!Array.isArray(cardIds)) {
    return { ok: false, error: "cardIds must be an array" };
  }
  if (cardIds.length < MIN_CARDS) {
    return { ok: false, error: `pick at least ${MIN_CARDS} plants` };
  }
  if (new Set(cardIds).size !== cardIds.length) {
    return { ok: false, error: "duplicate plant in cardIds" };
  }
  for (const id of cardIds) {
    if (!(id in DATA_DASH_POOL)) {
      return { ok: false, error: `unknown plant: ${id}` };
    }
  }
  if (!sortRule || !(SORT_RULE_KEYS as readonly string[]).includes(sortRule)) {
    return { ok: false, error: "invalid sort rule" };
  }
  if (
    !inferRule ||
    !(INFER_RULE_OPTIONS as readonly string[]).includes(inferRule)
  ) {
    return { ok: false, error: "invalid hidden rule" };
  }

  // Phase A: the sort must actually split the cards (≥2 bins used).
  if (distinctValues(cardIds, sortRule as Attr) < 2) {
    return { ok: false, error: "all plants share the same sort value — pick a rule that splits them" };
  }

  // Chart question (derived "which value is most common") must have ONE answer.
  if (!hasUniqueMax(cardIds, sortRule as Attr)) {
    return { ok: false, error: "the sort groups tie — the chart question would have no single answer" };
  }

  // Phase B: the hidden rule must group the cards (≥2 groups)...
  if (distinctValues(cardIds, inferRule as Attr) < 2) {
    return { ok: false, error: "the hidden rule does not group these plants" };
  }
  // ...and must be DISTINGUISHABLE from every other option (unambiguous answer).
  const inferSig = partitionSignature(cardIds, inferRule as Attr);
  for (const other of INFER_RULE_OPTIONS) {
    if (other === inferRule) continue;
    if (partitionSignature(cardIds, other as Attr) === inferSig) {
      return {
        ok: false,
        error: "another attribute groups the plants the same way — the hidden rule is ambiguous",
      };
    }
  }

  return { ok: true };
}
