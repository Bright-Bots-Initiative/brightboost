import { Router } from "express";
import prisma from "../utils/prisma";
import { getModuleWithContent } from "../services/module";

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
  // ⚡ Bolt Optimization: Use cached module structure
  const mod = await getModuleWithContent(slug);

  if (!mod) return res.status(404).json({ error: "not_found" });
  res.json(mod);
});

export default router;
