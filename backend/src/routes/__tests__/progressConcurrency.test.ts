import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

/**
 * #821 / #809 — complete-activity atomicity and personal-best hardening.
 *
 * Concurrency here is simulated at the interleaving level (A1-03 mock-Prisma
 * strategy): the mock returns the SAME stale read to two sequential requests,
 * which is exactly what two racing transactions observe, and the claim
 * (`updateMany` with a status guard / `create` P2002) resolves the way the
 * database guarantees — first writer {count:1}/row, second {count:0}/P2002.
 * The real-database reproduction (12/12 duplicate XP, unanswered loser) is
 * recorded on #821.
 *
 * RED evidence: on pre-fix main, DUP-1 fails (game_completed fired twice and
 * both requests awarded XP), CREATE-1 times out (loser's P2002 was an
 * unhandled rejection and the request got no response), ATOMIC-1/2 fail (no
 * conditional write exists), VAL-1 fails (malformed gameKey accepted).
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

const trackServerMock = vi.hoisted(() => vi.fn());
vi.mock("../../services/analytics", () => ({
  trackServer: trackServerMock,
  shutdownAnalytics: vi.fn(),
  getAnalyticsClient: vi.fn(() => null),
}));

import app from "../../server";
import { GAME_SPECIFIC_SCHEMAS } from "../../validation/gameSpecific";

const ACTIVITY = {
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
  energy: 50,
  hp: 50,
  level: 1,
  speed: 0,
  control: 0,
  focus: 0,
};

const IN_PROGRESS_ROW = {
  id: "prog-1",
  studentId: "student-123",
  moduleSlug: "test-module",
  lessonId: "lesson-1",
  activityId: "valid-activity",
  status: "IN_PROGRESS",
  timeSpentS: 10,
};

const COMPLETED_ROW = {
  ...IN_PROGRESS_ROW,
  status: "COMPLETED",
  timeSpentS: 55,
};

const BODY = {
  moduleSlug: "test-module",
  lessonId: "lesson-1",
  activityId: "valid-activity",
  timeSpentS: 45,
  result: { gameKey: "move_measure", score: 8, total: 10, streakMax: 3 },
};

let ipSeq = 0;
function completeActivity(body: Record<string, unknown>) {
  ipSeq += 1;
  return request(app)
    .post("/api/progress/complete-activity")
    .set("Authorization", "Bearer mock-token-for-mvp")
    .set("X-Forwarded-For", `203.0.113.${ipSeq}`)
    .send(body);
}

function armHappyAvatar() {
  prismaMock.avatar.findUnique.mockResolvedValue(AVATAR);
  prismaMock.avatar.update.mockResolvedValue({ ...AVATAR, xp: 150 });
  prismaMock.ability.findMany.mockResolvedValue([]);
  prismaMock.unlockedAbility.findMany.mockResolvedValue([]);
}

function armQuietPersonalBest() {
  prismaMock.gamePersonalBest.findUnique.mockResolvedValue(null);
  prismaMock.gamePersonalBest.create.mockResolvedValue({
    id: "gpb-1",
    studentId: "student-123",
    gameKey: "move_measure",
    bestScore: 8,
    lastScore: 8,
    bestStreak: 3,
    bestRoundsCompleted: 0,
    playCount: 1,
  });
  prismaMock.gamePersonalBest.updateMany.mockResolvedValue({ count: 1 });
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
    Promise.all(ops),
  );
  prismaMock.activity.findUnique.mockResolvedValue(ACTIVITY);
  armHappyAvatar();
  armQuietPersonalBest();
});

describe("#821 — concurrent first completion of an existing IN_PROGRESS row", () => {
  it("DUP-1: awards XP and fires game_completed exactly once across a stale-read pair", async () => {
    // Both requests read the same not-yet-completed row — the racing reads.
    prismaMock.progress.findUnique
      .mockResolvedValueOnce(IN_PROGRESS_ROW) // request 1 initial read
      .mockResolvedValueOnce(IN_PROGRESS_ROW) // request 2 initial read (stale)
      .mockResolvedValue(COMPLETED_ROW); // any later re-read sees the winner's write
    // The database guarantees exactly one claimant.
    prismaMock.progress.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    // Pre-fix path used unguarded update; keep it armed so the old code runs.
    prismaMock.progress.update.mockResolvedValue(COMPLETED_ROW);

    const res1 = await completeActivity(BODY);
    const res2 = await completeActivity(BODY);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const completedEvents = trackServerMock.mock.calls.filter(
      (c) => c[1] === "game_completed",
    );
    expect(completedEvents).toHaveLength(1);

    // Exactly one request carries the award; the loser is reward-free.
    const deltas = [res1.body.reward.xpDelta, res2.body.reward.xpDelta].sort(
      (a, b) => a - b,
    );
    expect(deltas[1]).toBeGreaterThan(0);
    expect(deltas[0]).toBe(0);
    // Rewards were applied to the avatar exactly once.
    expect(prismaMock.avatar.update).toHaveBeenCalledTimes(1);
    // #827 review N1: pin that the claim ASKS the right question — the status
    // guard is what makes the database adjudicate, not the mock's answers.
    expect(
      prismaMock.progress.updateMany.mock.calls[0][0].where.status,
    ).toEqual({ not: "COMPLETED" });
  });

  it("DUP-2: the losing request still reconciles the personal best (a loss is a replay)", async () => {
    prismaMock.progress.findUnique
      .mockResolvedValueOnce(IN_PROGRESS_ROW)
      .mockResolvedValue(COMPLETED_ROW);
    prismaMock.progress.updateMany.mockResolvedValue({ count: 0 });

    const res = await completeActivity(BODY);

    expect(res.status).toBe(200);
    expect(res.body.reward.xpDelta).toBe(0);
    // Personal best was still touched for the losing submission (#640 contract).
    expect(prismaMock.gamePersonalBest.create).toHaveBeenCalledTimes(1);
    // #827 review N1: the claim carried its status guard.
    expect(
      prismaMock.progress.updateMany.mock.calls[0][0].where.status,
    ).toEqual({ not: "COMPLETED" });
  });
});

describe("#821 — concurrent first completion with no existing row", () => {
  it("CREATE-1: the P2002 loser gets a reward-free 200, never an unanswered request", async () => {
    prismaMock.progress.findUnique
      .mockResolvedValueOnce(null) // initial read: no row yet
      .mockResolvedValue(COMPLETED_ROW); // loser's re-read sees the winner's row
    const p2002 = Object.assign(
      new Error(
        "Unique constraint failed on the fields: (`studentId`,`activityId`)",
      ),
      { code: "P2002" },
    );
    prismaMock.progress.create.mockRejectedValueOnce(p2002);

    const res = await completeActivity(BODY);

    expect(res.status).toBe(200);
    expect(res.body.reward.xpDelta).toBe(0);
    expect(
      trackServerMock.mock.calls.filter((c) => c[1] === "game_completed"),
    ).toHaveLength(0);
  }, 5000);

  it("CREATE-3: losing the create to a CHECKPOINT still completes and awards (#827 review B1)", async () => {
    // The unique key can be taken by a NON-completing writer: a checkpoint
    // upsert creates the row as IN_PROGRESS between this request's read and
    // its create. P2002 then proves the row exists — NOT that the activity
    // completed. Pre-fix, this request answered "Already completed" with
    // xpDelta 0 and the play was silently discarded.
    prismaMock.progress.findUnique
      .mockResolvedValueOnce(null) // initial read: no row yet
      .mockResolvedValue(IN_PROGRESS_ROW); // re-read: the checkpoint's row
    const p2002 = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
    });
    prismaMock.progress.create.mockRejectedValueOnce(p2002);
    prismaMock.progress.updateMany.mockResolvedValue({ count: 1 });

    const res = await completeActivity(BODY);

    expect(res.status).toBe(200);
    // This request still owns the completion: it claimed the checkpoint's row.
    expect(res.body.reward.xpDelta).toBeGreaterThan(0);
    expect(res.body.progress.status).toBe("COMPLETED");
    expect(
      trackServerMock.mock.calls.filter((c) => c[1] === "game_completed"),
    ).toHaveLength(1);
    const claim = prismaMock.progress.updateMany.mock.calls[0][0];
    expect(claim.where).toEqual({
      id: IN_PROGRESS_ROW.id,
      status: { not: "COMPLETED" },
    });
  }, 5000);

  it("CREATE-4: losing the create AND the follow-up claim is reward-free, never doubled", async () => {
    // Worst case: the checkpoint row is then completed by yet another racer
    // before this request's claim lands — the claim matches zero rows.
    prismaMock.progress.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(IN_PROGRESS_ROW) // P2002 re-read
      .mockResolvedValue(COMPLETED_ROW); // post-claim re-read
    const p2002 = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
    });
    prismaMock.progress.create.mockRejectedValueOnce(p2002);
    prismaMock.progress.updateMany.mockResolvedValue({ count: 0 });

    const res = await completeActivity(BODY);

    expect(res.status).toBe(200);
    expect(res.body.reward.xpDelta).toBe(0);
    expect(
      trackServerMock.mock.calls.filter((c) => c[1] === "game_completed"),
    ).toHaveLength(0);
  }, 5000);

  it("CREATE-2: a non-P2002 create failure surfaces as a JSON 500, not a hang", async () => {
    prismaMock.progress.findUnique.mockResolvedValue(null);
    prismaMock.progress.create.mockRejectedValueOnce(new Error("db down"));

    const res = await completeActivity(BODY);

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  }, 5000);
});

describe("#809 — atomic personal-best reconciliation", () => {
  const EXISTING_BEST = {
    id: "gpb-1",
    studentId: "student-123",
    gameKey: "move_measure",
    bestScore: 8,
    lastScore: 8,
    bestStreak: 3,
    bestRoundsCompleted: 5,
    playCount: 2,
  };

  function armReplayWithBest() {
    prismaMock.progress.findUnique.mockResolvedValue(COMPLETED_ROW);
    prismaMock.gamePersonalBest.findUnique.mockResolvedValue(EXISTING_BEST);
  }

  it("ATOMIC-1: best fields are written with conditional guards, not read-modify-write", async () => {
    armReplayWithBest();
    prismaMock.gamePersonalBest.updateMany.mockResolvedValue({ count: 1 });

    const res = await completeActivity({
      ...BODY,
      result: { ...BODY.result, score: 9, streakMax: 4, roundsCompleted: 6 },
    });

    expect(res.status).toBe(200);
    const wheres = prismaMock.gamePersonalBest.updateMany.mock.calls.map(
      (c) => c[0].where,
    );
    // Each best field carries its own strictly-less-than guard — the write
    // cannot regress a concurrent higher value (#809 item 1).
    expect(wheres).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ bestScore: { lt: 9 } }),
        expect.objectContaining({ bestStreak: { lt: 4 } }),
        expect.objectContaining({ bestRoundsCompleted: { lt: 6 } }),
      ]),
    );
    expect(prismaMock.gamePersonalBest.update).not.toHaveBeenCalled();
    expect(res.body.isNewHighScore).toBe(true);
  });

  it("ATOMIC-2: a lower replay reports no record and cannot regress the stored best", async () => {
    armReplayWithBest();
    // The database reports no row matched the strictly-greater guard.
    prismaMock.gamePersonalBest.updateMany.mockImplementation(
      ({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve({
          count:
            where.bestScore || where.bestStreak || where.bestRoundsCompleted
              ? 0
              : 1,
        }),
    );

    const res = await completeActivity({
      ...BODY,
      result: { ...BODY.result, score: 5, streakMax: 1, roundsCompleted: 1 },
    });

    expect(res.status).toBe(200);
    expect(res.body.isNewHighScore).toBe(false);
    expect(res.body.isNewBestStreak).toBe(false);
  });

  it("ATOMIC-3: a create loser (P2002) falls through to the conditional update path", async () => {
    armReplayWithBest();
    prismaMock.gamePersonalBest.findUnique
      .mockResolvedValueOnce(null) // probe saw no row (the race)
      .mockResolvedValue(EXISTING_BEST); // re-reads see the winner's row
    const p2002 = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
    });
    prismaMock.gamePersonalBest.create.mockRejectedValueOnce(p2002);
    prismaMock.gamePersonalBest.updateMany.mockResolvedValue({ count: 1 });

    const res = await completeActivity(BODY);

    expect(res.status).toBe(200);
    // Not the pre-fix null fallback: the loser reconciled via update instead.
    expect(res.body.personalBest).not.toBeNull();
    expect(prismaMock.gamePersonalBest.updateMany).toHaveBeenCalled();
  });

  it("PIN-1: first-completion write failure reports false flags and null best (#809 item 5)", async () => {
    prismaMock.progress.findUnique.mockResolvedValueOnce(null);
    prismaMock.progress.create.mockResolvedValue(COMPLETED_ROW);
    prismaMock.gamePersonalBest.findUnique.mockResolvedValue(null);
    prismaMock.gamePersonalBest.create.mockRejectedValue(new Error("db down"));

    const res = await completeActivity(BODY);

    expect(res.status).toBe(200);
    expect(res.body.personalBest).toBeNull();
    expect(res.body.isNewHighScore).toBe(false);
    expect(res.body.isNewBestStreak).toBe(false);
  });
});

describe("#809 — gameKey validation", () => {
  it("VAL-1: rejects a malformed gameKey with 400", async () => {
    prismaMock.progress.findUnique.mockResolvedValue(null);
    prismaMock.progress.create.mockResolvedValue(COMPLETED_ROW);

    const res = await completeActivity({
      ...BODY,
      result: { gameKey: "Not A Key!;--", score: 1 },
    });

    expect(res.status).toBe(400);
  });

  it("VAL-2: every registered game key still passes the tightened pattern", async () => {
    // Self-maintaining (#827 review N8): iterate the real registry so a new
    // game key that fails the pattern is caught here, not in production.
    for (const key of Object.keys(GAME_SPECIFIC_SCHEMAS)) {
      prismaMock.progress.findUnique.mockResolvedValue(null);
      prismaMock.progress.create.mockResolvedValue(COMPLETED_ROW);
      const res = await completeActivity({
        ...BODY,
        result: { gameKey: key, score: 1 },
      });
      expect(res.status, `gameKey ${key}`).toBe(200);
    }
  });
});
