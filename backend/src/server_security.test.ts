import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock Prisma
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  progress: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  avatar: {
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

// Import app AFTER mocking
import app from "./server";

describe("Server Security Headers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct Strict-Transport-Security header", async () => {
    const response = await request(app).get("/health");
    expect(response.headers["strict-transport-security"]).toBe(
      "max-age=31536000; includeSubDomains; preload",
    );
  });

  it("should have correct Referrer-Policy header", async () => {
    const response = await request(app).get("/health");
    expect(response.headers["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("should have comprehensive Permissions-Policy header", async () => {
    const response = await request(app).get("/health");
    const policy = response.headers["permissions-policy"];
    expect(policy).toContain("geolocation=()");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("camera=()");
    expect(policy).toContain("payment=()");
    expect(policy).toContain("usb=()");
    expect(policy).toContain("magnetometer=()");
    expect(policy).toContain("accelerometer=()");
    expect(policy).toContain("gyroscope=()");
  });

  it("should have X-Content-Type-Options header", async () => {
    const response = await request(app).get("/health");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("should have X-Frame-Options header", async () => {
    const response = await request(app).get("/health");
    expect(response.headers["x-frame-options"]).toBe("DENY");
  });
});
