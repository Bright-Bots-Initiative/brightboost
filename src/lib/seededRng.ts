/**
 * Deterministic seeded randomness (#842).
 *
 * Design principle 9's platform rule: "Learning-state randomness is purposeful,
 * seeded, replayable, and versioned — the same seed and settings replay the
 * same experience, and tests can pin it." The accessibility contract §5 says
 * the same thing from the other side: every accessible name and announcement
 * derived from a random choice must be deterministic for a fixed seed, so
 * accessibility tests can assert exact strings.
 *
 * The djb2 hash + xorshift32 generator below is **lifted** from
 * `src/services/stem1GradeService.ts` (where it was file-private and used to
 * synthesize demo grades). It is copied here rather than exported from there
 * on purpose: a demo/mock service is not a dependency real navigation policy
 * should acquire, and `stem1GradeService` is free to change or be deleted
 * without breaking the surprise picker. The original copy is left in place;
 * the two are independent by intent, not by accident.
 *
 * This module is pure: no `Math.random`, no `Date.now`, no globals. Callers
 * pass every part of the seed in, which is what makes the picker injectable
 * (issue #842, Part 1: "decide how the optional selection source is injected
 * so tests do not depend on global randomness").
 */

/** djb2 string hash → unsigned 32-bit. */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // unsigned 32-bit
}

/**
 * xorshift32 PRNG seeded from a string. Returns a function producing floats in
 * `[0, 1)`. The same seed always produces the same sequence.
 */
export function createSeededRng(seed: string): () => number {
  let state = hashString(seed);
  // xorshift32 has one dead state: 0 maps to 0 forever. `hashString("")` is
  // 5381 so the empty seed is safe, but a caller-composed seed must never be
  // able to freeze the generator, so normalize it away.
  if (state === 0) state = 0x9e3779b9;
  const step = (): number => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  // Warm-up: discard the first few steps so no consumer ever reads a value
  // that is a single xorshift round away from the raw djb2 hash of its seed.
  //
  // This is hygiene, not a measured distributional improvement — an earlier
  // version of this comment claimed the unwarmed generator clustered for
  // neighbouring seeds, and review measured the opposite. No spread claim is
  // made here, and none belongs here without a measurement to cite. What the
  // warm-up does not change is the only property this module promises: the
  // same seed still yields the same (now offset) sequence.
  for (let i = 0; i < 8; i++) step();
  return step;
}

/**
 * The parts a surprise seed is composed from.
 *
 * Kept as named fields rather than a pre-joined string so the composition rule
 * lives in one place and analytics can report the same parts the pick was made
 * from (#842: descriptive process events, no correctness or reward data).
 */
export interface SurpriseSeedParts {
  /** Stable per-learner value, so two children do not see the same pick. */
  userId: string;
  /**
   * A coarse time bucket (a date string, not a timestamp). Coarse on purpose:
   * the pick must be stable across a re-render, a remount and a page refresh,
   * or the disclosure the learner is reading could change under them.
   */
  dateBucket: string;
  /**
   * How many times the learner has asked for a different pick.
   *
   * A **cursor**, not part of the seed: see `pickSeeded`.
   */
  rerollCount: number;
}

/**
 * The seed the ordering is built from — the learner and the day, and
 * deliberately *not* the reroll count.
 *
 * Exported so tests and analytics agree on it.
 */
export function composeSurpriseSeed(
  parts: Pick<SurpriseSeedParts, "userId" | "dateBucket">,
): string {
  return `${parts.userId}|${parts.dateBucket}`;
}

function normalizeReroll(rerollCount: number): number {
  if (!Number.isFinite(rerollCount)) return 0;
  const truncated = Math.trunc(rerollCount);
  return truncated > 0 ? truncated : 0;
}

/**
 * A deterministic permutation of `[0, length)` for `seed`.
 *
 * Seeded Fisher-Yates. Exported for its own tests: a permutation that ever
 * dropped or repeated an index would let the picker miss part of the pool.
 */
export function seededOrder(length: number, seed: string): number[] {
  const order = Array.from({ length }, (_, i) => i);
  if (length < 2) return order;
  const rng = createSeededRng(seed);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.min(Math.floor(rng() * (i + 1)), i);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Pick one item from `pool` deterministically.
 *
 * **Why a rotation rather than an independent draw.** "Show me a different
 * one" has to actually show a different one. An independent re-draw per reroll
 * repeats itself often — with a pool of four it visibly failed to change at
 * all — which turns a labelled, reversible control into a broken promise and,
 * worse, into something that looks like the surprise is ignoring the learner.
 * So the seed fixes an *order* over the pool and `rerollCount` walks it: every
 * press moves to the next destination, each one is seen before any repeats,
 * and the walk cycles rather than dead-ends.
 *
 * Contract (each clause is pinned by a test in `seededRng.test.ts`):
 * - the same seed parts and the same pool always yield the same item;
 * - the result is always an element **of `pool`** — never a fabricated or
 *   out-of-pool destination (this is the anti-goal "no random selection from
 *   the raw registry": the caller owns the pool, this function cannot widen it);
 * - an empty pool yields `null`, never a throw and never a fallback pick;
 * - for a pool of more than one, consecutive `rerollCount`s always differ.
 */
export function pickSeeded<T>(
  pool: readonly T[],
  parts: SurpriseSeedParts,
): T | null {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const order = seededOrder(pool.length, composeSurpriseSeed(parts));
  const cursor = normalizeReroll(parts.rerollCount) % order.length;
  return pool[order[cursor]];
}
