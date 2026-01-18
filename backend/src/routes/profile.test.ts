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
    process.env.ALLOW_DEV_ROLE_HEADER = "1"; // Enable dev header for auth mocking
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

  const mockStudent = {
    id: "student-456",
    name: "Test Student",
    email: "student@example.com",
    role: "student",
    school: "Test School",
    subject: null,
    avatarUrl: null,
    createdAt: new Date("2023-01-02"),
  };

  describe("GET /api/profile", () => {
    it("should return user profile when authenticated", async () => {
      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get("/api/profile")
        .set("x-user-id", "user-123")
        .set("x-role", "teacher");

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(mockUser.id);
    });

    it("should return 401 if not authenticated", async () => {
      // Remove dev header to simulate no auth
      delete process.env.ALLOW_DEV_ROLE_HEADER;

      const response = await request(app).get("/api/profile");
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/users/:id", () => {
    it("should allow teacher to view student profile", async () => {
      // Mock finding the student
      // @ts-ignore
      prismaMock.user.findUnique.mockImplementation(({ where }) => {
          if (where.id === "student-456") return Promise.resolve(mockStudent);
          return Promise.resolve(null);
      });

      const response = await request(app)
        .get("/api/users/student-456")
        .set("x-user-id", "user-123") // Teacher ID
        .set("x-role", "teacher");

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(mockStudent.id);
    });

    it("should allow admin to view any profile", async () => {
      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue(mockStudent);

      const response = await request(app)
        .get("/api/users/student-456")
        .set("x-user-id", "admin-000")
        .set("x-role", "admin");

      expect(response.status).toBe(200);
    });

    it("should forbid student from viewing other student profile", async () => {
       // @ts-ignore
       prismaMock.user.findUnique.mockResolvedValue(mockStudent);

       const response = await request(app)
         .get("/api/users/student-456")
         .set("x-user-id", "student-789") // Another student
         .set("x-role", "student");

       expect(response.status).toBe(403);
    });

    it("should allow user to view their own profile via ID", async () => {
        // @ts-ignore
        prismaMock.user.findUnique.mockResolvedValue(mockStudent);

        const response = await request(app)
          .get("/api/users/student-456")
          .set("x-user-id", "student-456") // Same ID
          .set("x-role", "student");

        expect(response.status).toBe(200);
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
    });
  });
});
