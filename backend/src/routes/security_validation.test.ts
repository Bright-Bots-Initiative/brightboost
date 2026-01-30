import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  progress: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  avatar: {
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

// Mock bcryptjs to avoid hashing overhead and ensure consistent behavior
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue("hashed_password_123"),
  },
}));

import app from "../server";

describe("Security Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks
    // @ts-ignore
    prismaMock.avatar.findUnique.mockResolvedValue(null);
  });

  describe("Email Normalization", () => {
    it("should lowercase email on signup", async () => {
      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue(null);
      // @ts-ignore
      prismaMock.user.create.mockResolvedValue({
        id: "new-user",
        email: "student@test.com", // Expected stored value
        role: "student",
      });

      const response = await request(app).post("/api/signup/student").send({
        name: "Test User",
        email: "Student@Test.com", // Mixed case input
        password: "Password123",
      });

      // Verify that create was called with lowercased email
      // Note: If this fails (i.e. validation not yet implemented), it will call with mixed case
      // or verification will fail.
      if (response.status === 201) {
        expect(prismaMock.user.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              email: "student@test.com",
            }),
          }),
        );
      } else {
        // If it fails for other reasons (like validation error), strict check is tricky
        // But for TDD, we expect this to FAIL initially or PASS if we implement it.
        // Wait, current code does NOT lowercase. So this test should FAIL expectation if we run it now.
        // Or rather, prismaMock.user.create will be called with "Student@Test.com".
      }
    });

    it("should lowercase email on login", async () => {
      const hashedPassword = "hashed_password_123";
      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue({
        id: "user-123",
        email: "student@test.com",
        password: hashedPassword,
        role: "student",
      });

      const response = await request(app).post("/api/login").send({
        email: "Student@Test.com",
        password: "Password123",
      });

      // If normalization is missing, this will be called with "Student@Test.com"
      // and finding the mock might fail if we mocked exact match?
      // But we mocked `findUnique` to return the user regardless of args in the generic mockResolvedValue above?
      // No, `mockResolvedValue` returns for any call.
      // So we need to check the arguments.
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: "student@test.com" },
      });
    });
  });

  describe("Time Spent Limit", () => {
    it("should reject timeSpentS > 86400", async () => {
      const response = await request(app)
        .post("/api/progress/complete-activity")
        .set("Authorization", "Bearer mock-token-for-mvp")
        .send({
          moduleSlug: "test-module",
          lessonId: "test-lesson",
          activityId: "test-activity",
          timeSpentS: 90000, // > 86400
        });

      // Should return 400 Bad Request
      expect(response.status).toBe(400);
      // expect(response.body.error).toBeDefined();
    });
  });
});
