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
  },
}));

vi.mock("../utils/prisma", () => ({
  default: prismaMock,
}));

// Import after mock
import { checkUnlocks } from "./game";

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

  it("should not update if avatar not found", async () => {
    const studentId = "student-1";

    prismaMock.progress.count.mockResolvedValue(10);
    prismaMock.avatar.findUnique.mockResolvedValue(null);

    await checkUnlocks(studentId);

    expect(prismaMock.avatar.update).not.toHaveBeenCalled();
    expect(prismaMock.unlockedAbility.createMany).not.toHaveBeenCalled();
  });

  it("should not update if level has not increased", async () => {
    const studentId = "student-1";
    const avatarId = "avatar-1";

    // 2 progress items / 2 = level 2, but avatar is already level 2
    prismaMock.progress.count.mockResolvedValue(2);

    prismaMock.avatar.findUnique.mockResolvedValue({
      id: avatarId,
      studentId,
      archetype: "AI",
      level: 2,
    });

    await checkUnlocks(studentId);

    expect(prismaMock.avatar.update).not.toHaveBeenCalled();
  });
});
