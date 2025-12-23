import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// List all modules
router.get("/modules", async (_req, res) => {
  const modules = await prisma.module.findMany({
    where: { published: true },
    orderBy: { level: "asc" },
  });
  res.json(modules);
});

// Get specific module (by slug)
router.get("/module/:slug", async (req, res) => {
  const { slug } = req.params;
  const mod = await prisma.module.findUnique({
    where: { slug },
    include: {
      units: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              activities: { orderBy: { order: "asc" } },
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
