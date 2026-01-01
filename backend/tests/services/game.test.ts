import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to ensure prismaMock is initialized before mocks are applied
const prismaMock = vi.hoisted(() => ({
  match: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  matchTurn: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  ability: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return prismaMock;
    }
  },
  MatchStatus: {
    ACTIVE: "ACTIVE",
    COMPLETED: "COMPLETED",
  },
}));

import { resolveTurn, claimTimeout, TURN_SECONDS } from "../../src/services/game";

describe("resolveTurn Performance Optimization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should correctly calculate round and HP (Optimized)", async () => {
    const matchId = "match-123";
    const actorId = "player-1";
    const abilityId = "ability-1";

    // Mock match data
    prismaMock.match.findUnique.mockResolvedValue({
      id: matchId,
      status: "ACTIVE",
      player1Id: "player-1",
      player2Id: "player-2",
      Player1: {
        id: "player-1",
        hp: 100,
        archetype: "AI",
        unlockedAbilities: [{ abilityId: "ability-1", Ability: { id: "ability-1", config: { type: "attack", value: 10 } } }],
      },
      Player2: {
        id: "player-2",
        hp: 100,
        archetype: "BIOTECH",
        unlockedAbilities: [],
      },
    });

    // Mock ability (though resolveTurn now uses the one from unlockedAbilities)
    // We retain this if other functions use it, but resolveTurn shouldn't anymore for the config source
    prismaMock.ability.findUnique.mockResolvedValue({
      id: abilityId,
      config: { type: "attack", value: 10 },
    });

    // Mock create
    prismaMock.matchTurn.create.mockResolvedValue({
      id: "turn-3",
      matchId,
      round: 3,
      actorId,
      action: { abilityId, damageDealt: 10 },
    });

    // Mock findMany (ONLY previous turns)
    // The optimization relies on fetching history first, then appending the new turn in memory.
    const previousTurns = [
      { matchId, round: 1, actorId: "player-1", action: { damageDealt: 10 } },
      { matchId, round: 2, actorId: "player-2", action: { damageDealt: 10 } },
    ];
    prismaMock.matchTurn.findMany.mockResolvedValue([...previousTurns]); // Return a copy so we don't mutate the mock setup if reused

    const result = await resolveTurn(matchId, actorId, abilityId);

    // Verify correct HP calc
    // P1 took 10 dmg (from round 2) -> 90 HP
    // P2 took 20 dmg (from round 1 and 3) -> 80 HP
    expect(result.p1Hp).toBe(90);
    expect(result.p2Hp).toBe(80);
    expect(result.matchOver).toBe(false);

    // Verify Optimizations
    expect(prismaMock.matchTurn.count).not.toHaveBeenCalled(); // We removed the count query
    expect(prismaMock.matchTurn.findMany).toHaveBeenCalledTimes(1); // Only called once
    expect(prismaMock.matchTurn.findMany).toHaveBeenCalledWith({
      where: { matchId },
      orderBy: { createdAt: "asc" },
    });

    // Ensure create was called with correct round
    expect(prismaMock.matchTurn.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          round: 3, // length (2) + 1
        }),
      }),
    );
  });
});

describe("PvP Fairness Checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should enforce turn order (P2 cannot act on P1 turn)", async () => {
    const matchId = "m1";
    // 0 turns -> P1 should act
    prismaMock.matchTurn.findMany.mockResolvedValue([]);

    prismaMock.match.findUnique.mockResolvedValue({
      id: matchId,
      status: "ACTIVE",
      player1Id: "p1",
      player2Id: "p2",
      Player1: { id: "p1", unlockedAbilities: [] },
      Player2: { id: "p2", unlockedAbilities: [] },
    });

    await expect(resolveTurn(matchId, "p2", "ab1"))
      .rejects.toThrow("Not your turn");
  });

  it("should enforce ability ownership", async () => {
    const matchId = "m1";
    // 0 turns -> P1 acts
    prismaMock.matchTurn.findMany.mockResolvedValue([]);

    prismaMock.match.findUnique.mockResolvedValue({
      id: matchId,
      status: "ACTIVE",
      player1Id: "p1",
      player2Id: "p2",
      Player1: {
        id: "p1",
        unlockedAbilities: [] // Empty -> no abilities unlocked
      },
      Player2: { id: "p2", unlockedAbilities: [] },
    });

    await expect(resolveTurn(matchId, "p1", "ab1"))
      .rejects.toThrow("Ability not unlocked");
  });

  it("should allow claiming timeout if deadline passed", async () => {
    const matchId = "m1";
    const now = new Date();
    const past = new Date(now.getTime() - (TURN_SECONDS + 5) * 1000); // 35s ago

    prismaMock.match.findUnique.mockResolvedValue({
      id: matchId,
      status: "ACTIVE",
      player1Id: "p1",
      player2Id: "p2",
      updatedAt: past, // Last activity was long ago
      turns: [], // No turns yet, so P1 turn
    });

    // P2 claims timeout against P1
    const result = await claimTimeout(matchId, "p2");

    expect(result.matchOver).toBe(true);
    expect(result.winnerId).toBe("p2");
    expect(result.status).toBe("FORFEIT");
    expect(prismaMock.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: matchId },
        data: expect.objectContaining({ status: "FORFEIT", winnerId: "p2" }),
      })
    );
  });

  it("should reject timeout claim if deadline not passed", async () => {
    const matchId = "m1";
    const now = new Date();
    const recent = new Date(now.getTime() - 5000); // 5s ago

    prismaMock.match.findUnique.mockResolvedValue({
      id: matchId,
      status: "ACTIVE",
      player1Id: "p1",
      player2Id: "p2",
      updatedAt: recent,
      turns: [], // P1 turn
    });

    await expect(claimTimeout(matchId, "p2"))
      .rejects.toThrow("Timeout not claimable yet");
  });

  it("should reject timeout claim if it is requester's turn", async () => {
    const matchId = "m1";
    const now = new Date();
    const past = new Date(now.getTime() - 100000); // Long time ago

    prismaMock.match.findUnique.mockResolvedValue({
      id: matchId,
      status: "ACTIVE",
      player1Id: "p1",
      player2Id: "p2",
      updatedAt: past,
      turns: [], // P1 turn
    });

    // P1 tries to claim timeout (but it's P1's turn!)
    await expect(claimTimeout(matchId, "p1"))
      .rejects.toThrow("It is your turn, cannot claim timeout");
  });
});
