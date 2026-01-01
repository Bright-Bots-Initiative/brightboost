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

import { resolveTurn } from "../../src/services/game";

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
        unlockedAbilities: [
          {
            abilityId: abilityId,
            Ability: {
              id: abilityId,
              config: { type: "attack", value: 10 },
            },
          },
        ],
      },
      Player2: {
        id: "player-2",
        hp: 100,
        archetype: "BIOTECH",
        unlockedAbilities: [],
      },
    });

    // Mock ability
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
