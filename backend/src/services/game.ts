// backend/src/services/game.ts
import prisma from "../utils/prisma";
import type { Avatar } from "@prisma/client";

// XP constants
export const XP_PER_ACTIVITY = 50;
export const XP_PER_LEVEL_UP = 100;

// Stat constants
export const STAT_MAX = 100;

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
    // Update avatar level
    const updatedAvatar = await prisma.avatar.update({
      where: { id: avatar.id },
      data: { level: newLevel, xp: { increment: XP_PER_LEVEL_UP } },
    });
    avatar = updatedAvatar;

    // ONLY unlock abilities if avatar is SPECIALIZED with an archetype
    // GENERAL avatars (archetype=null) do not get abilities
    if (avatar.archetype && avatar.stage === "SPECIALIZED") {
      const archetype = avatar.archetype;
      const avatarId = avatar.id;

      const eligibleAbilities = await prisma.ability.findMany({
        where: { archetype, reqLevel: { lte: newLevel } },
      });

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
  }

  return { avatar, newAbilitiesCount };
}

/**
 * Ensures a student has an avatar. If missing, creates one as GENERAL (Explorer)
 * with backfilled XP based on their completed activities.
 *
 * IMPORTANT: Backfilled avatars are created as stage=GENERAL with archetype=null.
 * This means they are "Explorers" until the user explicitly selects a specialty.
 * No abilities are unlocked for GENERAL avatars.
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

  // Create avatar as GENERAL (Explorer) - no archetype, no abilities
  // User must explicitly select a specialty to become SPECIALIZED
  const newAvatar = await prisma.avatar.create({
    data: {
      studentId,
      stage: "GENERAL",      // Explorer stage
      archetype: null,       // No archetype until specialty selected
      level: initialLevel,
      xp: totalBackfilledXp,
      hp: 100,
      energy: 100,
      speed: 0,              // General stats start at 0
      control: 0,
      focus: 0,
    },
  });

  // NOTE: No abilities are unlocked for GENERAL avatars
  // Abilities are only unlocked when user selects a specialty (SPECIALIZED stage)

  console.log(
    `[ensureAvatarWithBackfill] Created GENERAL avatar for student ${studentId}: level=${initialLevel}, xp=${totalBackfilledXp}, completedCount=${completedCount}`
  );

  return {
    avatar: newAvatar,
    wasBackfilled: true,
    backfilledXp: totalBackfilledXp,
  };
}

/**
 * Calculates stat gains from activity completion.
 * Only applies to GENERAL avatars (before specialization).
 *
 * @param result - Activity result with optional score/total/timeSpentS
 * @returns Object with speed, control, focus deltas
 */
export function calculateStatGains(result?: {
  score?: number;
  total?: number;
  timeSpentS?: number;
}): { speed: number; control: number; focus: number } {
  // Base gains per completion
  let speed = 1;
  let control = 1;
  let focus = 1;

  // Performance-based modifiers
  if (result?.score !== undefined && result?.total && result.total > 0) {
    const accuracy = result.score / result.total;
    control += Math.round(accuracy * 2); // 0-2 bonus
    focus += Math.round(accuracy * 1);   // 0-1 bonus
  }

  // Speed bonus for fast completion
  if (result?.timeSpentS !== undefined) {
    if (result.timeSpentS <= 30) {
      speed += 2;
    } else if (result.timeSpentS <= 60) {
      speed += 1;
    }
  }

  return { speed, control, focus };
}
