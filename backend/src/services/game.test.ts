import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist prismaMock so it's available for the mock factory
const prismaMock = vi.hoisted(() => ({
  progress: {
    count: vi.fn(),
  },
  avatar: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  ability: {
    findMany: vi.fn(),
  },
  unlockedAbility: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  match: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  matchTurn: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../utils/prisma", () => ({
  default: prismaMock,
}));

// Mock pvpQuestions
vi.mock("./pvpQuestions", () => ({
  checkAnswer: vi.fn().mockImplementation((band, qId, ansIndex) => {
    // Correct if index is 1
    return ansIndex === 1;
  }),
}));

// Import after mock
import { checkUnlocks, resolveTurn } from "./game";

describe("checkUnlocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should unlock new abilities when leveling up using batch operations", async () => {
    const studentId = "student-1";
    const avatarId = "avatar-1";

    // Mock progress count to trigger level up (e.g., 10 items / 2 = level 6)
    prismaMock.progress.count.mockResolvedValue(10);

    prismaMock.avatar.findUnique.mockResolvedValue({
      id: avatarId,
      studentId,
      archetype: "AI",
      level: 1,
    });

    const abilities = [
      { id: "ab-1", archetype: "AI", reqLevel: 1 },
      { id: "ab-2", archetype: "AI", reqLevel: 2 },
      { id: "ab-3", archetype: "AI", reqLevel: 6 },
    ];
    prismaMock.ability.findMany.mockResolvedValue(abilities);

    // Simulate no existing unlocks for the optimized implementation
    prismaMock.unlockedAbility.findMany.mockResolvedValue([]);

    await checkUnlocks(studentId);

    // Verify avatar updated
    expect(prismaMock.avatar.update).toHaveBeenCalledWith({
      where: { id: avatarId },
      data: { level: 6, xp: { increment: 100 } },
    });

    // Optimization check: findFirst and create should NOT be called
    expect(prismaMock.unlockedAbility.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.unlockedAbility.create).not.toHaveBeenCalled();

    // createMany should be called once with 3 items
    expect(prismaMock.unlockedAbility.createMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.unlockedAbility.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ avatarId: avatarId, abilityId: "ab-1" }),
        expect.objectContaining({ avatarId: avatarId, abilityId: "ab-2" }),
        expect.objectContaining({ avatarId: avatarId, abilityId: "ab-3" }),
      ]),
    });
  });

  it("should only create unlocks for abilities not already unlocked", async () => {
    const studentId = "student-1";
    const avatarId = "avatar-1";

    prismaMock.progress.count.mockResolvedValue(10);

    prismaMock.avatar.findUnique.mockResolvedValue({
      id: avatarId,
      studentId,
      archetype: "AI",
      level: 1,
    });

    const abilities = [
      { id: "ab-1", archetype: "AI", reqLevel: 1 },
      { id: "ab-2", archetype: "AI", reqLevel: 2 },
    ];
    prismaMock.ability.findMany.mockResolvedValue(abilities);

    // Simulate ab-1 already unlocked
    prismaMock.unlockedAbility.findMany.mockResolvedValue([
      { abilityId: "ab-1" },
    ]);

    await checkUnlocks(studentId);

    // createMany should be called with only ab-2
    expect(prismaMock.unlockedAbility.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ avatarId: avatarId, abilityId: "ab-2" }),
      ],
    });
  });
});

describe("resolveTurn - Knowledge Bonus", () => {
  const matchId = "match-123";
  const p1Id = "p1";
  const p2Id = "p2";
  const abilityId = "ab-attack";

  const mockAbility = {
    id: abilityId,
    config: { type: "attack", value: 20 },
    name: "Strike",
  };

  const mockPlayer1 = {
    id: "p1",
    archetype: "AI",
    hp: 100,
    unlockedAbilities: [{ abilityId: abilityId, Ability: mockAbility }],
  };

  const mockPlayer2 = {
    id: "p2",
    archetype: "BIOTECH",
    hp: 100,
    unlockedAbilities: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should apply 25% bonus for correct answer", async () => {
    // Setup match state
    prismaMock.match.findUnique.mockResolvedValue({
      id: matchId,
      status: "ACTIVE",
      player1Id: p1Id,
      player2Id: p2Id,
      Player1: mockPlayer1,
      Player2: mockPlayer2,
      turns: [], // Mocking turns directly on match
      band: "K2",
    });

    // Mock create return to satisfy turns.push(newTurn)
    prismaMock.matchTurn.create.mockResolvedValue({
      id: "turn-1",
      matchId,
      round: 1,
      actorId: p1Id,
      action: {
        abilityId,
        damageDealt: 25,
        knowledge: { correct: true, bonusMult: 1.25 },
      },
    });

    // Call with correct answer (index 1)
    await resolveTurn(matchId, p1Id, abilityId, {
      questionId: "q1",
      answerIndex: 1,
    });

    expect(prismaMock.matchTurn.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: expect.objectContaining({
          damageDealt: 25,
          knowledge: expect.objectContaining({
            correct: true,
            bonusMult: 1.25,
          }),
        }),
      }),
    });
  });

  it("should NOT apply bonus for incorrect answer", async () => {
    prismaMock.match.findUnique.mockResolvedValue({
      id: matchId,
      status: "ACTIVE",
      player1Id: p1Id,
      player2Id: p2Id,
      Player1: mockPlayer1,
      Player2: mockPlayer2,
      turns: [],
      band: "K2",
    });

    // Mock create return
    prismaMock.matchTurn.create.mockResolvedValue({
      id: "turn-1",
      matchId,
      round: 1,
      actorId: p1Id,
      action: {
        abilityId,
        damageDealt: 20,
        knowledge: { correct: false },
      },
    });

    // Call with incorrect answer (index 0)
    await resolveTurn(matchId, p1Id, abilityId, {
      questionId: "q1",
      answerIndex: 0,
    });

    expect(prismaMock.matchTurn.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: expect.objectContaining({
          damageDealt: 20,
          knowledge: expect.objectContaining({ correct: false }),
        }),
      }),
    });
  });

  it("should handle missing quiz data gracefuly (no bonus)", async () => {
    prismaMock.match.findUnique.mockResolvedValue({
      id: matchId,
      status: "ACTIVE",
      player1Id: p1Id,
      player2Id: p2Id,
      Player1: mockPlayer1,
      Player2: mockPlayer2,
      turns: [],
      band: "K2",
    });

    // Mock create return
    prismaMock.matchTurn.create.mockResolvedValue({
      id: "turn-1",
      matchId,
      round: 1,
      actorId: p1Id,
      action: {
        abilityId,
        damageDealt: 20,
        knowledge: null,
      },
    });

    await resolveTurn(matchId, p1Id, abilityId);

    expect(prismaMock.matchTurn.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: expect.objectContaining({
          damageDealt: 20,
          knowledge: null,
        }),
      }),
    });
  });
});
