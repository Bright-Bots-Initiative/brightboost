import { Router } from "express";
import prisma from "../utils/prisma";
import { z } from "zod";
const MatchStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  FORFEIT: "FORFEIT",
} as const;
type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];
import { requireAuth } from "../utils/auth";
import {
  resolveTurn,
  computeBattleState,
  claimTimeout,
  matchInclude,
} from "../services/game";
import { getQuestionForBand } from "../services/pvpQuestions";
import { matchQueueSchema, matchActSchema } from "../validation/schemas";
const router = Router();
router.post("/match/queue", requireAuth, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const { band } = matchQueueSchema.parse(req.body);
    const selectedBand = band || "K2";
    const avatar = await prisma.avatar.findUnique({ where: { studentId } });
    if (!avatar) return res.status(400).json({ error: "No avatar found" });
    const existingPending = await prisma.match.findFirst({
      where: { player1Id: avatar.id, status: MatchStatus.PENDING },
    });
    if (existingPending)
      return res.json({ matchId: existingPending.id, status: "PENDING" });
    const openMatch = await prisma.match.findFirst({
      where: {
        status: MatchStatus.PENDING,
        band: selectedBand,
        NOT: { player1Id: avatar.id },
      },
    });
    if (openMatch) {
      const match = await prisma.match.update({
        where: { id: openMatch.id },
        data: { player2Id: avatar.id, status: MatchStatus.ACTIVE },
      });
      return res.json({ matchId: match.id, status: "MATCHED" });
    } else {
      const match = await prisma.match.create({
        data: {
          player1Id: avatar.id,
          band: selectedBand,
          status: MatchStatus.PENDING,
        },
      });
      return res.json({ matchId: match.id, status: "PENDING" });
    }
  } catch (error) {
    if (error instanceof z.ZodError)
      return res.status(400).json({ error: error.errors });
    console.error("Match queue error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/match/:id", requireAuth, async (req, res) => {
  const studentId = req.user!.id;

  // ⚡ Bolt Optimization:
  // 1. Fetch match and avatar concurrently using Promise.all to reduce latency.
  // 2. Explicitly fetch unlocked abilities ONLY for the requesting user.
  // This prevents information leakage (seeing opponent's hand) and reduces payload size.

  const [match, myAvatar] = await Promise.all([
    prisma.match.findUnique({
      where: { id: req.params.id },
      include: {
        Player1: {
          select: {
            id: true,
            archetype: true,
            hp: true,
            level: true,
            xp: true,
            energy: true,
          },
        },
        Player2: {
          select: {
            id: true,
            archetype: true,
            hp: true,
            level: true,
            xp: true,
            energy: true,
          },
        },
        turns: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.avatar.findUnique({ where: { studentId } }),
  ]);

  if (!match) return res.status(404).json({ error: "Match not found" });
  if (
    !myAvatar ||
    (match.player1Id !== myAvatar.id && match.player2Id !== myAvatar.id)
  )
    return res.status(403).json({ error: "Not authorized to view this match" });

  // Fetch abilities for ME only
  const myAbilities = await prisma.unlockedAbility.findMany({
    where: { avatarId: myAvatar.id },
    include: { Ability: true },
  });

  // Attach abilities to the correct player object in the response
  const responseMatch: any = { ...match };
  if (match.player1Id === myAvatar.id) {
    if (responseMatch.Player1) {
      responseMatch.Player1.unlockedAbilities = myAbilities;
    }
  } else if (match.player2Id === myAvatar.id) {
    if (responseMatch.Player2) {
      responseMatch.Player2.unlockedAbilities = myAbilities;
    }
  }

  const computed = computeBattleState(responseMatch, match.turns);
  res.json({ ...responseMatch, computed });
});
router.get("/match/:id/question", requireAuth, async (req, res) => {
  const studentId = req.user!.id;
  const matchId = req.params.id;

  // ⚡ Bolt Optimization: Parallelize independent DB fetches
  const [match, myAvatar] = await Promise.all([
    prisma.match.findUnique({ where: { id: matchId } }),
    prisma.avatar.findUnique({ where: { studentId } }),
  ]);

  if (!match) return res.status(404).json({ error: "Match not found" });

  if (
    !myAvatar ||
    (match.player1Id !== myAvatar.id && match.player2Id !== myAvatar.id)
  )
    return res.status(403).json({ error: "Not authorized to view this match" });
  if (match.status !== MatchStatus.ACTIVE)
    return res.status(409).json({ error: "Match not active" });
  const question = getQuestionForBand(match.band || "K2");
  res.json(question);
});
router.post("/match/:id/act", requireAuth, async (req, res) => {
  try {
    const { abilityId, quiz } = matchActSchema.parse(req.body);
    const studentId = req.user!.id;
    const matchId = req.params.id;

    // ⚡ Bolt Optimization:
    // 1. Parallelize match and avatar fetch.
    // 2. Fetch match with full includes needed for resolveTurn to avoid re-fetching in the service.
    const [match, myAvatar] = await Promise.all([
      prisma.match.findUnique({
        where: { id: matchId },
        include: matchInclude,
      }),
      prisma.avatar.findUnique({ where: { studentId } }),
    ]);

    if (!match) return res.status(404).json({ error: "Match not found" });

    if (
      !myAvatar ||
      (match.player1Id !== myAvatar.id && match.player2Id !== myAvatar.id)
    )
      return res.status(403).json({ error: "Not in this match" });

    // Pass the preloaded match object to resolveTurn
    const result = await resolveTurn(
      matchId,
      myAvatar.id,
      abilityId,
      quiz,
      match,
    );
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError)
      return res.status(400).json({ error: error.errors });
    if (error instanceof Error && error.message)
      return res.status(400).json({ error: error.message });
    console.error("Match act error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/match/:id/claim-timeout", requireAuth, async (req, res) => {
  const studentId = req.user!.id;
  const matchId = req.params.id;
  const myAvatar = await prisma.avatar.findUnique({ where: { studentId } });
  if (!myAvatar) return res.status(400).json({ error: "No avatar found" });
  try {
    const result = await claimTimeout(matchId, myAvatar.id);
    res.json(result);
  } catch (e: any) {
    if (e.message === "Timeout not claimable yet")
      res.status(409).json({ error: e.message });
    else res.status(400).json({ error: e.message });
  }
});
export default router;
