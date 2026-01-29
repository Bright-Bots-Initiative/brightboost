import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Use vi.hoisted to make sure prismaMock is available before mocks are applied
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  progress: {
    findMany: vi.fn(),
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

describe("Progress Route Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/get-progress", () => {
    it("should request specific fields from Prisma to avoid password leak", async () => {
      // Setup mock data
      // In a real DB call, Prisma would filter this. In the mock, we simulate the filtered return
      // to ensure the route handler passes the correct data to res.json.
      const safeUser = {
        id: "student-123",
        name: "Test Student",
        email: "test@example.com",
        role: "student",
        level: "Explorer",
        // NO PASSWORD HERE
      };

      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue(safeUser);
      // @ts-ignore
      prismaMock.progress.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get("/api/get-progress")
        .set("Authorization", "Bearer mock-token-for-mvp");

      expect(response.status).toBe(200);

      // 1. Verify that Prisma was called with 'select' to exclude password
      // @ts-ignore
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            email: true,
            // We want to ensure 'password' is NOT in the select keys or is explicitly false (though Prisma uses exclusion by omission in select)
            // Ideally we check that select exists and has the fields we want.
          }),
        }),
      );

      // Verify explicitly that we didn't ask for password
      // @ts-ignore
      const callArgs = prismaMock.user.findUnique.mock.calls[0][0];
      expect(callArgs.select).toBeDefined();
      expect(callArgs.select).not.toHaveProperty("password");

      // 2. Verify the response body (which comes from the mock) is clean
      expect(response.body.user).not.toHaveProperty("password");
    });

    it("should fetch progress by default (Legacy Compatibility)", async () => {
      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue({ id: "student-123" });
      // @ts-ignore
      prismaMock.progress.findMany.mockResolvedValue([{ id: "prog-1" }]);

      const response = await request(app)
        .get("/api/get-progress")
        .set("Authorization", "Bearer mock-token-for-mvp");

      expect(response.status).toBe(200);
      expect(response.body.progress).toHaveLength(1);
      expect(prismaMock.progress.findMany).toHaveBeenCalled();
    });

    it("should NOT fetch progress when excludeProgress=true", async () => {
      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue({ id: "student-123" });
      // @ts-ignore
      prismaMock.progress.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get("/api/get-progress?excludeProgress=true")
        .set("Authorization", "Bearer mock-token-for-mvp");

      expect(response.status).toBe(200);
      expect(response.body.progress).toEqual([]);
      expect(prismaMock.progress.findMany).not.toHaveBeenCalled();
    });

    it("should NOT fetch user when excludeUser=true", async () => {
      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue({ id: "student-123" }); // Should not be called if optimization works
      // @ts-ignore
      prismaMock.progress.findMany.mockResolvedValue([{ id: "prog-1" }]);

      const response = await request(app)
        .get("/api/get-progress?excludeUser=true")
        .set("Authorization", "Bearer mock-token-for-mvp");

      expect(response.status).toBe(200);
      expect(response.body.user).toBeNull();
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
      expect(response.body.progress).toHaveLength(1);
    });
  });
});
