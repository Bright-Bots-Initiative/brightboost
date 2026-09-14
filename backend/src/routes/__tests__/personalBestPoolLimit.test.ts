import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

/**
 * #849 — a pool-exhaustion (P2024) or transaction-timeout (P2028) failure in
 * the personal-best reconciliation is a capacity signal. It keeps the #640
 * reply contract (a record, not a reward: null row, false flags, the
 * completion still succeeds) but is logged distinctly so it is observable.
 */
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  progress: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  avatar: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
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
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
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

const AVATAR = {
  id: "avatar-1",
  studentId: "student-123",
  stage: "GENERAL",
  archetype: null,
  xp: 100,
  energy: 50,
  hp: 50,
  level: 1,
  speed: 0,
  control: 0,
  focus: 0,
};
const ROW = {
  id: "prog-1",
  studentId: "student-123",
  moduleSlug: "test-module",
  lessonId: "lesson-1",
  activityId: "valid-activity",
  status: "COMPLETED",
  timeSpentS: 10,
};

let ipSeq = 0;
function complete() {
  ipSeq += 1;
  return request(app)
    .post("/api/progress/complete-activity")
    .set("Authorization", "Bearer mock-token-for-mvp")
    .set("X-Forwarded-For", `203.0.113.${ipSeq}`)
    .send({
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      timeSpentS: 10,
      result: { gameKey: "move_measure", score: 8, total: 10 },
    });
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.activity.findUnique.mockResolvedValue({
    id: "valid-activity",
    lessonId: "lesson-1",
    content: JSON.stringify({ gameKey: "move_measure" }),
    Lesson: { id: "lesson-1", Unit: { Module: { slug: "test-module" } } },
  });
  prismaMock.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(prismaMock)
      : Promise.all(arg as Promise<unknown>[]),
  );
  prismaMock.progress.findUnique.mockResolvedValue(null);
  prismaMock.progress.createMany.mockResolvedValue({ count: 1 });
  prismaMock.progress.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.progress.findUniqueOrThrow.mockResolvedValue(ROW);
  prismaMock.progress.count.mockResolvedValue(1);
  prismaMock.avatar.findUnique.mockResolvedValue(AVATAR);
  prismaMock.$queryRaw.mockResolvedValue([AVATAR]);
  prismaMock.avatar.update.mockResolvedValue({ ...AVATAR, xp: 150 });
  prismaMock.avatar.updateMany.mockResolvedValue({ count: 0 });
  prismaMock.gamePersonalBest.findUnique.mockResolvedValue(null);
});

describe("#849 personal-best reconciliation under pool or transaction limits", () => {
  for (const code of ["P2024", "P2028"] as const) {
    it(`LIMIT-${code}: the completion still succeeds with a null record, and the limit is logged by code`, async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      prismaMock.gamePersonalBest.create.mockRejectedValueOnce(
        Object.assign(new Error("pool"), { code }),
      );

      const res = await complete();

      expect(res.status).toBe(200);
      expect(res.body.reward.xpDelta).toBe(50);
      expect(res.body.personalBest).toBeNull();
      expect(res.body.isNewHighScore).toBe(false);
      expect(res.body.isNewBestStreak).toBe(false);
      const logged = warnSpy.mock.calls.map((c) => String(c[0]));
      expect(
        logged.some(
          (m) => m.includes(code) && m.includes("pool/transaction limit"),
        ),
      ).toBe(true);
      expect(
        logged.some((m) => m.includes("Failed to upsert GamePersonalBest")),
      ).toBe(false);
      warnSpy.mockRestore();
    });
  }

  it("LIMIT-other: any other failure keeps the generic log line", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    prismaMock.gamePersonalBest.create.mockRejectedValueOnce(
      new Error("db down"),
    );

    const res = await complete();

    expect(res.status).toBe(200);
    expect(res.body.personalBest).toBeNull();
    expect(
      warnSpy.mock.calls.some((c) =>
        String(c[0]).includes("Failed to upsert GamePersonalBest"),
      ),
    ).toBe(true);
    warnSpy.mockRestore();
  });
});
