import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock Prisma
const prismaMock = vi.hoisted(() => ({
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
import app from "./server";

describe("Security Limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject payloads larger than the limit", async () => {
    // Generate a large payload (approx 200KB)
    const largeString = "a".repeat(200 * 1024);

    const response = await request(app).post("/api/login").send({
      email: "test@example.com",
      password: "password123",
      padding: largeString,
    });

    // Express default is 100kb, so this should return 413 even without my change if default is active.
    // If it returns 413, then I should lower the limit to 50kb and test with 60kb to verify MY change.
    // Let's verify what happens with 200kb first.

    // If status is 413, it means protection works.
    // If status is 400 (Zod error) or 200 (Mocked success), protection is missing or limit is higher.
    // I expect 413 because express defaults to 100kb.
    expect(response.status).toBe(413);
  });

  it("should reject payloads slightly larger than 50kb (proposed limit)", async () => {
    // Generate a payload approx 60KB
    const largeString = "a".repeat(60 * 1024);

    const response = await request(app).post("/api/login").send({
      email: "test@example.com",
      password: "password123",
      padding: largeString,
    });

    expect(response.status).toBe(413);
  });
});
