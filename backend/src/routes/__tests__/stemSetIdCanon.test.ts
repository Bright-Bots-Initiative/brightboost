/**
 * #855 — the backend's notion of "Set 3 complete" must be the shared canonical
 * activity-ID list, not a hand-typed copy.
 *
 * Before the fix both routes hardcoded `set3-game-1..5`. Two of those IDs
 * (`set3-game-1`, `set3-game-3`) are seeded by nothing — the real activities
 * are `track-maker` (prisma/seed.cjs) and `echo-avenue` — so the
 * `POST /avatar/select-archetype` gate could never be satisfied and
 * `GET /student/stats` undercounted Set 3 forever.
 *
 * These tests drive the behavior through the routes, not through the constants,
 * so they stay honest if the constants move again.
 *
 * The routes import the canon through the emitted-artifact specifier, so
 * loading them reads `shared/dist` — which a parallel worker
 * (sharedEngineProbe.emit.test.ts) rebuilds mid-run. Both the app and the
 * expected IDs are therefore loaded in `beforeAll`, after an idempotent
 * `build:shared`, rather than statically: nothing in this file touches
 * `shared/dist` before that build.
 *
 * This file is also the suite's loudest reaction to a stale `shared/dist`:
 * its expectations come from the built canon, but its scenarios name real IDs
 * (`track-maker`, `echo-avenue`, the legacy fakes), so a dist that disagrees
 * with the source fails here instead of passing quietly. That is a side
 * effect, not a freshness guard — the neighbouring
 * `backend/src/__tests__/stemSetIdsResolution.test.ts` owns resolution, and a
 * real freshness guard is still open in `docs/architecture/shared-code.md`.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";

const prismaMock = vi.hoisted(() => ({
  avatar: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  progress: { findMany: vi.fn(), count: vi.fn() },
  activity: { findMany: vi.fn(), count: vi.fn() },
  pulseResponse: { count: vi.fn() },
  ability: { findMany: vi.fn() },
  unlockedAbility: { findMany: vi.fn(), createMany: vi.fn() },
}));

vi.mock("../../utils/prisma", () => ({ default: prismaMock }));

const REPO_ROOT = process.cwd();
const BACKEND_DIR = path.join(REPO_ROOT, "backend");
const TSC_BIN = path.join(
  BACKEND_DIR,
  "node_modules",
  "typescript",
  "bin",
  "tsc",
);
const PKG_LINK = path.join(
  BACKEND_DIR,
  "node_modules",
  "@brightboost",
  "greatwork-engine",
);
const SHARED_TSCONFIG = path.join(REPO_ROOT, "shared", "tsconfig.json");

type Canon =
  typeof import("@brightboost/greatwork-engine/dist/progression/stemSetIds");

let app: typeof import("../../server").default;
let STEM_SET_1_IDS: Canon["STEM_SET_1_IDS"];
let STEM_SET_2_IDS: Canon["STEM_SET_2_IDS"];
let STEM_SET_3_IDS: Canon["STEM_SET_3_IDS"];
let STEM_SET_3_PLACEHOLDER_IDS: Canon["STEM_SET_3_PLACEHOLDER_IDS"];
/** The IDs a student can actually earn today: every seeded Set 1/2/3 activity. */
let ALL_REAL_SEEDED_IDS: string[];

// Fail loudly on a bad environment — never skip (G-017).
beforeAll(async () => {
  if (!existsSync(BACKEND_DIR)) {
    throw new Error(
      `Expected repo root as cwd; got "${REPO_ROOT}". Run Vitest from the repo root.`,
    );
  }
  if (!existsSync(PKG_LINK)) {
    throw new Error(
      "Missing backend/node_modules/@brightboost/greatwork-engine. " +
        "Run: cd backend ; npm ci",
    );
  }
  if (!existsSync(TSC_BIN)) {
    throw new Error("Missing backend TypeScript. Run: cd backend ; npm ci");
  }
  // Build shared/dist (idempotent) so nothing here reads a dist that a
  // parallel worker is midway through writing.
  execFileSync(process.execPath, [TSC_BIN, "-p", SHARED_TSCONFIG], {
    cwd: BACKEND_DIR,
    stdio: "pipe",
  });
  const canon: Canon =
    await import("@brightboost/greatwork-engine/dist/progression/stemSetIds");
  STEM_SET_1_IDS = canon.STEM_SET_1_IDS;
  STEM_SET_2_IDS = canon.STEM_SET_2_IDS;
  STEM_SET_3_IDS = canon.STEM_SET_3_IDS;
  STEM_SET_3_PLACEHOLDER_IDS = canon.STEM_SET_3_PLACEHOLDER_IDS;
  ALL_REAL_SEEDED_IDS = [
    ...STEM_SET_1_IDS,
    ...STEM_SET_2_IDS,
    ...STEM_SET_3_IDS.filter((id) => !canon.isStemSet3Placeholder(id)),
  ];
  app = (await import("../../server")).default;
}, 60_000);

const AUTH = "Bearer mock-token-for-mvp";

/** The wrong list both routes used to hardcode. */
const LEGACY_FAKE_SET_3_IDS = [
  "set3-game-1",
  "set3-game-2",
  "set3-game-3",
  "set3-game-4",
  "set3-game-5",
];

function armCompleted(activityIds: readonly string[]) {
  prismaMock.progress.findMany.mockResolvedValue(
    activityIds.map((activityId) => ({
      activityId,
      moduleSlug: `module-${activityId}`,
      timeSpentS: 120,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    })),
  );
}

async function selectArchetype() {
  return request(app)
    .post("/api/avatar/select-archetype")
    .set("Authorization", AUTH)
    .send({ archetype: "AI" });
}

describe("POST /avatar/select-archetype — Set 3 specialization gate (#855)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Happy path for everything downstream of the gate, so a non-403 response
    // means the gate opened rather than something else failing.
    prismaMock.avatar.findUnique.mockResolvedValue({
      id: "avatar-1",
      studentId: "student-123",
      stage: "GENERAL",
      archetype: null,
      level: 3,
      xp: 300,
    });
    prismaMock.avatar.update.mockResolvedValue({
      id: "avatar-1",
      studentId: "student-123",
      stage: "SPECIALIZED",
      archetype: "AI",
      level: 3,
    });
    prismaMock.ability.findMany.mockResolvedValue([]);
    prismaMock.unlockedAbility.findMany.mockResolvedValue([]);
  });

  // PHASE 1 — healthy: the gate opens for exactly the canonical Set 3 list.
  it("opens for a student who completed every canonical Set 3 activity ID", async () => {
    armCompleted(STEM_SET_3_IDS);

    const res = await selectArchetype();

    expect(res.status).toBe(200);
    expect(prismaMock.avatar.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stage: "SPECIALIZED" }),
      }),
    );
  });

  // PHASE 2 — the defect: the legacy fake list must buy nothing.
  it("stays locked for a student holding only the legacy set3-game-1..5 IDs", async () => {
    armCompleted(LEGACY_FAKE_SET_3_IDS);

    const res = await selectArchetype();

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Specialization locked");
    expect(prismaMock.avatar.update).not.toHaveBeenCalled();
  });

  it("is not satisfied by dropping any single canonical Set 3 ID", async () => {
    for (const missing of STEM_SET_3_IDS) {
      vi.clearAllMocks();
      prismaMock.avatar.findUnique.mockResolvedValue({
        id: "avatar-1",
        stage: "GENERAL",
        archetype: null,
        level: 3,
      });
      armCompleted(STEM_SET_3_IDS.filter((id) => id !== missing));

      const res = await selectArchetype();

      expect(res.status, `missing ${missing} must keep the gate closed`).toBe(
        403,
      );
    }
  });

  // Designed behavior (#676): Set 3 still holds reserved placeholder slots, so
  // no student can satisfy the gate today even with every real game finished.
  // This is intentional and must stay pinned — it is NOT the #855 defect.
  // Deliberate forcing function: replacing a placeholder with a real game MUST
  // visit this test (and the sibling pins below and in stemSets.test.ts).
  it("remains unsatisfiable today: every real seeded activity is still not enough", async () => {
    expect(STEM_SET_3_PLACEHOLDER_IDS.length).toBeGreaterThan(0);
    armCompleted(ALL_REAL_SEEDED_IDS);

    const res = await selectArchetype();

    expect(res.status).toBe(403);
  });

  it("ignores unknown/stale completion rows rather than being confused by them", async () => {
    armCompleted([
      ...STEM_SET_3_IDS,
      "set3-game-1",
      "set3-game-3",
      "lost-steps",
      "not-a-real-activity",
    ]);

    const res = await selectArchetype();

    expect(res.status).toBe(200);
  });
});

describe("GET /student/stats — specialtyProgress counts real IDs (#855)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.pulseResponse.count.mockResolvedValue(0);
    prismaMock.activity.findMany.mockResolvedValue([]);
    prismaMock.activity.count.mockResolvedValue(0);
  });

  async function getStats() {
    const res = await request(app)
      .get("/api/student/stats")
      .set("Authorization", AUTH);
    expect(res.status).toBe(200);
    return res.body.specialtyProgress;
  }

  it("counts the real seeded Set 3 activities (track-maker, echo-avenue)", async () => {
    const realSet3 = STEM_SET_3_IDS.filter(
      (id) => !(STEM_SET_3_PLACEHOLDER_IDS as readonly string[]).includes(id),
    );
    // Deliberate forcing function: shipping a new Set 3 game MUST visit this
    // literal, so the real-vs-placeholder split can never go stale silently.
    expect(realSet3).toEqual(["track-maker", "echo-avenue"]);
    armCompleted(realSet3);

    const progress = await getStats();

    expect(progress.set3).toEqual({
      current: realSet3.length,
      target: STEM_SET_3_IDS.length,
      complete: false,
    });
  });

  it("gives no credit for the legacy fake set3-game-1 / set3-game-3 IDs", async () => {
    armCompleted(["set3-game-1", "set3-game-3"]);

    const progress = await getStats();

    expect(progress.set3.current).toBe(0);
  });

  it("reports Set 1 and Set 2 completion from the shared canonical lists", async () => {
    armCompleted([...STEM_SET_1_IDS, ...STEM_SET_2_IDS.slice(0, 3)]);

    const progress = await getStats();

    expect(progress.set1).toEqual({
      current: STEM_SET_1_IDS.length,
      target: STEM_SET_1_IDS.length,
      complete: true,
    });
    expect(progress.set2).toEqual({
      current: 3,
      target: STEM_SET_2_IDS.length,
      complete: false,
    });
  });

  it("reaches Set 3 completion when the canonical list is finished", async () => {
    armCompleted(STEM_SET_3_IDS);

    const progress = await getStats();

    expect(progress.set3.complete).toBe(true);
  });
});
