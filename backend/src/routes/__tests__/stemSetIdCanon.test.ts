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
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import {
  STEM_SET_1_IDS,
  STEM_SET_2_IDS,
  STEM_SET_3_IDS,
  STEM_SET_3_PLACEHOLDER_IDS,
} from "@brightboost/greatwork-engine/dist/progression/stemSetIds";

const prismaMock = vi.hoisted(() => ({
  avatar: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  progress: { findMany: vi.fn(), count: vi.fn() },
  activity: { findMany: vi.fn(), count: vi.fn() },
  pulseResponse: { count: vi.fn() },
  ability: { findMany: vi.fn() },
  unlockedAbility: { findMany: vi.fn(), createMany: vi.fn() },
}));

vi.mock("../../utils/prisma", () => ({ default: prismaMock }));

import app from "../../server";

const AUTH = "Bearer mock-token-for-mvp";

/** The IDs a student can actually earn today: every seeded Set 1/2/3 activity. */
const ALL_REAL_SEEDED_IDS = [
  ...STEM_SET_1_IDS,
  ...STEM_SET_2_IDS,
  ...STEM_SET_3_IDS.filter(
    (id) => !(STEM_SET_3_PLACEHOLDER_IDS as readonly string[]).includes(id),
  ),
];

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
