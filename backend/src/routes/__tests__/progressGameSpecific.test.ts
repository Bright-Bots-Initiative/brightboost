import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import {
  GAME_SPECIFIC_MAX_BYTES,
  GAME_SPECIFIC_SCHEMAS,
  type RegisteredGameKey,
} from "../../validation/gameSpecific";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  progress: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  avatar: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  activity: { findUnique: vi.fn() },
  ability: { findMany: vi.fn() },
  unlockedAbility: { findMany: vi.fn(), createMany: vi.fn() },
  gamePersonalBest: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("../../utils/prisma", () => ({ default: prismaMock }));

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return prismaMock;
    }
  },
}));

vi.mock("../../services/analytics", () => ({
  trackServer: vi.fn(),
  shutdownAnalytics: vi.fn(),
  getAnalyticsClient: vi.fn(() => null),
}));

import app from "../../server";

const VALID_ACTIVITY = {
  id: "valid-activity",
  lessonId: "lesson-1",
  title: "Test Activity",
  kind: "INFO",
  order: 1,
  content: "{}",
};

const AVATAR = {
  id: "avatar-1",
  studentId: "student-123",
  archetype: "AI",
  xp: 100,
  energy: 100,
  hp: 100,
  level: 1,
};

/** A2-01 inventoried payloads (remember.md) — self-contained for route suite. */
const validByKey: Record<RegisteredGameKey, unknown> = {
  move_measure: {
    dash: 3,
    jump: 4,
    toss: 5,
    impEvent: "dash",
    impScore: 2,
    exitCorrect: true,
  },
  quantum_quest: {
    maxStreak: 3,
    totalAttempted: 10,
    sectorsCleared: 2,
    powerUpsUsed: 1,
  },
  tank_trek: { totalChips: 4, retries: 1 },
  qualify_tune_race: {
    upgrade: "grip",
    run1: { time: 12.5, bumps: 2, smoothness: 70 },
    run2: null,
    exitCorrect: true,
  },
  boost_path_planner: { attempts: 2 },
};

const validMoveMeasure = validByKey.move_measure as {
  dash: number;
  jump: number;
  toss: number;
  impEvent: "dash" | "jump" | "toss";
  impScore: number;
  exitCorrect: boolean;
};

/** A2-01 inventoried gameKeys (remember.md) — T2-1-02 must cover each. */
const A2_01_KEYS = [
  "move_measure",
  "quantum_quest",
  "tank_trek",
  "qualify_tune_race",
  "boost_path_planner",
] as const satisfies readonly RegisteredGameKey[];

const REGISTRY_KEYS = Object.keys(GAME_SPECIFIC_SCHEMAS) as RegisteredGameKey[];

/** Isolate each request under the test gameActionLimiter (5/IP). */
let ipSeq = 0;
function completeActivity(body: Record<string, unknown>) {
  ipSeq += 1;
  return request(app)
    .post("/api/progress/complete-activity")
    .set("Authorization", "Bearer mock-token-for-mvp")
    .set("X-Forwarded-For", `198.51.100.${ipSeq}`)
    .send(body);
}

function expectNoProgressWrites() {
  expect(prismaMock.progress.findUnique).not.toHaveBeenCalled();
  expect(prismaMock.progress.create).not.toHaveBeenCalled();
  expect(prismaMock.progress.update).not.toHaveBeenCalled();
}

describe("POST /api/progress/complete-activity gameSpecific persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.avatar.findUnique.mockResolvedValue(AVATAR);
    prismaMock.avatar.update.mockResolvedValue({ ...AVATAR, xp: 150 });
    prismaMock.activity.findUnique.mockResolvedValue(VALID_ACTIVITY);
    prismaMock.progress.count.mockResolvedValue(1);
    prismaMock.ability.findMany.mockResolvedValue([]);
    prismaMock.unlockedAbility.findMany.mockResolvedValue([]);
    prismaMock.unlockedAbility.createMany.mockResolvedValue({ count: 0 });
    prismaMock.gamePersonalBest.findUnique.mockResolvedValue(null);
    prismaMock.gamePersonalBest.create.mockResolvedValue({});
    prismaMock.gamePersonalBest.update.mockResolvedValue({});
    prismaMock.gamePersonalBest.upsert.mockResolvedValue({});
  });

  it("T2-1-01 / AC-1 / C1-01: POST move_measure → 200 → Progress row gameSpecific deep-equals what was sent", async () => {
    prismaMock.progress.findUnique.mockResolvedValue(null);
    prismaMock.progress.create.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      gameSpecific: validMoveMeasure,
    });

    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 12,
      result: {
        gameKey: "move_measure",
        score: 8,
        gameSpecific: validMoveMeasure,
      },
    });

    expect(res.status).toBe(200);
    expect(prismaMock.progress.create).toHaveBeenCalled();
    // A1-03 mock strategy: create data is the Progress row write (§14.4 "read the row").
    const row = prismaMock.progress.create.mock.calls[0][0].data;
    // AC-1: deep-equals what was sent.
    expect(row.gameSpecific).toEqual(validMoveMeasure);
    // C1-01 / E-8: stored value is the re-parsed registry object (same for a clean payload).
    expect(row.gameSpecific).toEqual(
      GAME_SPECIFIC_SCHEMAS.move_measure.parse(validMoveMeasure),
    );
    // §5.5 / §7: persist only — do not surface gameSpecific on the wire.
    expect(res.body.progress).not.toHaveProperty("gameSpecific");
  });

  it.each(A2_01_KEYS)(
    "T2-1-02 / AC-1: round-trip Progress.gameSpecific deep-equals what was sent for %s",
    async (gameKey) => {
      // Guard: registry must still include every A2-01 sender (inventory is authoritative).
      expect(REGISTRY_KEYS).toContain(gameKey);

      const payload = validByKey[gameKey];
      const expected = GAME_SPECIFIC_SCHEMAS[gameKey].parse(payload);

      prismaMock.progress.findUnique.mockResolvedValue(null);
      prismaMock.progress.create.mockResolvedValue({
        id: "prog-1",
        studentId: "student-123",
        activityId: "valid-activity",
        status: "COMPLETED",
        gameSpecific: expected,
      });

      const res = await completeActivity({
        moduleSlug: "test-module",
        lessonId: "lesson-1",
        activityId: "valid-activity",
        timeSpentS: 10,
        result: {
          gameKey,
          score: 5,
          gameSpecific: payload,
        },
      });

      expect(res.status).toBe(200);
      expect(prismaMock.progress.create).toHaveBeenCalled();
      const row = prismaMock.progress.create.mock.calls[0][0].data;
      // AC-1: deep-equals what was sent (and the re-parsed registry value).
      expect(row.gameSpecific).toEqual(payload);
      expect(row.gameSpecific).toEqual(expected);
      expect(res.body.progress).not.toHaveProperty("gameSpecific");
    },
  );

  it("T2-1-02: registry keys equal the A2-01 inventory (no missing/extra senders)", () => {
    expect([...REGISTRY_KEYS].sort()).toEqual([...A2_01_KEYS].sort());
  });

  it("T2-1-03 / E-1: POST without gameSpecific → 200, column null (omitted on create), no error", async () => {
    prismaMock.progress.findUnique.mockResolvedValue(null);
    prismaMock.progress.create.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      gameSpecific: null,
    });

    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 5,
      result: { gameKey: "move_measure", score: 3 },
    });

    expect(res.status).toBe(200);
    expect(prismaMock.progress.create).toHaveBeenCalled();
    const row = prismaMock.progress.create.mock.calls[0][0].data;
    // Omit from create ⇒ column stays null (Prisma default); never write null explicitly.
    expect(row).not.toHaveProperty("gameSpecific");
    expect(res.body.progress).not.toHaveProperty("gameSpecific");
  });

  it("C2-01: persists re-parsed gameSpecific on update (IN_PROGRESS → COMPLETED)", async () => {
    prismaMock.progress.findUnique.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "IN_PROGRESS",
      gameSpecific: null,
    });
    prismaMock.progress.update.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      gameSpecific: validMoveMeasure,
    });

    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 8,
      result: {
        gameKey: "move_measure",
        score: 8,
        gameSpecific: validMoveMeasure,
      },
    });

    expect(res.status).toBe(200);
    expect(prismaMock.progress.update).toHaveBeenCalled();
    const updateArg = prismaMock.progress.update.mock.calls[0][0];
    const expected = GAME_SPECIFIC_SCHEMAS.move_measure.parse(validMoveMeasure);
    expect(updateArg.data.gameSpecific).toEqual(expected);
    expect(res.body.progress).not.toHaveProperty("gameSpecific");
  });

  it("T2-1-04 / E-3: when gameSpecific is absent, update omits the field (preserves stored value)", async () => {
    const stored = {
      dash: 1,
      jump: 2,
      toss: 3,
      impEvent: null,
      impScore: 0,
      exitCorrect: false,
    };
    prismaMock.progress.findUnique.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "IN_PROGRESS",
      gameSpecific: stored,
    });
    prismaMock.progress.update.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      gameSpecific: stored,
    });

    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 5,
      result: { gameKey: "move_measure", score: 3 },
    });

    expect(res.status).toBe(200);
    expect(prismaMock.progress.update).toHaveBeenCalled();
    const updateArg = prismaMock.progress.update.mock.calls[0][0];
    expect(updateArg.data).not.toHaveProperty("gameSpecific");
    expect(res.body.progress).not.toHaveProperty("gameSpecific");
  });

  it("T2-1-04 / E-3: POST with telemetry then POST without preserves via idempotent re-complete", async () => {
    const expected = GAME_SPECIFIC_SCHEMAS.move_measure.parse(validMoveMeasure);

    // First completion stores telemetry.
    prismaMock.progress.findUnique.mockResolvedValueOnce(null);
    prismaMock.progress.create.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      gameSpecific: expected,
    });

    const first = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 12,
      result: {
        gameKey: "move_measure",
        score: 8,
        gameSpecific: validMoveMeasure,
      },
    });
    expect(first.status).toBe(200);
    expect(prismaMock.progress.create.mock.calls[0][0].data.gameSpecific).toEqual(
      expected,
    );

    // Old client re-completes without gameSpecific — must not null stored value.
    prismaMock.progress.findUnique.mockResolvedValueOnce({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      gameSpecific: expected,
    });

    const second = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 5,
      result: { gameKey: "move_measure", score: 3 },
    });

    expect(second.status).toBe(200);
    expect(second.body.message).toBe("Already completed");
    expect(prismaMock.progress.update).not.toHaveBeenCalled();
    expect(prismaMock.progress.create).toHaveBeenCalledTimes(1);
    expect(second.body.progress).not.toHaveProperty("gameSpecific");
  });

  it("T2-1-05 / E-4 / E-12 / T2-1-06: unregistered gameKey + gameSpecific → 400, no write, no payload echo", async () => {
    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 5,
      result: {
        gameKey: "not_a_registered_game",
        gameSpecific: validMoveMeasure,
      },
    });

    expect(res.status).toBe(400);
    expectNoProgressWrites();
    const body = JSON.stringify(res.body);
    // §5.9.1: name the field and gameKey; G-103: never echo payload content.
    expect(body).toContain("gameSpecific");
    expect(body).toContain("not_a_registered_game");
    expect(body).not.toContain("dash");
    expect(body).not.toContain("impScore");
  });

  it("T2-1-05 / E-5 / E-12 / T2-1-06: unknown key inside gameSpecific → 400 before any Progress write", async () => {
    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 5,
      result: {
        gameKey: "move_measure",
        gameSpecific: { ...validMoveMeasure, smuggle: true },
      },
    });

    expect(res.status).toBe(400);
    expectNoProgressWrites();
    const body = JSON.stringify(res.body);
    // §5.9.1: name field + gameKey; G-103: do not echo smuggled key.
    expect(body).toContain("gameSpecific");
    expect(body).toContain("move_measure");
    expect(body).not.toContain("smuggle");
  });

  it("T2-1-05 / E-7 / E-12 / T2-1-06: oversized gameSpecific → 400 before any Progress write", async () => {
    const padded: Record<string, unknown> = { ...validMoveMeasure };
    let i = 0;
    while (JSON.stringify(padded).length <= GAME_SPECIFIC_MAX_BYTES) {
      padded[`pad_${i++}`] = "x".repeat(64);
    }
    expect(JSON.stringify(padded).length).toBeGreaterThan(GAME_SPECIFIC_MAX_BYTES);

    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 5,
      result: {
        gameKey: "move_measure",
        gameSpecific: padded,
      },
    });

    expect(res.status).toBe(400);
    expectNoProgressWrites();
    const body = JSON.stringify(res.body);
    // §5.9.1: name field + gameKey; G-103: do not echo pad keys or filler.
    expect(body).toContain("gameSpecific");
    expect(body).toContain("move_measure");
    expect(body).not.toContain("pad_0");
    expect(body).not.toContain("x".repeat(64));
  });

  it("E-9: explicit null gameSpecific → 400 (null is not omitted), no Progress write", async () => {
    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 5,
      result: {
        gameKey: "move_measure",
        gameSpecific: null,
      },
    });

    expect(res.status).toBe(400);
    expectNoProgressWrites();
    const body = JSON.stringify(res.body);
    // §5.9.1: name field + gameKey; null is not treated as omit (contrast E-1).
    expect(body).toContain("gameSpecific");
    expect(body).toContain("move_measure");
  });

  it("E-11: deeply nested value in a primitive field is rejected (bounded primitives only)", async () => {
    // Distinct from E-5 (unknown key): nest inside an allowlisted field that must be a number.
    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 5,
      result: {
        gameKey: "move_measure",
        gameSpecific: {
          ...validMoveMeasure,
          dash: { deeper: { still: 1 } },
        },
      },
    });

    expect(res.status).toBe(400);
    expectNoProgressWrites();
    const body = JSON.stringify(res.body);
    expect(body).toContain("gameSpecific");
    expect(body).toContain("move_measure");
    expect(body).not.toContain("deeper");
    expect(body).not.toContain("still");
  });

  it("T2-1-07 / §5.2.3: IN_PROGRESS stored A then POST with B overwrites (last-write-wins on update path)", async () => {
    const storedA = {
      dash: 1,
      jump: 1,
      toss: 1,
      impEvent: null as null,
      impScore: 0,
      exitCorrect: false,
    };
    const payloadB = {
      dash: 9,
      jump: 8,
      toss: 7,
      impEvent: "toss" as const,
      impScore: 6,
      exitCorrect: true,
    };
    const expectedB = GAME_SPECIFIC_SCHEMAS.move_measure.parse(payloadB);

    prismaMock.progress.findUnique.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "IN_PROGRESS",
      gameSpecific: storedA,
    });
    prismaMock.progress.update.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      gameSpecific: expectedB,
    });

    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 8,
      result: {
        gameKey: "move_measure",
        score: 9,
        gameSpecific: payloadB,
      },
    });

    expect(res.status).toBe(200);
    expect(prismaMock.progress.update).toHaveBeenCalled();
    const updateArg = prismaMock.progress.update.mock.calls[0][0];
    expect(updateArg.data.gameSpecific).toEqual(expectedB);
    expect(updateArg.data.gameSpecific).not.toEqual(storedA);
    expect(res.body.progress).not.toHaveProperty("gameSpecific");
  });

  it("R-1: COMPLETED replay overwrites gameSpecific (last-write-wins on idempotent path)", async () => {
    const storedA = {
      dash: 1,
      jump: 1,
      toss: 1,
      impEvent: null as null,
      impScore: 0,
      exitCorrect: false,
    };
    const payloadB = {
      dash: 9,
      jump: 8,
      toss: 7,
      impEvent: "toss" as const,
      impScore: 6,
      exitCorrect: true,
    };
    const expectedB = GAME_SPECIFIC_SCHEMAS.move_measure.parse(payloadB);

    prismaMock.progress.findUnique.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      gameSpecific: storedA,
    });
    prismaMock.progress.update.mockResolvedValue({
      id: "prog-after-replay",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      gameSpecific: expectedB,
    });

    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 8,
      result: {
        gameKey: "move_measure",
        score: 9,
        gameSpecific: payloadB,
      },
    });

    expect(res.status).toBe(200);
    expect(prismaMock.progress.update).toHaveBeenCalledTimes(1);
    const updateArg = prismaMock.progress.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: "prog-1" });
    expect(updateArg.data).toEqual({ gameSpecific: expectedB });
  });

  it("R-2: COMPLETED replay awards nothing (no XP/avatar/streak/GamePersonalBest)", async () => {
    const payloadB = {
      dash: 9,
      jump: 8,
      toss: 7,
      impEvent: "toss" as const,
      impScore: 6,
      exitCorrect: true,
    };
    const expectedB = GAME_SPECIFIC_SCHEMAS.move_measure.parse(payloadB);

    prismaMock.progress.findUnique.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      gameSpecific: {
        dash: 1,
        jump: 1,
        toss: 1,
        impEvent: null,
        impScore: 0,
        exitCorrect: false,
      },
    });
    prismaMock.progress.update.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      gameSpecific: expectedB,
    });

    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 8,
      result: {
        gameKey: "move_measure",
        score: 9,
        gameSpecific: payloadB,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Already completed");
    expect(res.body.reward.xpDelta).toBe(0);
    expect(res.body.reward.levelDelta).toBe(0);
    expect(prismaMock.avatar.update).not.toHaveBeenCalled();
    expect(prismaMock.avatar.create).not.toHaveBeenCalled();
    expect(prismaMock.gamePersonalBest.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.gamePersonalBest.create).not.toHaveBeenCalled();
    expect(prismaMock.gamePersonalBest.update).not.toHaveBeenCalled();
    expect(prismaMock.gamePersonalBest.upsert).not.toHaveBeenCalled();
  });

  it("R-3: COMPLETED replay without gameSpecific does not call update (E-3)", async () => {
    prismaMock.progress.findUnique.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      gameSpecific: validMoveMeasure,
    });

    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 5,
      result: { gameKey: "move_measure", score: 3 },
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Already completed");
    expect(prismaMock.progress.update).not.toHaveBeenCalled();
    expect(res.body.progress).not.toHaveProperty("gameSpecific");
  });

  it("R-4: COMPLETED replay with wasBackfilled writes telemetry and keeps backfilledXp", async () => {
    const payloadB = {
      dash: 9,
      jump: 8,
      toss: 7,
      impEvent: "toss" as const,
      impScore: 6,
      exitCorrect: true,
    };
    const expectedB = GAME_SPECIFIC_SCHEMAS.move_measure.parse(payloadB);
    // completedCount=1 → XP_PER_ACTIVITY(50) + levelUpBonus(0) = 50
    const backfilledXp = 50;
    const backfilledAvatar = {
      id: "avatar-backfilled",
      studentId: "student-123",
      archetype: null,
      xp: backfilledXp,
      energy: 100,
      hp: 100,
      level: 1,
    };

    prismaMock.avatar.findUnique.mockResolvedValue(null);
    prismaMock.progress.count.mockResolvedValue(1);
    prismaMock.avatar.create.mockResolvedValue(backfilledAvatar);
    prismaMock.progress.findUnique.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      gameSpecific: {
        dash: 1,
        jump: 1,
        toss: 1,
        impEvent: null,
        impScore: 0,
        exitCorrect: false,
      },
    });
    prismaMock.progress.update.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      gameSpecific: expectedB,
    });

    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 8,
      result: {
        gameKey: "move_measure",
        score: 9,
        gameSpecific: payloadB,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Already completed (avatar backfilled)");
    expect(prismaMock.progress.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.progress.update.mock.calls[0][0].data).toEqual({
      gameSpecific: expectedB,
    });
    expect(res.body.reward.xpDelta).toBe(backfilledXp);
    expect(prismaMock.gamePersonalBest.upsert).not.toHaveBeenCalled();
    expect(prismaMock.gamePersonalBest.create).not.toHaveBeenCalled();
    expect(prismaMock.gamePersonalBest.update).not.toHaveBeenCalled();
  });

  it("R-5: COMPLETED replay response uses post-write row and omits gameSpecific", async () => {
    const payloadB = {
      dash: 9,
      jump: 8,
      toss: 7,
      impEvent: "toss" as const,
      impScore: 6,
      exitCorrect: true,
    };
    const expectedB = GAME_SPECIFIC_SCHEMAS.move_measure.parse(payloadB);

    prismaMock.progress.findUnique.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      gameSpecific: {
        dash: 1,
        jump: 1,
        toss: 1,
        impEvent: null,
        impScore: 0,
        exitCorrect: false,
      },
    });
    prismaMock.progress.update.mockResolvedValue({
      id: "prog-after-replay",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      moduleSlug: "test-module",
      gameSpecific: expectedB,
    });

    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 8,
      result: {
        gameKey: "move_measure",
        score: 9,
        gameSpecific: payloadB,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.progress.id).toBe("prog-after-replay");
    expect(res.body.progress).not.toHaveProperty("gameSpecific");
  });

  it("C2-04 / §5.9.2: warns on unregistered gameKey when gameSpecific is sent (400 path)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 5,
      result: {
        gameKey: "not_a_registered_game",
        gameSpecific: validMoveMeasure,
      },
    });

    expect(res.status).toBe(400);
    expect(warnSpy).toHaveBeenCalledWith(
      '[complete-activity] Unregistered gameKey "not_a_registered_game" (no gameSpecific registry entry)',
    );
    expect(JSON.stringify(res.body)).not.toContain("dash");
    expect(prismaMock.progress.create).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("C2-04 / §5.9.2: unregistered gameKey without gameSpecific does not warn (happy path)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    prismaMock.progress.findUnique.mockResolvedValue(null);
    prismaMock.progress.create.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
    });

    const res = await completeActivity({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 5,
      result: { gameKey: "fast_lane", score: 10 },
    });

    expect(res.status).toBe(200);
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Unregistered gameKey"),
    );
    warnSpy.mockRestore();
  });
});
