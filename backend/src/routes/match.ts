import { Router } from "express";
import prisma from "../utils/prisma";

const MatchStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  FORFEIT: "FORFEIT",
} as const;
type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];
import { requireAuth } from "../utils/auth";
import { resolveTurn, computeBattleState } from "../services/game";
import { isValidBand } from "../utils/validation";

const router = Router();

// Queue for a match
router.post("/match/queue", requireAuth, async (req, res) => {
  const studentId = req.user!.id;
  const { band } = req.body; // e.g. "K2"

  if (band && !isValidBand(band)) {
    return res.status(400).json({ error: "Invalid band" });
  }
  const selectedBand = band || "K2";

  const avatar = await prisma.avatar.findUnique({ where: { studentId } });
  if (!avatar) return res.status(400).json({ error: "No avatar found" });

  // Check if user is already in a pending match
  const existingPending = await prisma.match.findFirst({
    where: {
      player1Id: avatar.id,
      status: MatchStatus.PENDING,
    },
  });

  if (existingPending) {
    return res.json({ matchId: existingPending.id, status: "PENDING" });
  }

  // Look for open match
  const openMatch = await prisma.match.findFirst({
    where: {
      status: MatchStatus.PENDING,
      band: band || "K2",
      NOT: { player1Id: avatar.id }, // Don't match with self
    },
  });

  if (openMatch) {
    // Join
    const match = await prisma.match.update({
      where: { id: openMatch.id },
      data: {
        player2Id: avatar.id,
        status: MatchStatus.ACTIVE,
      },
    });
    return res.json({ matchId: match.id, status: "MATCHED" });
  } else {
    // Create
    const match = await prisma.match.create({
      data: {
        player1Id: avatar.id,
        band: band || "K2",
        status: MatchStatus.PENDING,
      },
    });
    return res.json({ matchId: match.id, status: "PENDING" });
  }
});

// Get match state
router.get("/match/:id", requireAuth, async (req, res) => {
  const studentId = req.user!.id;

  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: {
      Player1: {
        include: { unlockedAbilities: { include: { Ability: true } } },
      },
      Player2: {
        include: { unlockedAbilities: { include: { Ability: true } } },
      },
      turns: true,
    },
  });
  if (!match) return res.status(404).json({ error: "Match not found" });

  // 🛡️ Sentinel: Verify user is a participant (IDOR protection)
  const myAvatar = await prisma.avatar.findUnique({ where: { studentId } });

  // Access control: User must be a participant
  if (
    !myAvatar ||
    (match.player1Id !== myAvatar.id && match.player2Id !== myAvatar.id)
  ) {
    return res.status(403).json({ error: "Not authorized to view this match" });
  }

  const computed = computeBattleState(match, match.turns);
  res.json({ ...match, computed });
});

// Perform action
router.post("/match/:id/act", requireAuth, async (req, res) => {
  const { abilityId } = req.body;
  const studentId = req.user!.id;
  const matchId = req.params.id;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return res.status(404).json({ error: "Match not found" });

  // Verify user is in match
  const myAvatar = await prisma.avatar.findUnique({ where: { studentId } });
  if (
    !myAvatar ||
    (match.player1Id !== myAvatar.id && match.player2Id !== myAvatar.id)
  ) {
    return res.status(403).json({ error: "Not in this match" });
  }

  try {
    const result = await resolveTurn(matchId, myAvatar.id, abilityId);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
