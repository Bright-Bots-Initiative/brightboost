/**
 * #842 — the seeded surprise picker.
 *
 * Design principle 9: "Learning-state randomness is purposeful, seeded,
 * replayable, and versioned — the same seed and settings replay the same
 * experience, and tests can pin it." Accessibility contract §5 adds: "no
 * nondeterministic assertions".
 *
 * Nothing here calls `Math.random`. Every case pins a seed.
 */
import { describe, it, expect } from "vitest";
import {
  composeSurpriseSeed,
  createSeededRng,
  hashString,
  pickSeeded,
  seededOrder,
  type SurpriseSeedParts,
} from "@/lib/seededRng";

const PARTS: SurpriseSeedParts = {
  userId: "student-7",
  dateBucket: "2026-09-03",
  rerollCount: 0,
};

const POOL = ["alpha", "bravo", "charlie", "delta", "echo"] as const;

describe("hashString / createSeededRng", () => {
  it("is a pure function of the seed", () => {
    expect(hashString("student-7|2026-09-03|0")).toBe(
      hashString("student-7|2026-09-03|0"),
    );
    expect(hashString("a")).not.toBe(hashString("b"));
  });

  it("produces the identical sequence for the identical seed", () => {
    const a = createSeededRng("seed-x");
    const b = createSeededRng("seed-x");
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produces values in [0, 1)", () => {
    const rng = createSeededRng("bounds");
    for (let i = 0; i < 500; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("does not freeze on a seed that hashes near the xorshift dead state", () => {
    // xorshift32's one dead state is 0. The guard in createSeededRng means no
    // seed can produce a constant stream.
    const rng = createSeededRng("");
    const values = new Set([rng(), rng(), rng(), rng()]);
    expect(values.size).toBeGreaterThan(1);
  });
});

describe("composeSurpriseSeed", () => {
  it("distinguishes learner and day", () => {
    const base = composeSurpriseSeed(PARTS);
    expect(composeSurpriseSeed({ ...PARTS, userId: "student-8" })).not.toBe(
      base,
    );
    expect(
      composeSurpriseSeed({ ...PARTS, dateBucket: "2026-09-04" }),
    ).not.toBe(base);
  });

  it("excludes the reroll count — it is a cursor, not a seed", () => {
    expect(composeSurpriseSeed({ ...PARTS, rerollCount: 7 })).toBe(
      composeSurpriseSeed(PARTS),
    );
  });
});

describe("seededOrder", () => {
  it("is a true permutation — every index exactly once", () => {
    for (const n of [1, 2, 3, 5, 11, 40]) {
      const order = seededOrder(n, "seed-p");
      expect(order).toHaveLength(n);
      expect([...order].sort((a, b) => a - b)).toEqual(
        Array.from({ length: n }, (_, i) => i),
      );
    }
  });

  it("is deterministic for a seed and varies across seeds", () => {
    expect(seededOrder(8, "a")).toEqual(seededOrder(8, "a"));
    const distinct = new Set(
      ["a", "b", "c", "d", "e", "f"].map((s) => seededOrder(8, s).join(",")),
    );
    expect(distinct.size).toBeGreaterThan(1);
  });

  it("handles degenerate lengths", () => {
    expect(seededOrder(0, "s")).toEqual([]);
    expect(seededOrder(1, "s")).toEqual([0]);
  });
});

describe("pickSeeded", () => {
  it("returns the same item for the same seed and pool (run twice)", () => {
    const first = pickSeeded(POOL, PARTS);
    const second = pickSeeded(POOL, PARTS);
    expect(first).toBe(second);
    expect(first).not.toBeNull();
  });

  it("is stable across a fresh pool array with equal contents", () => {
    // A re-render rebuilds the array; the disclosure the learner is reading
    // must not change under them.
    expect(pickSeeded([...POOL], PARTS)).toBe(pickSeeded([...POOL], PARTS));
  });

  it("returns null for an empty pool — never a fallback pick, never a throw", () => {
    expect(pickSeeded([], PARTS)).toBeNull();
    expect(pickSeeded([], { ...PARTS, rerollCount: 99 })).toBeNull();
  });

  it("can never return anything outside the pool", () => {
    // Falsification: object identity, so a fabricated or index-shifted result
    // cannot pass. If pickSeeded read from anywhere but `pool`, this fails.
    const objects = POOL.map((name) => ({ name }));
    for (let reroll = 0; reroll < 200; reroll++) {
      for (const userId of ["a", "bb", "ccc", "student-7"]) {
        const chosen = pickSeeded(objects, {
          ...PARTS,
          userId,
          rerollCount: reroll,
        });
        expect(objects).toContain(chosen);
      }
    }
  });

  it("honours a shrinking pool — a removed item can never be chosen", () => {
    // The pool is the caller's (the eligibility resolver's) answer. Anything
    // it drops is unreachable here, which is what makes "no random selection
    // from the raw registry" structurally true rather than a promise.
    const narrowed = ["bravo"];
    for (let reroll = 0; reroll < 100; reroll++) {
      expect(pickSeeded(narrowed, { ...PARTS, rerollCount: reroll })).toBe(
        "bravo",
      );
    }
  });

  it("always changes the pick on a reroll — 'show me a different one' means it", () => {
    // The property the independent-draw version silently failed: with a pool
    // of four it could return the same destination seven presses running.
    for (const size of [2, 3, 4, 5, 9]) {
      const pool = Array.from({ length: size }, (_, i) => `item-${i}`);
      for (const userId of ["student-7", "student-8", "a", "zzzz"]) {
        for (let reroll = 0; reroll < size * 3; reroll++) {
          const here = pickSeeded(pool, {
            ...PARTS,
            userId,
            rerollCount: reroll,
          });
          const next = pickSeeded(pool, {
            ...PARTS,
            userId,
            rerollCount: reroll + 1,
          });
          expect(next).not.toBe(here);
        }
      }
    }
  });

  it("shows every destination before repeating any", () => {
    const seen = new Set<string | null>();
    for (let reroll = 0; reroll < POOL.length; reroll++) {
      seen.add(pickSeeded(POOL, { ...PARTS, rerollCount: reroll }));
    }
    expect(seen.size).toBe(POOL.length);
  });

  it("cycles rather than dead-ending after the pool is exhausted", () => {
    expect(pickSeeded(POOL, { ...PARTS, rerollCount: POOL.length })).toBe(
      pickSeeded(POOL, { ...PARTS, rerollCount: 0 }),
    );
  });

  it("normalizes a negative or non-integer reroll count", () => {
    const base = pickSeeded(POOL, { ...PARTS, rerollCount: 0 });
    expect(pickSeeded(POOL, { ...PARTS, rerollCount: -3 })).toBe(base);
    expect(pickSeeded(POOL, { ...PARTS, rerollCount: Number.NaN })).toBe(base);
    expect(pickSeeded(POOL, { ...PARTS, rerollCount: 2.9 })).toBe(
      pickSeeded(POOL, { ...PARTS, rerollCount: 2 }),
    );
  });

  it("gives different learners independent picks", () => {
    const picks = new Set<string | null>();
    for (const userId of ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"]) {
      picks.add(pickSeeded(POOL, { ...PARTS, userId }));
    }
    expect(picks.size).toBeGreaterThan(1);
  });

  it("tolerates a non-array pool without throwing", () => {
    expect(pickSeeded(undefined as unknown as string[], PARTS)).toBeNull();
    expect(pickSeeded(null as unknown as string[], PARTS)).toBeNull();
  });
});
