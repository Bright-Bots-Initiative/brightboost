import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { requireAuth } from "../utils/auth";
import { z } from "zod";

const router = Router();

const feedbackSchema = z.object({
  role: z.string().max(50).optional(),
  liked: z.string().max(2000).optional(),
  confused: z.string().max(2000).optional(),
  strongest: z.string().max(2000).optional(),
  pilotInterest: z.enum(["high", "medium", "low", "na"]).optional(),
  wantsFollowUp: z.boolean().optional(),
  email: z.string().email().max(200).optional().or(z.literal("")),
});

router.post(
  "/feedback",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    await prisma.feedback.create({
      data: {
        userId: req.user?.id ?? null,
        role: parsed.data.role ?? null,
        liked: parsed.data.liked ?? null,
        confused: parsed.data.confused ?? null,
        strongest: parsed.data.strongest ?? null,
        pilotInterest: parsed.data.pilotInterest ?? null,
        wantsFollowUp: parsed.data.wantsFollowUp ?? false,
        email: parsed.data.email || null,
      },
    });

    res.status(201).json({ message: "Feedback received" });
  },
);

export default router;
