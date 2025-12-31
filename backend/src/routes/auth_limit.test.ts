import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../server";

// Mock Prisma to avoid DB calls
vi.mock("../utils/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("Auth Rate Limiting", () => {
  it("should enforce rate limit on /api/login", async () => {
    // Use a unique IP for this test to ensure isolation
    const ip = "192.168.1.1";

    // Make 20 allowed requests
    for (let i = 0; i < 20; i++) {
      const res = await request(app)
        .post("/api/login")
        .set("X-Forwarded-For", ip)
        .send({ email: "test@example.com", password: "password" });

      expect(res.status).not.toBe(429);
    }

    // The 21st request should fail with 429
    const res = await request(app)
      .post("/api/login")
      .set("X-Forwarded-For", ip)
      .send({ email: "test@example.com", password: "password" });

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      error: "Too many login/signup attempts, please try again later.",
    });
  });

  it("should enforce rate limit on /api/signup/student independently", async () => {
    // Use a DIFFERENT IP for this test so it starts fresh
    const ip = "192.168.1.2";

    // Make 20 allowed requests
    for (let i = 0; i < 20; i++) {
      const res = await request(app)
        .post("/api/signup/student")
        .set("X-Forwarded-For", ip)
        .send({
          name: "Test",
          email: "student@example.com",
          password: "password123",
        });

      expect(res.status).not.toBe(429);
    }

    // 21st request
    const res = await request(app)
      .post("/api/signup/student")
      .set("X-Forwarded-For", ip)
      .send({
        name: "Test",
        email: "student@example.com",
        password: "password123",
      });

    expect(res.status).toBe(429);
  });
});
