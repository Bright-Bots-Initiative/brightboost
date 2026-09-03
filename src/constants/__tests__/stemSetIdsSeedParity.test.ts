/**
 * #855 root-cause guard.
 *
 * The defect was not "two lists disagree" in the abstract — it was that a
 * required set ID (`set3-game-1`, `set3-game-3`) corresponded to no seeded
 * activity at all, so the gate that required it could never open. Nothing
 * checked that, because the list and the seed live in different trees.
 *
 * This test closes the loop: every canonical set ID that is NOT declared a
 * placeholder must exist as a seeded `activityId`, and every declared
 * placeholder must NOT be seeded (that is what makes Set 3 deliberately
 * unsatisfiable — see STEM_SET_3_PLACEHOLDER_IDS).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  STEM_SET_1_IDS,
  STEM_SET_2_IDS,
  STEM_SET_3_IDS,
  STEM_SET_3_PLACEHOLDER_IDS,
} from "@shared/progression/stemSetIds";

// Dual seed trees (docs/agents/rules/30-database.md) — both must agree.
const SEED_FILES = [
  path.resolve(process.cwd(), "prisma/seed.cjs"),
  path.resolve(process.cwd(), "backend/prisma/seed.cjs"),
];

function seededActivityIds(seedPath: string): Set<string> {
  const source = readFileSync(seedPath, "utf8");
  const ids = new Set<string>();
  const pattern = /activityId:\s*"([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) ids.add(match[1]);
  return ids;
}

const CANONICAL_IDS = [
  ...STEM_SET_1_IDS,
  ...STEM_SET_2_IDS,
  ...STEM_SET_3_IDS,
] as readonly string[];

const PLACEHOLDERS = STEM_SET_3_PLACEHOLDER_IDS as readonly string[];
const REQUIRED_REAL_IDS = CANONICAL_IDS.filter(
  (id) => !PLACEHOLDERS.includes(id),
);

describe.each(SEED_FILES)("canonical set IDs vs %s", (seedPath) => {
  const seeded = seededActivityIds(seedPath);

  it("parses a non-trivial set of seeded activity IDs", () => {
    // Guard the guard: a regex that matched nothing would make every
    // assertion below vacuous.
    expect(seeded.size).toBeGreaterThanOrEqual(REQUIRED_REAL_IDS.length);
  });

  it("seeds every non-placeholder canonical set activity", () => {
    const missing = REQUIRED_REAL_IDS.filter((id) => !seeded.has(id));
    expect(missing).toEqual([]);
  });

  it("seeds none of the reserved Set 3 placeholder slots", () => {
    const seededPlaceholders = PLACEHOLDERS.filter((id) => seeded.has(id));
    expect(seededPlaceholders).toEqual([]);
  });
});

describe("Set 3 placeholder declaration", () => {
  it("lists only IDs that are actually in Set 3", () => {
    const stray = PLACEHOLDERS.filter(
      (id) => !(STEM_SET_3_IDS as readonly string[]).includes(id),
    );
    expect(stray).toEqual([]);
  });

  it("does not include the legacy fake IDs that never existed", () => {
    expect(CANONICAL_IDS).not.toContain("set3-game-1");
    expect(CANONICAL_IDS).not.toContain("set3-game-3");
  });
});
