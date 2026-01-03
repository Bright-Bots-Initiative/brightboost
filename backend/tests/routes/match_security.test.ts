import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express, { Express } from "express";
import matchRouter from "../../src/routes/match";
import { VALID_BANDS } from "../../src/utils/validation";

// Mock dependencies
vi.mock("@prisma/client", () => {
  const mPrisma = {
    avatar: {
      findUnique: vi.fn(),
    },
    match: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    PrismaClient: class {
      constructor() {
        return mPrisma;
      }
    },
    MatchStatus: {
      PENDING: "PENDING",
      ACTIVE: "ACTIVE",
    },
  };
});

vi.mock("../../src/utils/auth", () => ({
  requireAuth: (req, res, next) => {
    req.user = { id: "student-123" };
    next();
  },
}));

vi.mock("../../src/services/game", () => ({
  resolveTurn: vi.fn(),
}));

// Import prisma mock to set return values
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

describe("Match Routes - Queue", () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(matchRouter);
    vi.clearAllMocks();
  });

  it("should accept valid bands", async () => {
    // Mock avatar found
    (prisma.avatar.findUnique as any).mockResolvedValue({ id: "avatar-123" });
    // Mock no existing pending match
    (prisma.match.findFirst as any).mockResolvedValueOnce(null); // existingPending
    // Mock no open match found
    (prisma.match.findFirst as any).mockResolvedValueOnce(null); // openMatch
    // Mock create match
    (prisma.match.create as any).mockResolvedValue({
      id: "match-new",
      status: "PENDING",
    });

    for (const band of VALID_BANDS) {
      const res = await request(app).post("/match/queue").send({ band });

      expect(res.status).not.toBe(400);
    }
  });

  it("should reject invalid bands", async () => {
    const res = await request(app)
      .post("/match/queue")
      .send({ band: "INVALID_BAND" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid band");
  });

  it("should prevent multiple pending matches for the same user", async () => {
    (prisma.avatar.findUnique as any).mockResolvedValue({ id: "avatar-123" });
    // Mock existing pending match
    (prisma.match.findFirst as any).mockResolvedValueOnce({
      id: "match-existing",
      status: "PENDING",
    });

    const res = await request(app).post("/match/queue").send({ band: "K2" });

    expect(res.status).toBe(200);
    expect(res.body.matchId).toBe("match-existing");
    // Should not create new match
    expect(prisma.match.create).not.toHaveBeenCalled();
  });
});
