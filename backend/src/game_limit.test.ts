import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock Prisma
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  progress: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    createMany: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  avatar: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
  activity: {
    findUnique: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
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
import app from "./server";

describe("Game Action Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should rate limit excessive game actions", async () => {
    const agent = request(app);

    // Mock DB calls to succeed so we don't fail on logic before rate limit
    prismaMock.progress.findUnique.mockResolvedValue(null);
    prismaMock.progress.count.mockResolvedValue(0);
    prismaMock.avatar.findUnique.mockResolvedValue({
      energy: 100,
      hp: 100,
      xp: 0,
      level: 1,
    });
    prismaMock.avatar.update.mockResolvedValue({
      energy: 100,
      hp: 100,
      xp: 0,
      level: 1,
    });
    // #877/#878: the reward transaction's call shape (see the mocked-seam
    // note at the top of progressConcurrency.test.ts).
    prismaMock.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === "function"
        ? (arg as (tx: unknown) => unknown)(prismaMock)
        : Promise.all(arg as Promise<unknown>[]),
    );
    prismaMock.progress.createMany.mockResolvedValue({ count: 1 });
    prismaMock.progress.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.$queryRaw.mockResolvedValue([
      { id: "avatar-1", energy: 100, hp: 100, xp: 0, level: 1 },
    ]);
    prismaMock.avatar.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.progress.findUniqueOrThrow.mockResolvedValue({
      id: "prog-1",
      status: "COMPLETED",
    });
    prismaMock.activity.findUnique.mockResolvedValue({
      id: "act-1",
      lessonId: "lesson-1",
      content: "{}",
      // #876: the writer resolves the curriculum chain.
      Lesson: { id: "lesson-1", Unit: { Module: { slug: "stem-1" } } },
    });

    // Blast 5 requests (allowed in test env)
    for (let i = 0; i < 5; i++) {
      const response = await agent
        .post("/api/progress/complete-activity")
        .set("Authorization", "Bearer mock-token-for-mvp")
        .send({
          moduleSlug: "stem-1",
          activityId: "act-" + i,
          timeSpentS: 10,
        });

      if (response.status === 429) {
        throw new Error(`Rate limit hit prematurely at request ${i + 1}`);
      }
    }

    // The 6th request should fail
    const response = await agent
      .post("/api/progress/complete-activity")
      .set("Authorization", "Bearer mock-token-for-mvp")
      .send({
        moduleSlug: "stem-1",
        activityId: "act-over-limit",
        timeSpentS: 10,
      });

    expect(response.status).toBe(429);
    expect(response.body.error).toBe(
      "Too many game actions, please slow down.",
    );
  }, 30000); // Increase timeout for the loop
});
