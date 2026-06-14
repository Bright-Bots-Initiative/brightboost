import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Regression guard for the `game_completed` server-side mirror.
//
// Diagnosed 2026-06-14: `game_completed` was showing zero data in PostHog.
// Root cause was H1 (benign) — no genuine first completions had occurred yet,
// NOT a wiring bug. This test pins the two properties that matter so a future
// refactor (moving the trackServer call, or tightening the idempotency guard)
// can't silently break the event:
//   1. A genuine FIRST completion fires `game_completed`.
//   2. A re-completion (already COMPLETED) does NOT fire it again.

// Hoisted prisma mock (per-file pattern used across the route tests).
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

vi.mock("../utils/prisma", () => ({ default: prismaMock }));

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return prismaMock;
    }
  },
}));

// Spy on the analytics shim so we can assert the mirror fires.
vi.mock("../services/analytics", () => ({
  trackServer: vi.fn(),
  shutdownAnalytics: vi.fn(),
  getAnalyticsClient: vi.fn(() => null),
}));

import app from "../server";
import { trackServer } from "../services/analytics";

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

function gameCompletedCalls() {
  return (trackServer as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter(
    (c) => c[1] === "game_completed",
  );
}

describe("game_completed server-side mirror", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Shared happy-path mocks for the reward pipeline.
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

  it("fires game_completed on a genuine first completion", async () => {
    prismaMock.progress.findUnique.mockResolvedValue(null); // never completed before
    prismaMock.progress.create.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
    });

    const res = await request(app)
      .post("/api/progress/complete-activity")
      .set("Authorization", "Bearer mock-token-for-mvp")
      .send({
        moduleSlug: "test-module",
        lessonId: "lesson-1",
        activityId: "valid-activity",
        timeSpentS: 12,
        result: { gameKey: "tank_trek", score: 5 },
      });

    expect(res.status).toBe(200);
    expect(trackServer).toHaveBeenCalledWith(
      "student-123",
      "game_completed",
      expect.objectContaining({
        module_slug: "test-module",
        activity_id: "valid-activity",
        game_id: "tank_trek",
        score: 5,
        time_spent_seconds: 12,
      }),
    );
    expect(gameCompletedCalls()).toHaveLength(1);
  });

  it("does NOT fire game_completed on a re-completion (idempotent)", async () => {
    // Activity already completed earlier — the guard must short-circuit.
    prismaMock.progress.findUnique.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
    });

    const res = await request(app)
      .post("/api/progress/complete-activity")
      .set("Authorization", "Bearer mock-token-for-mvp")
      .send({
        moduleSlug: "test-module",
        lessonId: "lesson-1",
        activityId: "valid-activity",
        timeSpentS: 12,
        result: { gameKey: "tank_trek", score: 5 },
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Already completed");
    expect(gameCompletedCalls()).toHaveLength(0);
    expect(prismaMock.progress.create).not.toHaveBeenCalled();
  });
});
