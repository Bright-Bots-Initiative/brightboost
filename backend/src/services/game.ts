// backend/src/services/game.ts
import prisma from "../utils/prisma";
import { checkAnswer } from "./pvpQuestions";

const MatchStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  FORFEIT: "FORFEIT",
} as const;
type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];

type AbilityRow = { id: string };

// Rock-Paper-Scissors modifiers
// Using string literals to avoid runtime Enum issues
const modifiers: Record<string, string> = {
  AI: "QUANTUM", // AI > Quantum
  QUANTUM: "BIOTECH", // Quantum > Biotech
  BIOTECH: "AI", // Biotech > AI
};

export function computeBattleState(match: any, turns: any[]) {
  // Sort turns by round to ensure correct order
  const sortedTurns = [...turns].sort((a, b) => a.round - b.round);

  let p1Hp = match.Player1.hp;
  // Player2 might be null if not loaded or still pending, but usually loaded in context
  let p2Hp = match.Player2?.hp || 100;

  const log: any[] = [];
  let lastEvent = null;

  for (const t of sortedTurns) {
    const act = t.action as any;
    const isP1 = t.actorId === match.player1Id;

    // Construct log entry
    const entry = {
      round: t.round,
      actorId: t.actorId,
      abilityId: act.abilityId,
      damageDealt: act.damageDealt || 0,
      healAmount: act.healAmount || 0,
    };
    log.push(entry);
    lastEvent = entry;

    if (isP1) {
      p2Hp -= entry.damageDealt;
      p1Hp += entry.healAmount;
    } else {
      p1Hp -= entry.damageDealt;
      p2Hp += entry.healAmount;
    }
  }

  return {
    p1Hp,
    p2Hp,
    log,
    lastEvent,
  };
}

export const TURN_SECONDS = 30;

export async function resolveTurn(
  matchId: string,
  actorId: string,
  abilityId: string,
  quiz?: { questionId: string; answerIndex: number },
) {
  // ⚡ Bolt Optimization:
  // Split fetch to avoid massive joined query (Match + P1.Abilities + P2.Abilities + Turns).
  // 1. Fetch Match + Turns + Basic Players (lightweight).
  // 2. Fetch only the ACTOR'S ability to verify (indexed single row lookup).

  // ⚡ Bolt Optimization: Parallelize independent DB fetches
  // Fetch Match context and Ability verification concurrently to reduce latency.
  const [match, unlocked] = await Promise.all([
    prisma.match.findUnique({
      where: { id: matchId },
      include: {
        Player1: { select: { id: true, archetype: true, hp: true } },
        Player2: { select: { id: true, archetype: true, hp: true } },
        turns: {
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.unlockedAbility.findFirst({
      where: {
        avatarId: actorId,
        abilityId: abilityId,
      },
      include: { Ability: true },
    }),
  ]);

  if (!match || match.status !== MatchStatus.ACTIVE)
    throw new Error("Invalid match");

  const turns = match.turns;
  const currentTurnIndex = turns.length;
  const expectedActorId =
    currentTurnIndex % 2 === 0 ? match.player1Id : match.player2Id;

  if (actorId !== expectedActorId) {
    throw new Error("Not your turn");
  }

  const isP1 = match.player1Id === actorId;
  const actor = isP1 ? match.Player1 : match.Player2;
  const opponent = isP1 ? match.Player2 : match.Player1;

  if (!actor || !opponent) throw new Error("Missing players");

  if (!unlocked || !unlocked.Ability) {
    throw new Error("Ability not unlocked");
  }

  const ability = unlocked.Ability;

  let damage = 0;
  let heal = 0;
  const config = ability.config as any;

  let quizResult = null;
  if (quiz && typeof quiz === "object") {
    // 🛡️ Sentinel: Validate quiz input structure
    // We ignore any 'correct' or 'bonusMult' sent by the client and recalculate server-side
    const { questionId, answerIndex } = quiz as any;

    if (typeof questionId === "string" && typeof answerIndex === "number") {
      const isCorrect = checkAnswer(
        match.band || "K2",
        questionId,
        answerIndex,
      );
      if (isCorrect) {
        quizResult = {
          questionId,
          correct: true,
          bonusMult: 1.25,
        };
      } else {
        quizResult = {
          questionId,
          correct: false,
        };
      }
    }
  }

  if (config.type === "attack") {
    damage = config.value || 10;

    // 1. Archetype bonus
    if (modifiers[actor.archetype] === opponent.archetype) {
      damage = Math.floor(damage * 1.15);
    }

    // 2. Knowledge bonus
    if (quizResult?.correct) {
      damage = Math.floor(damage * 1.25);
    }
  } else if (config.type === "heal") {
    heal = config.value || 10;

    // Knowledge bonus for heal too
    if (quizResult?.correct) {
      heal = Math.floor(heal * 1.25);
    }
  }

  const nextRound = turns.length + 1;

  const newTurn = await prisma.matchTurn.create({
    data: {
      matchId,
      round: nextRound,
      actorId,
      action: {
        abilityId,
        damageDealt: damage,
        healAmount: heal,
        knowledge: quizResult,
      },
    },
  });

  turns.push(newTurn);

  const { p1Hp: p1CurrentHp, p2Hp: p2CurrentHp } = computeBattleState(
    match,
    turns,
  );

  if (p1CurrentHp <= 0 || p2CurrentHp <= 0 || turns.length >= 6) {
    let winnerId = null;
    if (p1CurrentHp > p2CurrentHp) winnerId = match.player1Id;
    else if (p2CurrentHp > p1CurrentHp) winnerId = match.player2Id;

    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.COMPLETED,
        winnerId: winnerId,
      },
    });
    return { matchOver: true, winnerId, p1Hp: p1CurrentHp, p2Hp: p2CurrentHp };
  }

  return { matchOver: false, p1Hp: p1CurrentHp, p2Hp: p2CurrentHp };
}

export async function claimTimeout(matchId: string, requesterId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { turns: { orderBy: { createdAt: "asc" } } },
  });

  if (!match || match.status !== MatchStatus.ACTIVE)
    throw new Error("Match not active");
  if (!match.player2Id) throw new Error("Match waiting for players");

  if (match.player1Id !== requesterId && match.player2Id !== requesterId) {
    throw new Error("Not a participant");
  }

  const turns = match.turns;
  const turnIndex = turns.length;
  const expectedActorId =
    turnIndex % 2 === 0 ? match.player1Id : match.player2Id;

  // Requester must be the one WAITING (i.e. expected actor is the opponent)
  if (requesterId === expectedActorId) {
    throw new Error("It is your turn, cannot claim timeout");
  }

  // Calculate deadline
  // If no turns, use match.updatedAt (when it became ACTIVE usually)
  // If turns exist, use the last turn's createdAt
  let lastActionTime = match.updatedAt;
  if (turns.length > 0) {
    lastActionTime = turns[turns.length - 1].createdAt;
  }

  const deadline = new Date(lastActionTime.getTime() + TURN_SECONDS * 1000);
  const now = new Date();

  if (now > deadline) {
    // Forfeit
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.FORFEIT,
        winnerId: requesterId,
      },
    });
    return {
      matchOver: true,
      winnerId: requesterId,
      status: MatchStatus.FORFEIT,
    };
  } else {
    throw new Error("Timeout not claimable yet");
  }
}

export async function checkUnlocks(studentId: string) {
  const progressCount = await prisma.progress.count({
    where: { studentId, status: "COMPLETED" },
  });

  const avatar = await prisma.avatar.findUnique({ where: { studentId } });
  if (!avatar) return;

  const newLevel = 1 + Math.floor(progressCount / 2);

  if (newLevel > avatar.level) {
    await prisma.avatar.update({
      where: { id: avatar.id },
      data: { level: newLevel, xp: { increment: 100 } },
    });

    // ⚡ Bolt Optimization: Batch fetch & create to avoid N+1 query
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
