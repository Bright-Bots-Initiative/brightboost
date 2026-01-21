// backend/src/services/game.ts
import prisma from "../utils/prisma";

type AbilityRow = { id: string };

export async function checkUnlocks(studentId: string) {
  // Fetch progress count and avatar details concurrently.
  const [progressCount, avatar] = await Promise.all([
    prisma.progress.count({
      where: { studentId, status: "COMPLETED" },
    }),
    prisma.avatar.findUnique({ where: { studentId } }),
  ]);

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
