import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../server"; // Assuming default export
import prisma from "../utils/prisma";
import jwt from "jsonwebtoken";

// Mock Prisma
vi.mock("../utils/prisma", () => ({
  default: {
    avatar: {
      findUnique: vi.fn(),
    },
    match: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    matchTurn: {
      create: vi.fn(),
    },
  },
}));

// Mock Auth
const mockToken = jwt.sign(
  { id: "student-1", role: "student" },
  "default_dev_secret",
);

describe("Match Route Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/match/queue", () => {
    it("should reject invalid band", async () => {
      const res = await request(app)
        .post("/api/match/queue")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ band: "INVALID_BAND" });

      expect(res.status).toBe(400);
      // Expect Zod error or custom error
      expect(JSON.stringify(res.body)).toContain("Invalid enum");
    });

    it("should handle database errors gracefully (no crash)", async () => {
      // Mock DB error
      (prisma.avatar.findUnique as any).mockRejectedValue(
        new Error("DB Connection Failed"),
      );

      const res = await request(app)
        .post("/api/match/queue")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ band: "K2" });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });
    });
  });

  describe("POST /api/match/:id/act", () => {
    it("should reject malformed action payload", async () => {
      const res = await request(app)
        .post("/api/match/match-123/act")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ abilityId: 123 }); // abilityId should be string

      expect(res.status).toBe(400);
    });
  });
});
