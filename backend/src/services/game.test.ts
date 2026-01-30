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

    // Mock update return value because checkUnlocks uses it
    const updatedAvatar = { id: avatarId, level: 6 };
    prismaMock.avatar.update.mockResolvedValue(updatedAvatar);

    const result = await checkUnlocks(studentId);

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

    // Verify return value
    expect(result).toBeDefined();
    expect(result?.avatar).toEqual(updatedAvatar);
    expect(result?.newAbilitiesCount).toBe(3);
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

    // Mock update return value
    prismaMock.avatar.update.mockResolvedValue({ id: avatarId, level: 6 });

    const result = await checkUnlocks(studentId);

    // createMany should be called with only ab-2
    expect(prismaMock.unlockedAbility.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ avatarId: avatarId, abilityId: "ab-2" }),
      ],
    });

    expect(result?.newAbilitiesCount).toBe(1);
  });

  it("should not update if avatar not found", async () => {
    const studentId = "student-1";

    prismaMock.progress.count.mockResolvedValue(10);
    prismaMock.avatar.findUnique.mockResolvedValue(null);

    const result = await checkUnlocks(studentId);

    expect(prismaMock.avatar.update).not.toHaveBeenCalled();
    expect(prismaMock.unlockedAbility.createMany).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it("should not update if level has not increased", async () => {
    const studentId = "student-1";
    const avatarId = "avatar-1";

    // 2 progress items / 2 = level 2, but avatar is already level 2
    prismaMock.progress.count.mockResolvedValue(2);

    const mockAvatar = {
      id: avatarId,
      studentId,
      archetype: "AI",
      level: 2,
    };
    prismaMock.avatar.findUnique.mockResolvedValue(mockAvatar);

    const result = await checkUnlocks(studentId);

    expect(prismaMock.avatar.update).not.toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result?.avatar).toEqual(mockAvatar);
    expect(result?.newAbilitiesCount).toBe(0);
  });

  it("should use preloaded avatar if provided and skip findUnique", async () => {
    const studentId = "student-1";
    const preloadedAvatar = {
      id: "avatar-1",
      studentId,
      archetype: "AI",
      level: 1,
      xp: 0,
      hp: 100,
      energy: 100,
      // Add other necessary Avatar fields if strict typing requires it, or cast as any
    } as any;

    prismaMock.progress.count.mockResolvedValue(10); // Level should go to 6

    // We do NOT mock avatar.findUnique because it shouldn't be called

    const abilities = [{ id: "ab-1", archetype: "AI", reqLevel: 1 }];
    prismaMock.ability.findMany.mockResolvedValue(abilities);
    prismaMock.unlockedAbility.findMany.mockResolvedValue([]);

    // Mock update
    prismaMock.avatar.update.mockResolvedValue({
      ...preloadedAvatar,
      level: 6,
    });

    const result = await checkUnlocks(studentId, preloadedAvatar);

    // Verify findUnique was NOT called
    expect(prismaMock.avatar.findUnique).not.toHaveBeenCalled();

    // Verify logic still ran (update happened)
    expect(prismaMock.avatar.update).toHaveBeenCalled();
    expect(result?.newAbilitiesCount).toBe(1);
  });
});
