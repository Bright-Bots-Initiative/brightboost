import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

// Hoist mocks to ensure they are available before imports
const prismaMock = vi.hoisted(() => ({
  match: {
    findUnique: vi.fn(),
  },
  avatar: {
    findUnique: vi.fn(),
  },
  module: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  progress: {
    findMany: vi.fn(),
  },
}));

vi.mock("@prisma/client", () => {
  return {
    PrismaClient: class {
      constructor() {
        return prismaMock;
      }
    },
    MatchStatus: { PENDING: "PENDING", ACTIVE: "ACTIVE" },
  };
});

// Import app AFTER mocking
import app from "../server";

describe("GET /match/:id IDOR", () => {
  beforeEach(() => {
    // Enable dev bypass
    process.env.ALLOW_DEV_ROLE_HEADER = "1";
    process.env.NODE_ENV = "test";
    vi.clearAllMocks();
  });

  it("prevents access to match if user is NOT a participant", async () => {
    // Setup: Match exists between Player A and Player B
    const matchId = "match-123";
    const player1Id = "avatar-a";
    const player2Id = "avatar-b";

    // Mock the match existing
    prismaMock.match.findUnique.mockResolvedValue({
      id: matchId,
      player1Id,
      player2Id,
      status: "ACTIVE",
      Player1: { unlockedAbilities: [] },
      Player2: { unlockedAbilities: [] },
      turns: [],
    });

    // Act: Player C (attacker) tries to view the match
    const attackerId = "user-c";
    const attackerAvatarId = "avatar-c";

    // Mock attacker's avatar lookup
    prismaMock.avatar.findUnique.mockResolvedValue({
      id: attackerAvatarId,
      studentId: attackerId,
    });

    const response = await request(app)
      .get(`/api/match/${matchId}`)
      .set("x-user-id", attackerId)
      .set("x-role", "student");

    // Assert: Should return 403 Forbidden.
    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/Not authorized|Forbidden/);
  });

  it("allows access if user IS a participant", async () => {
    // Setup: Match exists between Player A and Player B
    const matchId = "match-123";
    const player1Id = "avatar-a";
    const player2Id = "avatar-b";

    // Mock the match existing
    prismaMock.match.findUnique.mockResolvedValue({
      id: matchId,
      player1Id,
      player2Id,
      status: "ACTIVE",
      Player1: { unlockedAbilities: [] },
      Player2: { unlockedAbilities: [] },
      turns: [],
    });

    // Act: Player A tries to view the match
    const userId = "user-a";
    const userAvatarId = "avatar-a"; // Matches player1Id

    // Mock user's avatar lookup
    prismaMock.avatar.findUnique.mockResolvedValue({
      id: userAvatarId,
      studentId: userId,
    });

    const response = await request(app)
      .get(`/api/match/${matchId}`)
      .set("x-user-id", userId)
      .set("x-role", "student");

    // Assert: Should return 200.
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(matchId);
  });
});
