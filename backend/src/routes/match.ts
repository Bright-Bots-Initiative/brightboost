import { Router } from "express";
import { PrismaClient, MatchStatus } from "@prisma/client";
import { requireAuth } from "../utils/auth";
import { resolveTurn } from "../services/game";

const router = Router();
const prisma = new PrismaClient();

// Queue for a match
router.post("/match/queue", requireAuth, async (req, res) => {
  const studentId = req.user!.id;
  const { band } = req.body; // e.g. "K2"

  const avatar = await prisma.avatar.findUnique({ where: { studentId } });
  if (!avatar) return res.status(400).json({ error: "No avatar found" });

  // Look for open match
  const openMatch = await prisma.match.findFirst({
    where: {
      status: MatchStatus.PENDING,
      band: band || "K2",
      NOT: { player1Id: avatar.id } // Don't match with self
    }
  });

  if (openMatch) {
    // Join
    const match = await prisma.match.update({
      where: { id: openMatch.id },
      data: {
        player2Id: avatar.id,
        status: MatchStatus.ACTIVE
      }
    });
    return res.json({ matchId: match.id, status: "MATCHED" });
  } else {
    // Create
    const match = await prisma.match.create({
      data: {
        player1Id: avatar.id,
        band: band || "K2",
        status: MatchStatus.PENDING
      }
    });
    return res.json({ matchId: match.id, status: "PENDING" });
  }
});

// Get match state
router.get("/match/:id", requireAuth, async (req, res) => {
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: {
      Player1: { include: { unlockedAbilities: { include: { Ability: true } } } },
      Player2: { include: { unlockedAbilities: { include: { Ability: true } } } },
      turns: true
    }
  });
  if (!match) return res.status(404).json({ error: "Match not found" });
  res.json(match);
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
  if (!myAvatar || (match.player1Id !== myAvatar.id && match.player2Id !== myAvatar.id)) {
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
