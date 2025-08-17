import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const router = Router();

router.get("/module/stem-1", async (_req, res) => {
  const mod = await prisma.module.findUnique({
    where: { slug: "stem-1" },
    include: {
      units: {
        orderBy: { index: "asc" },
        include: {
          lessons: {
            orderBy: { index: "asc" },
            include: {
              activities: { orderBy: { index: "asc" } },
              assessment: true,
            },
          },
        },
      },
      badges: true,
    },
  });
  if (!mod) return res.status(404).json({ error: "not_found" });
  res.json(mod);
});

export default router;
