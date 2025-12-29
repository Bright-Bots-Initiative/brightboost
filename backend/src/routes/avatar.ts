import { Router } from "express";
import prisma from "../utils/prisma";
import { requireAuth } from "../utils/auth";

const router = Router();

// Get current user's avatar
router.get("/avatar/me", requireAuth, async (req, res) => {
  const studentId = req.user!.id;
  const avatar = await prisma.avatar.findUnique({
    where: { studentId },
    include: { unlockedAbilities: { include: { Ability: true } } },
  });

  if (!avatar) {
    return res.json({ avatar: null });
  }

  res.json({ avatar });
});

// Select archetype (create avatar)
router.post("/avatar/select-archetype", requireAuth, async (req, res) => {
  const studentId = req.user!.id;
  const { archetype } = req.body;

  const validArchetypes = ["AI", "QUANTUM", "BIOTECH"];

  if (!validArchetypes.includes(archetype)) {
    return res.status(400).json({ error: "Invalid archetype" });
  }

  // Check if already exists
  const existing = await prisma.avatar.findUnique({ where: { studentId } });
  if (existing) {
    return res.status(400).json({ error: "Avatar already exists" });
  }

  // Create avatar
  const avatar = await prisma.avatar.create({
    data: {
      studentId,
      archetype: archetype as any, // Cast to any to avoid TS enum check which might be strict
      level: 1,
      xp: 0,
      hp: 100,
      energy: 100,
    },
  });

  // Unlock default abilities
  const defaults = await prisma.ability.findMany({
    where: { archetype: archetype as any, reqLevel: 1 },
  });

  for (const ab of defaults) {
    await prisma.unlockedAbility.create({
      data: { avatarId: avatar.id, abilityId: ab.id },
    });
  }

  res.json({ avatar });
});

export default router;
