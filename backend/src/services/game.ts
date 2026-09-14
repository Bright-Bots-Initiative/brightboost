// backend/src/services/game.ts
import prisma from "../utils/prisma";
import type { Avatar, Prisma } from "@prisma/client";

// XP constants
export const XP_PER_ACTIVITY = 50;
export const XP_PER_LEVEL_UP = 100;

// Stat constants
export const STAT_MAX = 100;

type AbilityRow = { id: string };

/**
 * The Prisma handle a reward operation runs on: the global client, or the
 * `tx` of an interactive transaction (#877/#878 — every write of the
 * authoritative reward operation must run inside the same transaction).
 */
export type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Level = 1 + ⌊completed activities / 2⌋. The advance is *claimed*, not
 * written: `updateMany` matches only while the stored level is still below
 * the computed one, so two callers that both compute the same level can
 * award the level bonus once (#878). Inside complete-activity the avatar
 * row is additionally locked for the whole transaction, so the count this
 * reads already includes the caller's own committed-in-transaction claim
 * and nothing else can interleave.
 */
export async function checkUnlocks(
  studentId: string,
  preloadedAvatar?: Avatar | null,
  db: Db = prisma,
): Promise<{ avatar: Avatar; newAbilitiesCount: number } | undefined> {
  let avatar = preloadedAvatar;

  // ⚡ Bolt Optimization: Use preloaded avatar if available to save a query
  const queries: [Promise<number>, Promise<Avatar | null>?] = [
    db.progress.count({
      where: { studentId, status: "COMPLETED" },
    }),
  ];

  if (!avatar) {
    queries.push(db.avatar.findUnique({ where: { studentId } }));
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
    // Claim the level transition: only the caller that still sees a lower
    // stored level moves it and takes the bonus.
    const claimed = await db.avatar.updateMany({
      where: { id: avatar.id, level: { lt: newLevel } },
      data: { level: newLevel, xp: { increment: XP_PER_LEVEL_UP } },
    });
    // Re-read the row the claim just targeted; a miss is a genuine
    // inconsistency (P2025) and propagates to the caller's transaction.
    avatar = await db.avatar.findUniqueOrThrow({ where: { id: avatar.id } });
    if (claimed.count === 0) {
      // Someone else advanced the level first; nothing more to grant here.
      return { avatar, newAbilitiesCount: 0 };
    }

    // ONLY unlock abilities if avatar is SPECIALIZED with an archetype
    // GENERAL avatars (archetype=null) do not get abilities
    if (avatar.archetype && avatar.stage === "SPECIALIZED") {
      const archetype = avatar.archetype;
      const avatarId = avatar.id;

      const eligibleAbilities = await db.ability.findMany({
        where: { archetype, reqLevel: { lte: newLevel } },
      });

      if (eligibleAbilities.length > 0) {
        const existingUnlocks = await db.unlockedAbility.findMany({
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
          const granted = await db.unlockedAbility.createMany({
            data: newUnlocks.map((ab: AbilityRow) => ({
              avatarId,
              abilityId: ab.id,
              equipped: false,
            })),
            // (avatarId, abilityId) is unique; a grant that raced another
            // writer (#888's select-archetype) is not an error here.
            skipDuplicates: true,
          });
          newAbilitiesCount = granted.count;
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
  studentId: string,
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
  let newAvatar: Avatar;
  try {
    newAvatar = await prisma.avatar.create({
      data: {
        studentId,
        stage: "GENERAL", // Explorer stage
        archetype: null, // No archetype until specialty selected
        level: initialLevel,
        xp: totalBackfilledXp,
        hp: 100,
        energy: 100,
        speed: 0, // General stats start at 0
        control: 0,
        focus: 0,
      },
    });
  } catch (e) {
    // #832 item 3: two concurrent first completions by a brand-new student
    // both saw "no avatar" and raced this create. Avatar.studentId is unique,
    // so the loser gets P2002 — which proves the winner's row is committed
    // (a conflicting INSERT blocks on the in-flight duplicate and errors only
    // after it commits). Re-read and continue as the existing-avatar path:
    // the winner reports the backfill; the loser is idempotent, not a 500.
    if ((e as { code?: string })?.code !== "P2002") throw e;
    const raced = await prisma.avatar.findUnique({ where: { studentId } });
    if (!raced) throw e; // concurrent delete (e.g. User cascade) — surface it
    return { avatar: raced, wasBackfilled: false, backfilledXp: 0 };
  }

  // NOTE: No abilities are unlocked for GENERAL avatars
  // Abilities are only unlocked when user selects a specialty (SPECIALIZED stage)

  console.log(
    `[ensureAvatarWithBackfill] Created GENERAL avatar: level=${initialLevel}, xp=${totalBackfilledXp}, completedCount=${completedCount}`,
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
    focus += Math.round(accuracy * 1); // 0-1 bonus
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
