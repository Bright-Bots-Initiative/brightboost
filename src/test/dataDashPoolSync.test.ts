import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DATA_DASH_CARDS,
  SORT_RULES,
} from "@/components/games/DataDashSortDiscoverGame";
import {
  DATA_DASH_ATTRS,
  DATA_DASH_POOL,
  SORT_RULE_KEYS,
} from "../../backend/src/services/dataDashChallenge";
import {
  diffPools,
  diffSortRuleKeys,
  formatPoolMismatches,
  formatSortKeyMismatches,
  type PoolCardLike,
  type PoolMismatch,
} from "./dataDashPoolSync";

/** Fixture + production guard loop — always the exported attr list (G-201). */
const FIXTURE_ATTRS = DATA_DASH_ATTRS;

function card(
  id: string,
  overrides: Partial<Record<(typeof FIXTURE_ATTRS)[number], string>> = {},
): PoolCardLike {
  return {
    id,
    sunlightNeed: "full",
    waterNeed: "medium",
    leafType: "broad",
    seedType: "pod",
    growthSpeed: "fast",
    ...overrides,
  };
}

function expectMismatchKinds(
  mismatches: PoolMismatch[],
  kinds: PoolMismatch["kind"][],
) {
  for (const kind of kinds) {
    expect(mismatches.map((m) => m.kind)).toContain(kind);
  }
}

describe("dataDashPoolSync", () => {
  it("P-1: real DATA_DASH_CARDS and DATA_DASH_POOL agree attribute-wise", () => {
    const mismatches = diffPools(
      DATA_DASH_CARDS,
      DATA_DASH_POOL,
      DATA_DASH_ATTRS,
    );
    expect(mismatches, formatPoolMismatches(mismatches)).toEqual([]);
    expect(formatPoolMismatches(mismatches)).toBe("");
  });

  it("E-1 / P-2: fails when a card exists only on the frontend", () => {
    const mismatches = diffPools([card("only-fe")], {}, FIXTURE_ATTRS);
    expect(mismatches).toEqual([
      { kind: "missing-backend", cardId: "only-fe" },
    ]);
    const msg = formatPoolMismatches(mismatches);
    expect(msg).toContain('card "only-fe"');
    expect(msg).toContain("DATA_DASH_CARDS (frontend)");
    expect(msg).toContain("DATA_DASH_POOL");
    expect(msg).toContain("backend/src/services/dataDashChallenge.ts");
    expect(msg).toContain("#679");
  });

  it("E-3 / P-3: fails when a card exists only on the backend", () => {
    const backend = {
      "only-be": {
        sunlightNeed: "full",
        waterNeed: "medium",
        leafType: "broad",
        seedType: "pod",
        growthSpeed: "fast",
      },
    };
    const mismatches = diffPools([], backend, FIXTURE_ATTRS);
    expect(mismatches).toEqual([
      { kind: "missing-frontend", cardId: "only-be" },
    ]);
    const msg = formatPoolMismatches(mismatches);
    expect(msg).toContain('card "only-be"');
    expect(msg).toContain("DATA_DASH_CARDS");
    expect(msg).toContain("#679");
  });

  it("E-2 / P-4 / G-103: attribute mismatch names card, attr, and both values", () => {
    const frontend = [card("bean", { waterNeed: "medium" })];
    const backend = {
      bean: {
        sunlightNeed: "full",
        waterNeed: "low",
        leafType: "broad",
        seedType: "pod",
        growthSpeed: "fast",
      },
    };
    const mismatches = diffPools(frontend, backend, FIXTURE_ATTRS);
    expect(mismatches).toEqual([
      {
        kind: "attr-mismatch",
        cardId: "bean",
        attr: "waterNeed",
        frontend: "medium",
        backend: "low",
      },
    ]);
    const msg = formatPoolMismatches(mismatches);
    expect(msg).toContain('card "bean"');
    expect(msg).toContain('attribute "waterNeed"');
    expect(msg).toContain('"medium"');
    expect(msg).toContain('"low"');
    expect(msg).toContain("#679");
  });

  it("B2-02 / T1-1-04: reports all mismatches at once", () => {
    const frontend = [card("a", { waterNeed: "high" }), card("only-fe")];
    const backend = {
      a: {
        sunlightNeed: "full",
        waterNeed: "low",
        leafType: "broad",
        seedType: "pod",
        growthSpeed: "fast",
      },
      "only-be": {
        sunlightNeed: "full",
        waterNeed: "medium",
        leafType: "broad",
        seedType: "pod",
        growthSpeed: "fast",
      },
    };
    const mismatches = diffPools(frontend, backend, FIXTURE_ATTRS);
    expect(mismatches.length).toBeGreaterThanOrEqual(3);
    expectMismatchKinds(mismatches, [
      "missing-backend",
      "missing-frontend",
      "attr-mismatch",
    ]);
    const msg = formatPoolMismatches(mismatches);
    expect(msg).toContain("only-fe");
    expect(msg).toContain("only-be");
    expect(msg).toContain("waterNeed");
  });

  it("P-5 / E-4: comparison uses the passed attrs list (truncated list skips omitted attr)", () => {
    const frontend = [
      card("bean", { growthSpeed: "fast", waterNeed: "medium" }),
    ];
    const backend = {
      bean: {
        sunlightNeed: "full",
        waterNeed: "medium",
        leafType: "broad",
        seedType: "pod",
        growthSpeed: "slow",
      },
    };
    const withoutGrowth = FIXTURE_ATTRS.filter((a) => a !== "growthSpeed");
    expect(diffPools(frontend, backend, withoutGrowth)).toEqual([]);
    expect(diffPools(frontend, backend, FIXTURE_ATTRS)).toEqual([
      {
        kind: "attr-mismatch",
        cardId: "bean",
        attr: "growthSpeed",
        frontend: "fast",
        backend: "slow",
      },
    ]);
  });

  it("P-5 / E-4: Part B must export DATA_DASH_ATTRS for the production guard loop", async () => {
    const mod = await import("../../backend/src/services/dataDashChallenge");
    expect(
      mod,
      "Export DATA_DASH_ATTRS from dataDashChallenge.ts (additive; Part B)",
    ).toHaveProperty("DATA_DASH_ATTRS");
    const attrs = (mod as { DATA_DASH_ATTRS?: readonly string[] })
      .DATA_DASH_ATTRS;
    expect(attrs).toEqual([...FIXTURE_ATTRS]);
  });

  it("T1-1-06: identical fixtures → zero mismatches", () => {
    const frontend = [card("x")];
    const backend = {
      x: {
        sunlightNeed: "full",
        waterNeed: "medium",
        leafType: "broad",
        seedType: "pod",
        growthSpeed: "fast",
      },
    };
    expect(diffPools(frontend, backend, FIXTURE_ATTRS)).toEqual([]);
  });

  it("T1-1-08: comparison helper is pure — no imports from real pools", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "dataDashPoolSync.ts"), "utf8");
    expect(source).not.toMatch(/DataDashSortDiscoverGame/);
    expect(source).not.toMatch(/dataDashAuthoring/);
    expect(source).not.toMatch(/dataDashChallenge/);
    expect(source).not.toMatch(/DATA_DASH_CARDS/);
    expect(source).not.toMatch(/DATA_DASH_POOL/);
  });

  it("E-9: imports DATA_DASH_CARDS directly (never pool())", () => {
    expect(Array.isArray(DATA_DASH_CARDS)).toBe(true);
    expect(DATA_DASH_CARDS.length).toBeGreaterThan(0);
  });

  it("SORT_RULE_KEYS mirrors Object.keys(SORT_RULES) (handoff §6)", () => {
    const mismatches = diffSortRuleKeys(Object.keys(SORT_RULES), [
      ...SORT_RULE_KEYS,
    ]);
    expect(mismatches).toEqual([]);
    expect(formatSortKeyMismatches(mismatches)).toBe("");
  });

  it("sort-key drift: key only on frontend", () => {
    const mismatches = diffSortRuleKeys(
      ["sunlightNeed", "extra"],
      ["sunlightNeed"],
    );
    expect(mismatches).toEqual([{ kind: "missing-backend", key: "extra" }]);
    const msg = formatSortKeyMismatches(mismatches);
    expect(msg).toContain('key "extra"');
    expect(msg).toContain("#679");
  });

  it("sort-key drift: key only on backend", () => {
    const mismatches = diffSortRuleKeys(
      ["sunlightNeed"],
      ["sunlightNeed", "orphan"],
    );
    expect(mismatches).toEqual([{ kind: "missing-frontend", key: "orphan" }]);
    const msg = formatSortKeyMismatches(mismatches);
    expect(msg).toContain('key "orphan"');
    expect(msg).toContain("#679");
  });
});
