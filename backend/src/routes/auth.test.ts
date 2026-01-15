import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Use vi.hoisted to make sure prismaMock is available before mocks are applied
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
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

describe("Auth Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/signup/student", () => {
    it("should create a new student", async () => {
      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue(null);
      // @ts-ignore
      prismaMock.user.create.mockResolvedValue({
        id: "user-123",
        email: "student@test.com",
        role: "student",
        password: "hashedpassword",
      });

      const response = await request(app).post("/api/signup/student").send({
        name: "Test Student",
        email: "student@test.com",
        password: "Password123", // Strong password
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("token");
      expect(response.body.user).toHaveProperty("email", "student@test.com");
      // @ts-ignore
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: "student",
          }),
        }),
      );
    });

    it("should return 409 if email exists", async () => {
      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue({ id: "existing" });

      const response = await request(app).post("/api/signup/student").send({
        name: "Test Student",
        email: "existing@test.com",
        password: "Password123", // Strong password
      });

      expect(response.status).toBe(409);
    });
  });

  describe("POST /api/login", () => {
    it("should login successfully with valid credentials", async () => {
      const password = "password123";
      const hashedPassword = await bcrypt.hash(password, 10);

      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue({
        id: "user-123",
        email: "user@test.com",
        password: hashedPassword,
        role: "student",
      });

      const response = await request(app).post("/api/login").send({
        email: "user@test.com",
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
    });

    it("should reject plaintext credentials", async () => {
      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue({
        id: "user-123",
        email: "user@test.com",
        password: "password123", // Stored as plaintext
        role: "student",
      });

      const response = await request(app).post("/api/login").send({
        email: "user@test.com",
        password: "password123",
      });

      expect(response.status).toBe(401);
    });

    it("should return 401 for invalid password", async () => {
      const hashedPassword = await bcrypt.hash("correctpassword", 10);

      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue({
        id: "user-123",
        email: "user@test.com",
        password: hashedPassword,
        role: "student",
      });

      const response = await request(app).post("/api/login").send({
        email: "user@test.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
    });
  });
});
