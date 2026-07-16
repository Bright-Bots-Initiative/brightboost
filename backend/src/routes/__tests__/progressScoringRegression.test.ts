import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

/**
 * Part T3 — scoring/XP/`GamePersonalBest` regression (AC-4 / G-002).
 *
 * T3-1-01 baseline: frozen under this mock setup. Scoring path vs `main` is
 * unchanged except gameSpecific / publicProgress / warn hunks
 * (`git diff main...HEAD -- backend/src/routes/progress.ts`). Do not checkout main.
 */

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

const AVATAR_BEFORE = {
  id: "avatar-1",
  studentId: "student-123",
  archetype: "AI",
  xp: 100,
  energy: 100,
  hp: 100,
  level: 1,
  speed: 0,
  control: 0,
  focus: 0,
};

/** After XP_PER_ACTIVITY (+50) and calculateStatGains(score=8,total=10,timeSpentS=45). */
const AVATAR_AFTER = {
  ...AVATAR_BEFORE,
  xp: 150,
  energy: 100,
  hp: 100,
  speed: 2,
  control: 3,
  focus: 2,
};

const PROGRESS_ROW = {
  id: "prog-1",
  studentId: "student-123",
  moduleSlug: "test-module",
  lessonId: "lesson-1",
  activityId: "valid-activity",
  status: "COMPLETED",
  timeSpentS: 45,
};

const PERSONAL_BEST = {
  id: "gpb-1",
  studentId: "student-123",
  gameKey: "move_measure",
  bestScore: 8,
  lastScore: 8,
  bestStreak: 3,
  bestRoundsCompleted: 0,
  playCount: 1,
  meta: null,
};

/**
 * Main-equivalent scoring slice under this mock setup (T3-1-01).
 * XP_PER_ACTIVITY=50; energy already at cap; GPB first-play create.
 */
const SCORING_BASELINE = {
  reward: {
    xpDelta: 50,
    levelDelta: 0,
    energyDelta: 0,
    hpDelta: 0,
    newAbilitiesDelta: 0,
  },
  avatar: AVATAR_AFTER,
  personalBest: PERSONAL_BEST,
  isNewHighScore: true,
  isNewBestStreak: true,
};

const validMoveMeasure = {
  dash: 3,
  jump: 4,
  toss: 5,
  impEvent: "dash" as const,
  impScore: 2,
  exitCorrect: true,
};

const FIXED_RESULT = {
  gameKey: "move_measure",
  score: 8,
  total: 10,
  streakMax: 3,
};

const FIXED_BODY = {
  moduleSlug: "test-module",
  lessonId: "lesson-1",
  activityId: "valid-activity",
  timeSpentS: 45,
  result: FIXED_RESULT,
};

/** Isolate each request under the test gameActionLimiter (5/IP). */
let ipSeq = 0;
function completeActivity(body: Record<string, unknown>) {
  ipSeq += 1;
  return request(app)
    .post("/api/progress/complete-activity")
    .set("Authorization", "Bearer mock-token-for-mvp")
    .set("X-Forwarded-For", `203.0.113.${ipSeq}`)
    .send(body);
}

function scoringSlice(body: {
  reward: unknown;
  avatar: unknown;
  personalBest: unknown;
  isNewHighScore: unknown;
  isNewBestStreak: unknown;
}) {
  return {
    reward: body.reward,
    avatar: body.avatar,
    personalBest: body.personalBest,
    isNewHighScore: body.isNewHighScore,
    isNewBestStreak: body.isNewBestStreak,
  };
}

function setupFirstCompletionMocks() {
  prismaMock.avatar.findUnique.mockResolvedValue(AVATAR_BEFORE);
  prismaMock.avatar.update.mockResolvedValue(AVATAR_AFTER);
  prismaMock.activity.findUnique.mockResolvedValue(VALID_ACTIVITY);
  prismaMock.progress.findUnique.mockResolvedValue(null);
  prismaMock.progress.create.mockResolvedValue(PROGRESS_ROW);
  prismaMock.progress.count.mockResolvedValue(1);
  prismaMock.ability.findMany.mockResolvedValue([]);
  prismaMock.unlockedAbility.findMany.mockResolvedValue([]);
  prismaMock.unlockedAbility.createMany.mockResolvedValue({ count: 0 });
  prismaMock.gamePersonalBest.findUnique.mockResolvedValue(null);
  prismaMock.gamePersonalBest.create.mockResolvedValue(PERSONAL_BEST);
  prismaMock.gamePersonalBest.update.mockResolvedValue(PERSONAL_BEST);
  prismaMock.gamePersonalBest.upsert.mockResolvedValue(PERSONAL_BEST);
}

describe("POST /api/progress/complete-activity scoring regression (AC-4 / T3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFirstCompletionMocks();
  });

  it("T3-1-01: SCORING_BASELINE matches first completion without gameSpecific", async () => {
    const res = await completeActivity(FIXED_BODY);

    expect(res.status).toBe(200);
    expect(scoringSlice(res.body)).toEqual(SCORING_BASELINE);

    const avatarUpdate = prismaMock.avatar.update.mock.calls[0][0];
    expect(avatarUpdate.data.xp).toEqual({ increment: 50 });
    expect(avatarUpdate.data).not.toHaveProperty("meta");
    expect(avatarUpdate.data).not.toHaveProperty("gameSpecific");
  });

  it("T3-1-02: without gameSpecific matches SCORING_BASELINE", async () => {
    const res = await completeActivity(FIXED_BODY);

    expect(res.status).toBe(200);
    expect(scoringSlice(res.body)).toEqual(SCORING_BASELINE);
  });

  it("T3-1-03: with valid gameSpecific still matches SCORING_BASELINE scoring slice", async () => {
    prismaMock.progress.create.mockResolvedValue({
      ...PROGRESS_ROW,
      gameSpecific: validMoveMeasure,
    });

    const res = await completeActivity({
      ...FIXED_BODY,
      result: { ...FIXED_RESULT, gameSpecific: validMoveMeasure },
    });

    expect(res.status).toBe(200);
    expect(scoringSlice(res.body)).toEqual(SCORING_BASELINE);
    expect(res.body.progress).not.toHaveProperty("gameSpecific");

    const avatarUpdate = prismaMock.avatar.update.mock.calls[0][0];
    expect(avatarUpdate.data.xp).toEqual({ increment: 50 });

    const gpbCreate = prismaMock.gamePersonalBest.create.mock.calls[0][0];
    expect(gpbCreate.data).toMatchObject({
      studentId: "student-123",
      gameKey: "move_measure",
      bestScore: 8,
      lastScore: 8,
      bestStreak: 3,
      bestRoundsCompleted: 0,
      playCount: 1,
    });
    expect(gpbCreate.data).not.toHaveProperty("meta");
    expect(gpbCreate.data).not.toHaveProperty("gameSpecific");
  });

  it("T3-1-04: GamePersonalBest row has meta null and create never sets meta", async () => {
    const without = await completeActivity(FIXED_BODY);
    expect(without.status).toBe(200);
    expect(without.body.personalBest.meta).toBeNull();
    expect(
      prismaMock.gamePersonalBest.create.mock.calls[0][0].data,
    ).not.toHaveProperty("meta");

    vi.clearAllMocks();
    setupFirstCompletionMocks();
    prismaMock.progress.create.mockResolvedValue({
      ...PROGRESS_ROW,
      gameSpecific: validMoveMeasure,
    });

    const withGs = await completeActivity({
      ...FIXED_BODY,
      result: { ...FIXED_RESULT, gameSpecific: validMoveMeasure },
    });
    expect(withGs.status).toBe(200);
    expect(withGs.body.personalBest.meta).toBeNull();
    expect(
      prismaMock.gamePersonalBest.create.mock.calls[0][0].data,
    ).not.toHaveProperty("meta");
    expect(scoringSlice(withGs.body)).toEqual(SCORING_BASELINE);
  });

  it("T3-1-05: GamePersonalBest failure still completes with scoring rewards + warn", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    prismaMock.gamePersonalBest.findUnique.mockRejectedValue(
      new Error("forced GPB failure"),
    );

    const res = await completeActivity({
      ...FIXED_BODY,
      result: { ...FIXED_RESULT, gameSpecific: validMoveMeasure },
    });

    expect(res.status).toBe(200);
    expect(res.body.reward).toEqual(SCORING_BASELINE.reward);
    expect(res.body.avatar).toEqual(SCORING_BASELINE.avatar);
    expect(res.body.personalBest).toBeNull();
    expect(res.body.isNewHighScore).toBe(false);
    expect(res.body.isNewBestStreak).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      "[complete-activity] Failed to upsert GamePersonalBest:",
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });
});
