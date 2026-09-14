import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist prismaMock so it's available for the mock factory
const prismaMock = vi.hoisted(() => ({
  progress: {
    count: vi.fn(),
  },
  avatar: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
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

    // SPECIALIZED + archetype="AI" is required to unlock abilities. Explorer
    // (stage=GENERAL, archetype=null) avatars don't get abilities by design —
    // they're "discovery" avatars until the user picks a specialty.
    prismaMock.avatar.findUnique.mockResolvedValue({
      id: avatarId,
      studentId,
      stage: "SPECIALIZED",
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
    prismaMock.unlockedAbility.createMany.mockResolvedValue({ count: 3 });

    // The updated avatar carries SPECIALIZED forward so the unlock gate in
    // checkUnlocks still evaluates true after the avatar.update call.
    const updatedAvatar = {
      id: avatarId,
      stage: "SPECIALIZED",
      archetype: "AI",
      level: 6,
    };
    prismaMock.avatar.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.avatar.findUniqueOrThrow.mockResolvedValue(updatedAvatar);

    const result = await checkUnlocks(studentId);

    // #878: the level is CLAIMED — the write carries a guard on the stored
    // level, so a second caller computing the same level awards nothing.
    expect(prismaMock.avatar.updateMany).toHaveBeenCalledWith({
      where: { id: avatarId, level: { lt: 6 } },
      data: { level: 6, xp: { increment: 100 } },
    });
    expect(prismaMock.avatar.update).not.toHaveBeenCalled();

    // createMany should be called once with 3 items
    expect(prismaMock.unlockedAbility.createMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.unlockedAbility.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ avatarId: avatarId, abilityId: "ab-1" }),
        expect.objectContaining({ avatarId: avatarId, abilityId: "ab-2" }),
        expect.objectContaining({ avatarId: avatarId, abilityId: "ab-3" }),
      ]),
      skipDuplicates: true,
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
      stage: "SPECIALIZED",
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

    // Mock the claimed row — SPECIALIZED + archetype propagate forward.
    prismaMock.avatar.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.avatar.findUniqueOrThrow.mockResolvedValue({
      id: avatarId,
      stage: "SPECIALIZED",
      archetype: "AI",
      level: 6,
    });
    prismaMock.unlockedAbility.createMany.mockResolvedValue({ count: 1 });

    const result = await checkUnlocks(studentId);

    // createMany should be called with only ab-2
    expect(prismaMock.unlockedAbility.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ avatarId: avatarId, abilityId: "ab-2" }),
      ],
      skipDuplicates: true,
    });

    expect(result?.newAbilitiesCount).toBe(1);
  });

  it("should level up but NOT unlock abilities for Explorer (GENERAL) avatars", async () => {
    // Regression test for the Pathways arc change: Explorer/GENERAL avatars
    // are "discovery" mode — they level up from progress but do not earn
    // abilities until the user picks an archetype (SPECIALIZED stage).
    const studentId = "student-1";
    const avatarId = "avatar-1";

    prismaMock.progress.count.mockResolvedValue(10);

    prismaMock.avatar.findUnique.mockResolvedValue({
      id: avatarId,
      studentId,
      stage: "GENERAL",
      archetype: null,
      level: 1,
    });

    prismaMock.avatar.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.avatar.findUniqueOrThrow.mockResolvedValue({
      id: avatarId,
      stage: "GENERAL",
      archetype: null,
      level: 6,
    });

    const result = await checkUnlocks(studentId);

    // Level-up still happens — Explorers gain XP and levels.
    expect(prismaMock.avatar.updateMany).toHaveBeenCalledWith({
      where: { id: avatarId, level: { lt: 6 } },
      data: { level: 6, xp: { increment: 100 } },
    });

    // But abilities are NOT queried or unlocked — that's the gate.
    expect(prismaMock.ability.findMany).not.toHaveBeenCalled();
    expect(prismaMock.unlockedAbility.createMany).not.toHaveBeenCalled();

    expect(result?.newAbilitiesCount).toBe(0);
  });

  it("should not update if avatar not found", async () => {
    const studentId = "student-1";

    prismaMock.progress.count.mockResolvedValue(10);
    prismaMock.avatar.findUnique.mockResolvedValue(null);

    const result = await checkUnlocks(studentId);

    expect(prismaMock.avatar.updateMany).not.toHaveBeenCalled();
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

    expect(prismaMock.avatar.updateMany).not.toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result?.avatar).toEqual(mockAvatar);
    expect(result?.newAbilitiesCount).toBe(0);
  });

  it("should use preloaded avatar if provided and skip findUnique", async () => {
    const studentId = "student-1";
    const preloadedAvatar = {
      id: "avatar-1",
      studentId,
      stage: "SPECIALIZED",
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

    // Mock the claim — keeps SPECIALIZED + archetype so the ability-unlock
    // branch still runs after level-up.
    prismaMock.avatar.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.avatar.findUniqueOrThrow.mockResolvedValue({
      ...preloadedAvatar,
      level: 6,
    });
    prismaMock.unlockedAbility.createMany.mockResolvedValue({ count: 1 });

    const result = await checkUnlocks(studentId, preloadedAvatar);

    // Verify findUnique was NOT called
    expect(prismaMock.avatar.findUnique).not.toHaveBeenCalled();

    // Verify logic still ran (the claim happened)
    expect(prismaMock.avatar.updateMany).toHaveBeenCalled();
    expect(result?.newAbilitiesCount).toBe(1);
  });

  it("#878: a level claim that another writer won first grants no bonus and no abilities", async () => {
    const studentId = "student-1";
    const avatarId = "avatar-1";
    prismaMock.progress.count.mockResolvedValue(10);
    prismaMock.avatar.findUnique.mockResolvedValue({
      id: avatarId,
      studentId,
      stage: "SPECIALIZED",
      archetype: "AI",
      level: 1, // stale: the concurrent writer already moved it to 6
    });
    prismaMock.avatar.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.avatar.findUniqueOrThrow.mockResolvedValue({
      id: avatarId,
      stage: "SPECIALIZED",
      archetype: "AI",
      level: 6,
    });

    const result = await checkUnlocks(studentId);

    expect(prismaMock.avatar.updateMany).toHaveBeenCalledWith({
      where: { id: avatarId, level: { lt: 6 } },
      data: { level: 6, xp: { increment: 100 } },
    });
    expect(prismaMock.ability.findMany).not.toHaveBeenCalled();
    expect(prismaMock.unlockedAbility.createMany).not.toHaveBeenCalled();
    expect(result?.avatar.level).toBe(6);
    expect(result?.newAbilitiesCount).toBe(0);
  });

  it("#877: every write runs on the handle it is given, so a transaction client is honoured", async () => {
    const tx = {
      progress: { count: vi.fn().mockResolvedValue(2) },
      avatar: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "avatar-1",
          stage: "GENERAL",
          archetype: null,
          level: 2,
        }),
      },
      ability: { findMany: vi.fn() },
      unlockedAbility: { findMany: vi.fn(), createMany: vi.fn() },
    };
    const preloaded = {
      id: "avatar-1",
      studentId: "student-1",
      stage: "GENERAL",
      archetype: null,
      level: 1,
    } as any;

    const result = await checkUnlocks("student-1", preloaded, tx as any);

    expect(tx.progress.count).toHaveBeenCalledTimes(1);
    expect(tx.avatar.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.progress.count).not.toHaveBeenCalled();
    expect(prismaMock.avatar.updateMany).not.toHaveBeenCalled();
    expect(result?.avatar.level).toBe(2);
  });
});
