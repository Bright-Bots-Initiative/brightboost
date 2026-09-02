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
    updateMany: vi.fn(),
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
    updateMany: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
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

function setupFirstCompletionMocks(
  progressRow: Record<string, unknown> = PROGRESS_ROW,
) {
  prismaMock.progress.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
    Promise.all(ops),
  );
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

/** #640 — the GamePersonalBest row a replaying student already owns. */
const EXISTING_BEST = {
  id: "gpb-1",
  studentId: "student-123",
  gameKey: "move_measure",
  bestScore: 8,
  lastScore: 8,
  bestStreak: 3,
  bestRoundsCompleted: 4,
  playCount: 1,
  meta: null,
};

/** Progress row for an activity the student already finished once. */
const COMPLETED_PROGRESS_ROW = {
  id: "prog-1",
  studentId: "student-123",
  moduleSlug: "test-module",
  lessonId: "lesson-1",
  activityId: "valid-activity",
  status: "COMPLETED",
  timeSpentS: 45,
};

/** Every replay must return this reward block verbatim — zero, always (#640). */
const ZERO_REWARD = {
  xpDelta: 0,
  levelDelta: 0,
  energyDelta: 0,
  hpDelta: 0,
  newAbilitiesDelta: 0,
};

/**
 * Emulates the database's adjudication of the #809 conditional writes: a
 * guarded `updateMany` matches only when the stored field is strictly lower,
 * the unconditional pass applies lastScore/playCount/lastPlayedAt, and every
 * later read observes the row those writes produced. The response `personalBest`
 * therefore comes from the re-read, exactly as it does against Postgres.
 */
function armPersonalBestDb(initial: Record<string, unknown> | null) {
  let row: Record<string, unknown> | null = initial ? { ...initial } : null;
  prismaMock.gamePersonalBest.findUnique.mockImplementation(async () =>
    row ? { ...row } : null,
  );
  prismaMock.gamePersonalBest.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => {
      row = { id: "gpb-1", meta: null, ...data };
      return { ...row };
    },
  );
  prismaMock.gamePersonalBest.updateMany.mockImplementation(
    async ({
      where,
      data,
    }: {
      where: Record<string, { lt?: number } | unknown>;
      data: Record<string, unknown>;
    }) => {
      if (!row) return { count: 0 };
      for (const field of [
        "bestScore",
        "bestStreak",
        "bestRoundsCompleted",
      ] as const) {
        const guard = where[field] as { lt?: number } | undefined;
        if (guard?.lt !== undefined) {
          if ((row[field] as number) < guard.lt) {
            row[field] = data[field];
            return { count: 1 };
          }
          return { count: 0 };
        }
      }
      if (data.lastScore !== undefined) row.lastScore = data.lastScore;
      const inc = (data.playCount as { increment?: number } | undefined)
        ?.increment;
      if (inc) row.playCount = (row.playCount as number) + inc;
      if (data.lastPlayedAt) row.lastPlayedAt = data.lastPlayedAt;
      return { count: 1 };
    },
  );
}

function setupReplayMocks(existingBest: Record<string, unknown> | null) {
  prismaMock.avatar.findUnique.mockResolvedValue(AVATAR_BEFORE);
  prismaMock.avatar.update.mockResolvedValue(AVATAR_AFTER);
  prismaMock.activity.findUnique.mockResolvedValue(VALID_ACTIVITY);
  prismaMock.progress.findUnique.mockResolvedValue(COMPLETED_PROGRESS_ROW);
  prismaMock.progress.update.mockResolvedValue(COMPLETED_PROGRESS_ROW);
  prismaMock.progress.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.progress.count.mockResolvedValue(1);
  prismaMock.ability.findMany.mockResolvedValue([]);
  prismaMock.unlockedAbility.findMany.mockResolvedValue([]);
  prismaMock.unlockedAbility.createMany.mockResolvedValue({ count: 0 });
  prismaMock.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
    Promise.all(ops),
  );
  armPersonalBestDb(existingBest);
  prismaMock.gamePersonalBest.upsert.mockResolvedValue(PERSONAL_BEST);
}

function replayBody(result: Record<string, unknown>) {
  return { ...FIXED_BODY, timeSpentS: 30, result };
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
    const withoutGpbCreate =
      prismaMock.gamePersonalBest.create.mock.calls[0][0].data;

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

/**
 * #640 — replay reconciles GamePersonalBest while staying reward-free.
 *
 * Before the fix the COMPLETED short-circuit returned before the personal-best
 * upsert, so bestScore / lastScore / bestRoundsCompleted / playCount froze at the
 * first completion and the results screen's "New Record!" never persisted.
 * These pin BOTH halves: the record moves, and XP still does not.
 */
describe("POST /api/progress/complete-activity replay personal best (#640)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupReplayMocks(EXISTING_BEST);
  });

  it("PB-R-01: replay with a HIGHER score raises bestScore/lastScore/playCount with xpDelta 0", async () => {
    const res = await completeActivity(
      replayBody({
        gameKey: "move_measure",
        score: 12,
        total: 15,
        streakMax: 5,
        roundsCompleted: 6,
      }),
    );

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Already completed");

    // The record moves — through #809's conditional guards, never a
    // read-modify-write: each best field carries its own strictly-lower
    // predicate so a concurrent higher value cannot be regressed.
    const wheres = prismaMock.gamePersonalBest.updateMany.mock.calls.map(
      (c) => c[0].where,
    );
    expect(wheres).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ bestScore: { lt: 12 } }),
        expect.objectContaining({ bestStreak: { lt: 5 } }),
        expect.objectContaining({ bestRoundsCompleted: { lt: 6 } }),
      ]),
    );
    expect(prismaMock.gamePersonalBest.update).not.toHaveBeenCalled();
    expect(res.body.personalBest.bestScore).toBe(12);
    expect(res.body.personalBest.lastScore).toBe(12);
    expect(res.body.personalBest.playCount).toBe(2);
    expect(res.body.isNewHighScore).toBe(true);
    expect(res.body.isNewBestStreak).toBe(true);

    // …and no reward does.
    expect(res.body.reward).toEqual(ZERO_REWARD);
    expect(prismaMock.avatar.update).not.toHaveBeenCalled();
    expect(prismaMock.avatar.create).not.toHaveBeenCalled();
  });

  it("PB-R-02: replay with a LOWER score updates lastScore/playCount but NOT bestScore", async () => {
    const res = await completeActivity(
      replayBody({
        gameKey: "move_measure",
        score: 3,
        total: 15,
        streakMax: 1,
        roundsCompleted: 2,
      }),
    );

    expect(res.status).toBe(200);
    // The guards did not match (3 < 8 fails `lt`), so the stored best is
    // untouched — the database held it, no app-side Math.max involved.
    expect(res.body.personalBest.bestScore).toBe(8);
    expect(res.body.personalBest.bestStreak).toBe(3);
    expect(res.body.personalBest.bestRoundsCompleted).toBe(4);
    expect(res.body.personalBest.lastScore).toBe(3);
    expect(res.body.personalBest.playCount).toBe(2);
    expect(res.body.isNewHighScore).toBe(false);
    expect(res.body.isNewBestStreak).toBe(false);

    expect(res.body.reward).toEqual(ZERO_REWARD);
    expect(prismaMock.avatar.update).not.toHaveBeenCalled();
  });

  it("PB-R-03: replay tying the best is not a new record (strict >), still xpDelta 0", async () => {
    const res = await completeActivity(
      replayBody({
        gameKey: "move_measure",
        score: 8,
        total: 15,
        streakMax: 3,
        roundsCompleted: 4,
      }),
    );

    expect(res.status).toBe(200);
    expect(res.body.isNewHighScore).toBe(false);
    expect(res.body.isNewBestStreak).toBe(false);
    expect(res.body.personalBest.bestScore).toBe(8);
    expect(res.body.reward).toEqual(ZERO_REWARD);
  });

  it("PB-R-04: idempotency matrix — retry, refresh, double submit and replay never duplicate XP", async () => {
    // Same request four times over: an identical retry, a page refresh that
    // re-posts, a double submission, and a genuinely better replay. XP must be
    // 0 on every one of them; only the personal best is allowed to move.
    const repeats = [
      { label: "retry", result: { ...FIXED_RESULT, roundsCompleted: 4 } },
      { label: "refresh", result: { ...FIXED_RESULT, roundsCompleted: 4 } },
      {
        label: "double-submit",
        result: { ...FIXED_RESULT, roundsCompleted: 4 },
      },
      {
        label: "better-replay",
        result: {
          gameKey: "move_measure",
          score: 14,
          total: 15,
          streakMax: 6,
          roundsCompleted: 7,
        },
      },
    ];

    const observedBests: number[] = [];
    const observedPlayCounts: number[] = [];
    for (const { label, result } of repeats) {
      const res = await completeActivity(replayBody(result));
      expect(res.status, label).toBe(200);
      expect(res.body.message, label).toBe("Already completed");
      expect(res.body.reward, label).toEqual(ZERO_REWARD);
      observedBests.push(res.body.personalBest.bestScore);
      observedPlayCounts.push(res.body.personalBest.playCount);
    }

    // Four repeats, zero XP writes, zero level/ability churn.
    expect(prismaMock.avatar.update).not.toHaveBeenCalled();
    expect(prismaMock.avatar.create).not.toHaveBeenCalled();
    expect(prismaMock.unlockedAbility.createMany).not.toHaveBeenCalled();
    expect(prismaMock.progress.create).not.toHaveBeenCalled();

    // Every repeat still reconciled the record (playCount is the play counter,
    // XP is not) and only the better run moved the stored best — read back
    // from the emulated database, the way Postgres would report it.
    expect(observedBests).toEqual([8, 8, 8, 14]);
    expect(observedPlayCounts).toEqual([2, 3, 4, 5]);
  });

  it("PB-R-05: replay without a gameKey writes no record and still returns xpDelta 0", async () => {
    const res = await completeActivity(replayBody({ score: 9, total: 15 }));

    expect(res.status).toBe(200);
    expect(res.body.reward).toEqual(ZERO_REWARD);
    expect(res.body.personalBest).toBeNull();
    expect(res.body.isNewHighScore).toBe(false);
    expect(res.body.isNewBestStreak).toBe(false);
    expect(prismaMock.gamePersonalBest.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.gamePersonalBest.update).not.toHaveBeenCalled();
    expect(prismaMock.gamePersonalBest.create).not.toHaveBeenCalled();
  });

  it("PB-R-06: first-ever record on a replay creates the row (legacy completions predate GamePersonalBest)", async () => {
    setupReplayMocks(null);

    const res = await completeActivity(
      replayBody({
        gameKey: "move_measure",
        score: 8,
        total: 10,
        streakMax: 3,
      }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.gamePersonalBest.create.mock.calls[0][0].data).toEqual(
      EXPECTED_GPB_CREATE,
    );
    expect(res.body.personalBest).toEqual(PERSONAL_BEST);
    expect(res.body.isNewHighScore).toBe(true);
    expect(res.body.reward).toEqual(ZERO_REWARD);
  });

  it("PB-R-07: a failed record write never fails the replay and claims no record", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    prismaMock.gamePersonalBest.updateMany.mockRejectedValue(
      new Error("forced GPB failure"),
    );

    const res = await completeActivity(
      replayBody({
        gameKey: "move_measure",
        score: 12,
        total: 15,
        streakMax: 5,
      }),
    );

    expect(res.status).toBe(200);
    expect(res.body.reward).toEqual(ZERO_REWARD);
    expect(res.body.personalBest).toBeNull();
    expect(res.body.isNewHighScore).toBe(false);
    expect(res.body.isNewBestStreak).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      "[complete-activity] Failed to upsert GamePersonalBest:",
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it("PB-R-08: avatar-backfill replay keeps its backfilled XP and also reconciles the record", async () => {
    // completedCount=1 → XP_PER_ACTIVITY(50); the backfill delta is pre-existing
    // XP being surfaced, not a new award for this replay.
    const backfilledAvatar = {
      ...AVATAR_BEFORE,
      id: "avatar-backfilled",
      xp: 50,
    };
    prismaMock.avatar.findUnique.mockResolvedValue(null);
    prismaMock.avatar.create.mockResolvedValue(backfilledAvatar);

    const res = await completeActivity(
      replayBody({
        gameKey: "move_measure",
        score: 12,
        total: 15,
        streakMax: 5,
        roundsCompleted: 6,
      }),
    );

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Already completed (avatar backfilled)");
    expect(res.body.reward.xpDelta).toBe(50);
    // No fresh award: the avatar row was created with the backfill, not updated.
    expect(prismaMock.avatar.update).not.toHaveBeenCalled();
    expect(res.body.personalBest.bestScore).toBe(12);
    expect(res.body.isNewHighScore).toBe(true);
  });
});
