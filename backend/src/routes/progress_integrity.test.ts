import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Hoist mocks
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  progress: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(), // Used by checkUnlocks
  },
  avatar: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  activity: {
    findUnique: vi.fn(),
  },
  ability: {
    findMany: vi.fn(), // Used by checkUnlocks
  },
  unlockedAbility: {
    findMany: vi.fn(),
    createMany: vi.fn(),
  },
}));

vi.mock("../utils/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@prisma/client", () => {
  return {
    PrismaClient: class {
      constructor() {
        return prismaMock;
      }
    },
  };
});

// Import app AFTER mocking
import app from "../server";

describe("Progress Integrity Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/progress/complete-activity", () => {
    it("should BLOCK completing a non-existent activity (Security Fix)", async () => {
      const studentId = "student-123";

      // Mock independent DB calls
      // 1. Avatar (for rewards)
      prismaMock.avatar.findUnique.mockResolvedValue({
        id: "avatar-1",
        studentId,
        archetype: "AI",
        xp: 100,
        energy: 100,
        hp: 100,
        level: 1,
      });

      // 2. Existing Progress (None)
      prismaMock.progress.findUnique.mockResolvedValue(null);

      // 3. Activity (Non-existent!)
      prismaMock.activity.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/progress/complete-activity")
        .set("Authorization", "Bearer mock-token-for-mvp")
        .send({
          moduleSlug: "test-module",
          activityId: "non-existent-activity",
          timeSpentS: 10,
        });

      // Fix: Expect 404
      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Activity not found");

      // Ensure creation was NOT called
      expect(prismaMock.progress.create).not.toHaveBeenCalled();
    });

    it("should ALLOW completing an EXISTING activity", async () => {
      const studentId = "student-123";

      prismaMock.avatar.findUnique.mockResolvedValue({
        id: "avatar-1",
        studentId,
        archetype: "AI",
        xp: 100,
        energy: 100,
        hp: 100,
        level: 1,
      });

      prismaMock.progress.findUnique.mockResolvedValue(null);

      // 3. Activity (EXISTS)
      prismaMock.activity.findUnique.mockResolvedValue({
        id: "valid-activity",
        lessonId: "lesson-1",
        title: "Test Activity",
        kind: "INFO",
        order: 1,
      });

      prismaMock.progress.create.mockResolvedValue({
        id: "prog-1",
        studentId,
        activityId: "valid-activity",
        status: "COMPLETED",
      });

      prismaMock.avatar.update.mockResolvedValue({
        id: "avatar-1",
        studentId,
        xp: 150,
        level: 1,
      });

      prismaMock.progress.count.mockResolvedValue(1);

      const response = await request(app)
        .post("/api/progress/complete-activity")
        .set("Authorization", "Bearer mock-token-for-mvp")
        .send({
          moduleSlug: "test-module",
          activityId: "valid-activity",
          timeSpentS: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.progress).toBeDefined();
    });
  });
});
