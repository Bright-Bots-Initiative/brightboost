// backend/src/services/game.ts
import prisma from "../utils/prisma";
import type { Avatar } from "@prisma/client";

type AbilityRow = { id: string };

export async function checkUnlocks(
  studentId: string,
  preloadedAvatar?: Avatar | null,
) {
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

  if (!avatar) return;

  const newLevel = 1 + Math.floor(progressCount / 2);

  if (newLevel > avatar.level) {
    await prisma.avatar.update({
      where: { id: avatar.id },
      data: { level: newLevel, xp: { increment: 100 } },
    });

    // Batch fetch & create to avoid N+1 query
    const eligibleAbilities = await prisma.ability.findMany({
      where: { archetype: avatar.archetype, reqLevel: { lte: newLevel } },
    });

    if (eligibleAbilities.length === 0) return;

    const existingUnlocks = await prisma.unlockedAbility.findMany({
      where: {
        avatarId: avatar.id,
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
          avatarId: avatar.id,
          abilityId: ab.id,
          equipped: false,
        })),
      });
    }
  }
}
