// backend/src/services/game.ts
import { PrismaClient, MatchStatus } from "@prisma/client";

const prisma = new PrismaClient();

// Rock-Paper-Scissors modifiers
// Using string literals to avoid runtime Enum issues
const modifiers: Record<string, string> = {
  "AI": "QUANTUM",       // AI > Quantum
  "QUANTUM": "BIOTECH",  // Quantum > Biotech
  "BIOTECH": "AI",       // Biotech > AI
};

export async function resolveTurn(matchId: string, actorId: string, abilityId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      Player1: { include: { unlockedAbilities: { include: { Ability: true } } } },
      Player2: { include: { unlockedAbilities: { include: { Ability: true } } } }
    },
  });

  if (!match || match.status !== MatchStatus.ACTIVE) throw new Error("Invalid match");

  const isP1 = match.player1Id === actorId;
  const actor = isP1 ? match.Player1 : match.Player2;
  const opponent = isP1 ? match.Player2 : match.Player1;

  if (!actor || !opponent) throw new Error("Missing players");

  const ability = await prisma.ability.findUnique({ where: { id: abilityId } });
  if (!ability) throw new Error("Ability not found");

  let damage = 0;
  let heal = 0;
  const config = ability.config as any;

  if (config.type === "attack") {
    damage = config.value || 10;
    // Check modifier
    if (modifiers[actor.archetype] === opponent.archetype) {
        damage = Math.floor(damage * 1.15);
    }
  } else if (config.type === "heal") {
    heal = config.value || 10;
  }

  await prisma.matchTurn.create({
    data: {
      matchId,
      round: (await prisma.matchTurn.count({ where: { matchId } })) + 1,
      actorId,
      action: {
        abilityId,
        damageDealt: damage,
        healAmount: heal
      }
    }
  });

  const turns = await prisma.matchTurn.findMany({ where: { matchId } });

  let p1DamageTaken = 0;
  let p2DamageTaken = 0;

  for (const t of turns) {
      const act = t.action as any;
      if (t.actorId === match.player1Id) {
          p2DamageTaken += (act.damageDealt || 0);
          p1DamageTaken -= (act.healAmount || 0);
      } else {
          p1DamageTaken += (act.damageDealt || 0);
          p2DamageTaken -= (act.healAmount || 0);
      }
  }

  const p1CurrentHp = match.Player1.hp - p1DamageTaken;
  const p2CurrentHp = match.Player2!.hp - p2DamageTaken;

  if (p1CurrentHp <= 0 || p2CurrentHp <= 0 || turns.length >= 6) {
      let winnerId = null;
      if (p1CurrentHp > p2CurrentHp) winnerId = match.player1Id;
      else if (p2CurrentHp > p1CurrentHp) winnerId = match.player2Id;

      await prisma.match.update({
          where: { id: matchId },
          data: {
              status: MatchStatus.COMPLETED,
              winnerId: winnerId
          }
      });
      return { matchOver: true, winnerId, p1Hp: p1CurrentHp, p2Hp: p2CurrentHp };
  }

  return { matchOver: false, p1Hp: p1CurrentHp, p2Hp: p2CurrentHp };
}

export async function checkUnlocks(studentId: string) {
    const progressCount = await prisma.progress.count({
        where: { studentId, status: "COMPLETED" }
    });

    const avatar = await prisma.avatar.findUnique({ where: { studentId }});
    if (!avatar) return;

    const newLevel = 1 + Math.floor(progressCount / 2);

    if (newLevel > avatar.level) {
        await prisma.avatar.update({
            where: { id: avatar.id },
            data: { level: newLevel, xp: { increment: 100 } }
        });

        // ⚡ Bolt Optimization: Batch fetch & create to avoid N+1 query
        const eligibleAbilities = await prisma.ability.findMany({
            where: { archetype: avatar.archetype, reqLevel: { lte: newLevel } }
        });

        if (eligibleAbilities.length === 0) return;

        const existingUnlocks = await prisma.unlockedAbility.findMany({
            where: {
                avatarId: avatar.id,
                abilityId: { in: eligibleAbilities.map(a => a.id) }
            },
            select: { abilityId: true }
        });

        const existingAbilityIds = new Set(existingUnlocks.map(u => u.abilityId));
        const newUnlocks = eligibleAbilities.filter(ab => !existingAbilityIds.has(ab.id));

        if (newUnlocks.length > 0) {
            await prisma.unlockedAbility.createMany({
                data: newUnlocks.map(ab => ({
                    avatarId: avatar.id,
                    abilityId: ab.id,
                    equipped: false
                }))
            });
        }
    }
}
