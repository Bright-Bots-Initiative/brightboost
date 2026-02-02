import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock Prisma
const prismaMock = vi.hoisted(() => ({
  progress: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  avatar: {
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  activity: {
    findUnique: vi.fn(),
  },
  ability: {
    findMany: vi.fn(),
  },
  unlockedAbility: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    count: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
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

describe("Progress Route Input Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation to prevent crashes
    // @ts-ignore
    prismaMock.progress.count.mockResolvedValue(0);
    // @ts-ignore
    prismaMock.avatar.findUnique.mockResolvedValue({
      id: "student-123",
      level: 1,
      archetype: "AI",
    });
    // @ts-ignore
    prismaMock.ability.findMany.mockResolvedValue([]);
    // @ts-ignore
    prismaMock.unlockedAbility.findMany.mockResolvedValue([]);
    // @ts-ignore
    prismaMock.unlockedAbility.count.mockResolvedValue(0);
    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue({
      id: "student-123",
      role: "student",
    });
  });

  describe("POST /api/progress/complete-activity", () => {
    it("should return 400 when required fields are missing", async () => {
      const response = await request(app)
        .post("/api/progress/complete-activity")
        .set("Authorization", "Bearer mock-token-for-mvp")
        .send({
          // Missing moduleSlug, lessonId, activityId
          timeSpentS: 10,
        });

      // Currently likely 500 or 200 depending on how loose the code is
      // We check for 400 because that's our goal
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 400 when timeSpentS is negative", async () => {
      const response = await request(app)
        .post("/api/progress/complete-activity")
        .set("Authorization", "Bearer mock-token-for-mvp")
        .send({
          moduleSlug: "test-module",
          lessonId: "test-lesson",
          activityId: "test-activity",
          timeSpentS: -100, // Negative time
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 200 for valid input", async () => {
      // @ts-ignore
      prismaMock.progress.findUnique.mockResolvedValue(null);
      // @ts-ignore
      prismaMock.progress.create.mockResolvedValue({
        id: "new-progress",
        status: "COMPLETED",
        timeSpentS: 10,
      });
      // @ts-ignore
      prismaMock.avatar.update.mockResolvedValue({});
    // @ts-ignore
    prismaMock.activity.findUnique.mockResolvedValue({ id: "test-activity" });

      const response = await request(app)
        .post("/api/progress/complete-activity")
        .set("Authorization", "Bearer mock-token-for-mvp")
        .send({
          moduleSlug: "test-module",
          lessonId: "test-lesson",
          activityId: "test-activity",
          timeSpentS: 10,
        });

      expect(response.status).toBe(200);
    });
  });
});
