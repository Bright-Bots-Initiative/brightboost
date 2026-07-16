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

  it("T2-1-01 / AC-1 / C1-01: persists re-parsed move_measure gameSpecific on create", async () => {
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
    const createArg = prismaMock.progress.create.mock.calls[0][0];
    const expected = GAME_SPECIFIC_SCHEMAS.move_measure.parse(validMoveMeasure);
    expect(createArg.data.gameSpecific).toEqual(expected);
    // §5.5 / §7: persist only — do not surface gameSpecific on the wire.
    expect(res.body.progress).not.toHaveProperty("gameSpecific");
  });

  it.each(REGISTRY_KEYS)(
    "T2-1-02 / AC-1: round-trip persists gameSpecific for %s",
    async (gameKey) => {
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
      const createArg = prismaMock.progress.create.mock.calls[0][0];
      expect(createArg.data.gameSpecific).toEqual(expected);
      expect(res.body.progress).not.toHaveProperty("gameSpecific");
    },
  );

  it("T2-1-03 / E-1: POST without gameSpecific succeeds and omits column on create", async () => {
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
    const createArg = prismaMock.progress.create.mock.calls[0][0];
    expect(createArg.data).not.toHaveProperty("gameSpecific");
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

  it("T2-1-05 / E-4: unregistered gameKey with gameSpecific → 400, no Progress write", async () => {
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
    // T2-1-06 / G-103: do not echo payload fields.
    expect(JSON.stringify(res.body)).not.toContain("dash");
    expect(JSON.stringify(res.body)).not.toContain("impScore");
  });

  it("T2-1-05 / E-5 / E-12: unknown key inside gameSpecific → 400 before any Progress write", async () => {
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
    // T2-1-06 / G-103: 400 must not echo the submitted payload.
    expect(JSON.stringify(res.body)).not.toContain("smuggle");
  });

  it("T2-1-05 / E-7: oversized gameSpecific → 400 before any Progress write", async () => {
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
    // T2-1-06 / G-103: do not echo pad keys or long filler.
    expect(JSON.stringify(res.body)).not.toContain("pad_0");
    expect(JSON.stringify(res.body)).not.toContain("x".repeat(64));
  });

  it("T2-1-07: IN_PROGRESS with stored A then POST with B overwrites (last-write-wins)", async () => {
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
