import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";

// Mock environment variables before importing anything
process.env.ALLOW_DEV_ROLE_HEADER = "1";
process.env.NODE_ENV = "test";

// Use vi.hoisted to make sure prismaMock is available before mocks are applied
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@prisma/client", () => {
  return {
    PrismaClient: class { constructor() { return prismaMock; } },
  };
});

// Import app AFTER mocking
import app from "../server";

describe("Profile Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = {
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
    school: "Test School",
    subject: "Math",
    role: "teacher",
    avatarUrl: "http://example.com/avatar.png",
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };

  describe("GET /api/profile", () => {
    it("should return the user profile when authenticated", async () => {
      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get("/api/profile")
        .set("x-user-id", "user-123")
        .set("x-role", "teacher");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        school: mockUser.school,
        subject: mockUser.subject,
        role: mockUser.role,
        avatar: mockUser.avatarUrl,
        created_at: mockUser.createdAt.toISOString(),
      });
      // @ts-ignore
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
        select: expect.any(Object),
      });
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app).get("/api/profile");
      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/profile", () => {
    it("should update the user profile", async () => {
      const updatedUser = { ...mockUser, name: "Updated Name", school: "New School" };
      // @ts-ignore
      prismaMock.user.update.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put("/api/profile")
        .set("x-user-id", "user-123")
        .set("x-role", "teacher")
        .send({
          name: "Updated Name",
          school: "New School",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toEqual({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        school: updatedUser.school,
        subject: updatedUser.subject,
        role: updatedUser.role,
        avatar: updatedUser.avatarUrl,
        created_at: updatedUser.createdAt.toISOString(),
      });
      // @ts-ignore
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          name: "Updated Name",
          school: "New School",
          subject: undefined,
        },
        select: expect.any(Object),
      });
    });

    it("should return 400 for invalid data", async () => {
      const response = await request(app)
        .put("/api/profile")
        .set("x-user-id", "user-123")
        .set("x-role", "teacher")
        .send({
          name: "", // Empty name is invalid
        });

      expect(response.status).toBe(400);
    });
  });
});
