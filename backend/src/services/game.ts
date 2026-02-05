// backend/src/services/game.ts
import prisma from "../utils/prisma";
import type { Avatar } from "@prisma/client";

// XP constants
export const XP_PER_ACTIVITY = 50;
export const XP_PER_LEVEL_UP = 100;

type AbilityRow = { id: string };

export async function checkUnlocks(
  studentId: string,
  preloadedAvatar?: Avatar | null,
): Promise<{ avatar: Avatar; newAbilitiesCount: number } | undefined> {
  let avatar = preloadedAvatar;

  // ⚡ Bolt Optimization: Use preloaded avatar if available to save a query
  const queries: [Promise<number>, Promise<Avatar | null>?] = [
    prisma.progress.count({
      where: { studentId, status: "COMPLETED" },
    }),
  ];

  if (!avatar) {
    queries.push(prisma.avatar.findUnique({ where: { studentId } }));
  }

  const results = await Promise.all(queries);
  const progressCount = results[0];
  if (!avatar) {
    avatar = results[1] as Avatar | null;
  }

  if (!avatar) return undefined;

  const newLevel = 1 + Math.floor(progressCount / 2);
  let newAbilitiesCount = 0;

  if (newLevel > avatar.level) {
    // ⚡ Bolt Optimization: Parallelize avatar update and ability fetch
    // Capture archetype before update to allow parallel execution
    const archetype = avatar.archetype;

    const [updatedAvatar, eligibleAbilities] = await Promise.all([
      prisma.avatar.update({
        where: { id: avatar.id },
        data: { level: newLevel, xp: { increment: XP_PER_LEVEL_UP } },
      }),
      // Batch fetch & create to avoid N+1 query
      prisma.ability.findMany({
        where: { archetype, reqLevel: { lte: newLevel } },
      }),
    ]);

    avatar = updatedAvatar;

    // Capture avatarId for use in closures (TS can't narrow `let` across callbacks)
    const avatarId = avatar.id;

    if (eligibleAbilities.length > 0) {
      const existingUnlocks = await prisma.unlockedAbility.findMany({
        where: {
          avatarId,
          abilityId: { in: eligibleAbilities.map((a: AbilityRow) => a.id) },
        },
        select: { abilityId: true },
      });

      const existingAbilityIds = new Set(
        existingUnlocks.map((u: { abilityId: string }) => u.abilityId),
      );
      const newUnlocks = eligibleAbilities.filter(
        (ab: AbilityRow) => !existingAbilityIds.has(ab.id),
      );

      if (newUnlocks.length > 0) {
        await prisma.unlockedAbility.createMany({
          data: newUnlocks.map((ab: AbilityRow) => ({
            avatarId,
            abilityId: ab.id,
            equipped: false,
          })),
        });
        newAbilitiesCount = newUnlocks.length;
      }
    }
  }

  return { avatar, newAbilitiesCount };
}

/**
 * Ensures a student has an avatar. If missing, creates one with backfilled XP
 * based on their completed activities.
 *
 * @param studentId - The student's ID
 * @returns Object containing the avatar and whether it was newly created with backfill
 */
export async function ensureAvatarWithBackfill(
  studentId: string
): Promise<{ avatar: Avatar; wasBackfilled: boolean; backfilledXp: number }> {
  // Check for existing avatar
  const existingAvatar = await prisma.avatar.findUnique({
    where: { studentId },
  });

  if (existingAvatar) {
    return { avatar: existingAvatar, wasBackfilled: false, backfilledXp: 0 };
  }

  // No avatar exists - count completed progress and backfill
  const completedCount = await prisma.progress.count({
    where: { studentId, status: "COMPLETED" },
  });

  // Calculate backfilled XP
  const backfilledXp = completedCount * XP_PER_ACTIVITY;

  // Calculate initial level based on completed activities
  // Level formula: 1 + floor(completedCount / 2)
  const initialLevel = 1 + Math.floor(completedCount / 2);

  // Calculate level-up bonus XP
  // Each level up (beyond level 1) awards XP_PER_LEVEL_UP
  const levelUpBonusXp = (initialLevel - 1) * XP_PER_LEVEL_UP;
  const totalBackfilledXp = backfilledXp + levelUpBonusXp;

  // Create avatar with backfilled XP using default archetype
  // Note: User should ideally select archetype first, but this handles edge cases
  const newAvatar = await prisma.avatar.create({
    data: {
      studentId,
      archetype: "AI", // Default archetype for backfill
      level: initialLevel,
      xp: totalBackfilledXp,
      hp: 100,
      energy: 100,
    },
  });

  // Unlock abilities for the backfilled level
  const eligibleAbilities = await prisma.ability.findMany({
    where: { archetype: newAvatar.archetype, reqLevel: { lte: initialLevel } },
  });

  if (eligibleAbilities.length > 0) {
    await prisma.unlockedAbility.createMany({
      data: eligibleAbilities.map((ab: AbilityRow) => ({
        avatarId: newAvatar.id,
        abilityId: ab.id,
        equipped: false,
      })),
    });
  }

  console.log(
    `[ensureAvatarWithBackfill] Created backfilled avatar for student ${studentId}: level=${initialLevel}, xp=${totalBackfilledXp}, completedCount=${completedCount}`
  );

  return {
    avatar: newAvatar,
    wasBackfilled: true,
    backfilledXp: totalBackfilledXp,
  };
}
