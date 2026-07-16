import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { GAME_SPECIFIC_SCHEMAS } from "../../validation/gameSpecific";

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

const validMoveMeasure = {
  dash: 3,
  jump: 4,
  toss: 5,
  impEvent: "dash" as const,
  impScore: 2,
  exitCorrect: true,
};

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

  it("C1-01: persists re-parsed move_measure gameSpecific on create", async () => {
    prismaMock.progress.findUnique.mockResolvedValue(null);
    prismaMock.progress.create.mockResolvedValue({
      id: "prog-1",
      studentId: "student-123",
      activityId: "valid-activity",
      status: "COMPLETED",
      gameSpecific: validMoveMeasure,
    });

    const res = await request(app)
      .post("/api/progress/complete-activity")
      .set("Authorization", "Bearer mock-token-for-mvp")
      .send({
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
  });

  it("E-3: when gameSpecific is absent, update omits the field (preserves stored value)", async () => {
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

    const res = await request(app)
      .post("/api/progress/complete-activity")
      .set("Authorization", "Bearer mock-token-for-mvp")
      .send({
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
  });

  it("E-12: invalid gameSpecific returns 400 before any Progress write", async () => {
    prismaMock.progress.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/progress/complete-activity")
      .set("Authorization", "Bearer mock-token-for-mvp")
      .send({
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
    expect(prismaMock.progress.create).not.toHaveBeenCalled();
    expect(prismaMock.progress.update).not.toHaveBeenCalled();
  });
});
