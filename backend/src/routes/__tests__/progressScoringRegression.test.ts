import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

/**
 * Part T3 — scoring/XP/`GamePersonalBest` regression (AC-4 / G-002 / overview §14.5).
 *
 * T3-1-01 baseline: frozen under this mock setup (A1-03 mock-Prisma strategy).
 * Scoring path vs `main` is unchanged except gameSpecific / publicProgress / warn hunks
 * (`git diff main...HEAD -- backend/src/routes/progress.ts`). Do not checkout main.
 *
 * T3-1-06 is a process check (run pre-existing progress suites; confirm zero assertion
 * edits in git diff) — not an it() below.
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
  // Below cap so energyGain(+5)/hpGain(+2) appear in reward + avatar.update (AC-4).
  energy: 50,
  hp: 50,
  level: 1,
  speed: 0,
  control: 0,
  focus: 0,
};

/** After XP_PER_ACTIVITY (+50) and calculateStatGains(score=8,total=10,timeSpentS=45). */
const AVATAR_AFTER = {
  ...AVATAR_BEFORE,
  xp: 150,
  energy: 55,
  hp: 52,
  speed: 2,
  control: 3,
  focus: 2,
};

/** Public progress row — no gameSpecific (v1 §5.5). */
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

/** Expected avatar.update data for the fixed request (main scoring path). */
const EXPECTED_AVATAR_UPDATE = {
  xp: { increment: 50 },
  energy: 55,
  hp: 52,
  speed: 2,
  control: 3,
  focus: 2,
};

/** Expected GamePersonalBest.create data (first play; no meta). */
const EXPECTED_GPB_CREATE = {
  studentId: "student-123",
  gameKey: "move_measure",
  bestScore: 8,
  lastScore: 8,
  bestStreak: 3,
  bestRoundsCompleted: 0,
  playCount: 1,
};

/**
 * T3-1-01 — main-equivalent outcome under this mock setup (saved fixture).
 * Includes response body fields §14.5 cares about: progress, XP/reward, streak/GPB.
 * energyDelta/hpDelta are non-zero so AC-4 actually pins energyGain(+5)/hpGain(+2).
 */
const SCORING_BASELINE = {
  progress: PROGRESS_ROW,
  reward: {
    xpDelta: 50,
    levelDelta: 0,
    energyDelta: 5,
    hpDelta: 2,
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

function setupFirstCompletionMocks(progressRow: Record<string, unknown> = PROGRESS_ROW) {
  prismaMock.avatar.findUnique.mockResolvedValue(AVATAR_BEFORE);
  prismaMock.avatar.update.mockResolvedValue(AVATAR_AFTER);
  prismaMock.activity.findUnique.mockResolvedValue(VALID_ACTIVITY);
  prismaMock.progress.findUnique.mockResolvedValue(null);
  prismaMock.progress.create.mockResolvedValue(progressRow);
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

  it("T3-1-01: SCORING_BASELINE records main-equivalent outcome for fixed completion", async () => {
    const res = await completeActivity(FIXED_BODY);

    expect(res.status).toBe(200);
    // §14.5 / T3-1-01: exact response body (progress + XP/reward + streak/GPB flags)
    expect(res.body).toEqual(SCORING_BASELINE);
    expect(prismaMock.avatar.update.mock.calls[0][0].data).toEqual(
      EXPECTED_AVATAR_UPDATE,
    );
    expect(prismaMock.gamePersonalBest.create.mock.calls[0][0].data).toEqual(
      EXPECTED_GPB_CREATE,
    );
  });

  it("T3-1-02: without gameSpecific matches SCORING_BASELINE (byte-identical outcome)", async () => {
    const res = await completeActivity(FIXED_BODY);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(SCORING_BASELINE);
    expect(res.body.progress).not.toHaveProperty("gameSpecific");
  });

  it("T3-1-03: with valid gameSpecific still matches without (XP/streak/GPB/response)", async () => {
    // Run A: without gameSpecific
    const without = await completeActivity(FIXED_BODY);
    expect(without.status).toBe(200);
    expect(without.body).toEqual(SCORING_BASELINE);
    const withoutAvatarUpdate = prismaMock.avatar.update.mock.calls[0][0].data;
    const withoutGpbCreate = prismaMock.gamePersonalBest.create.mock.calls[0][0].data;

    // Run B: same request with valid gameSpecific (DB row may carry telemetry; wire must not)
    vi.clearAllMocks();
    setupFirstCompletionMocks({
      ...PROGRESS_ROW,
      gameSpecific: validMoveMeasure,
    });

    const withGs = await completeActivity({
      ...FIXED_BODY,
      result: { ...FIXED_RESULT, gameSpecific: validMoveMeasure },
    });
    expect(withGs.status).toBe(200);

    // §14.5: telemetry must not perturb scoring / response body by so much as a point
    expect(withGs.body).toEqual(without.body);
    expect(withGs.body).toEqual(SCORING_BASELINE);
    expect(withGs.body.progress).not.toHaveProperty("gameSpecific");

    expect(prismaMock.avatar.update.mock.calls[0][0].data).toEqual(
      withoutAvatarUpdate,
    );
    expect(prismaMock.avatar.update.mock.calls[0][0].data).toEqual(
      EXPECTED_AVATAR_UPDATE,
    );
    expect(prismaMock.gamePersonalBest.create.mock.calls[0][0].data).toEqual(
      withoutGpbCreate,
    );
    expect(prismaMock.gamePersonalBest.create.mock.calls[0][0].data).toEqual(
      EXPECTED_GPB_CREATE,
    );
  });

  it("T3-1-04: GamePersonalBest after both identical to baseline; meta still null", async () => {
    const without = await completeActivity(FIXED_BODY);
    expect(without.status).toBe(200);
    expect(without.body.personalBest).toEqual(SCORING_BASELINE.personalBest);
    expect(without.body.personalBest.meta).toBeNull();
    expect(
      prismaMock.gamePersonalBest.create.mock.calls[0][0].data,
    ).not.toHaveProperty("meta");

    vi.clearAllMocks();
    setupFirstCompletionMocks({
      ...PROGRESS_ROW,
      gameSpecific: validMoveMeasure,
    });

    const withGs = await completeActivity({
      ...FIXED_BODY,
      result: { ...FIXED_RESULT, gameSpecific: validMoveMeasure },
    });
    expect(withGs.status).toBe(200);
    expect(withGs.body.personalBest).toEqual(SCORING_BASELINE.personalBest);
    expect(withGs.body.personalBest.meta).toBeNull();
    expect(
      prismaMock.gamePersonalBest.create.mock.calls[0][0].data,
    ).not.toHaveProperty("meta");
    expect(withGs.body.personalBest).toEqual(without.body.personalBest);
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
    // Rewards still awarded (GPB is best-effort; telemetry path is not)
    expect(res.body.reward).toEqual(SCORING_BASELINE.reward);
    expect(res.body.avatar).toEqual(SCORING_BASELINE.avatar);
    expect(res.body.progress).toEqual(SCORING_BASELINE.progress);
    expect(res.body.personalBest).toBeNull();
    expect(res.body.isNewHighScore).toBe(false);
    expect(res.body.isNewBestStreak).toBe(false);
    // Scoring write path still ran before the GPB catch
    expect(prismaMock.avatar.update).toHaveBeenCalled();
    expect(prismaMock.avatar.update.mock.calls[0][0].data).toEqual(
      EXPECTED_AVATAR_UPDATE,
    );
    expect(prismaMock.gamePersonalBest.create).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "[complete-activity] Failed to upsert GamePersonalBest:",
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });
});
