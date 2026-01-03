import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";

// Use vi.hoisted to make sure prismaMock is available before mocks are applied
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
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

// Mock dependencies
vi.mock("../utils/prisma", () => ({
  default: new PrismaClient(),
}));

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
    role: "teacher",
    school: "Test School",
    subject: "Math",
    avatarUrl: "http://example.com/avatar.png",
    createdAt: new Date("2023-01-01"),
  };

  describe("GET /api/profile", () => {
    it("should return user profile when authenticated", async () => {
      // Mock prisma response
      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      // We need to bypass authentication middleware for this test
      // Since we can't easily generate a valid JWT without the secret used in server,
      // we'll rely on the dev shim or mock the middleware.
      // But mocking middleware after importing app is hard.
      // So we use the dev shim header if allowed.

      // In test env, dev shim accepts x-user-id header if ALLOW_DEV_ROLE_HEADER is set
      process.env.ALLOW_DEV_ROLE_HEADER = "1";

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
    });

    it("should return 401 if not authenticated", async () => {
      const response = await request(app).get("/api/profile");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/edit-profile", () => {
    it("should update user profile", async () => {
      // @ts-ignore
      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        name: "Updated Name",
        school: "Updated School",
      });

      process.env.ALLOW_DEV_ROLE_HEADER = "1";

      const response = await request(app)
        .post("/api/edit-profile")
        .set("x-user-id", "user-123")
        .set("x-role", "teacher")
        .send({
          name: "Updated Name",
          school: "Updated School",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.name).toBe("Updated Name");
      expect(response.body.user.school).toBe("Updated School");

      // @ts-ignore
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-123" },
          data: expect.objectContaining({
            name: "Updated Name",
            school: "Updated School",
          }),
        }),
      );
    });

    it("should return 400 for invalid data", async () => {
      process.env.ALLOW_DEV_ROLE_HEADER = "1";

      const response = await request(app)
        .post("/api/edit-profile")
        .set("x-user-id", "user-123")
        .set("x-role", "teacher")
        .send({
          name: "", // Invalid: empty name
        });

      expect(response.status).toBe(400);
    });
  });
});
