import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock Prisma
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
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

describe("Security: XSS Prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/signup/student", () => {
    it("should reject names containing HTML tags", async () => {
      const response = await request(app).post("/api/signup/student").send({
        name: "Student <script>alert(1)</script>",
        email: "xss@test.com",
        password: "Password123",
      });

      expect(response.status).toBe(400);
      // The error structure from Zod is { error: [ { ... message: "..." } ] }
      expect(JSON.stringify(response.body)).toContain(
        "Input cannot contain HTML characters",
      );
    });

    it("should reject names containing <", async () => {
      const response = await request(app).post("/api/signup/student").send({
        name: "Student <",
        email: "xss2@test.com",
        password: "Password123",
      });

      expect(response.status).toBe(400);
    });

    it("should allow safe names", async () => {
      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue(null);
      // @ts-ignore
      prismaMock.user.create.mockResolvedValue({
        id: "user-123",
        email: "safe@test.com",
        role: "student",
        name: "Safe Student",
      });

      const response = await request(app).post("/api/signup/student").send({
        name: "Safe Student",
        email: "safe@test.com",
        password: "Password123",
      });

      expect(response.status).toBe(201);
    });
  });

  describe("POST /api/edit-profile", () => {
    it("should reject school names containing HTML tags", async () => {
      // Setup mock user for update
      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue({
        id: "student-123",
        role: "student",
      });

      const response = await request(app)
        .post("/api/edit-profile")
        .set("Authorization", "Bearer mock-token-for-mvp") // Uses devRoleShim
        .send({
          school: "<img src=x onerror=alert(1)>",
        });

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).toContain(
        "Input cannot contain HTML characters",
      );
    });

    it("should reject subject names containing HTML tags", async () => {
      const response = await request(app)
        .post("/api/edit-profile")
        .set("Authorization", "Bearer mock-token-for-mvp") // Uses devRoleShim
        .send({
          subject: "Math <b>101</b>",
        });

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).toContain(
        "Input cannot contain HTML characters",
      );
    });
  });
});
