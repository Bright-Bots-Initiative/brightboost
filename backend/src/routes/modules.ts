import { Router } from "express";
import prisma from "../utils/prisma";
import { getModuleWithContent } from "../services/module";
import { requireAuth } from "../utils/auth";

const router = Router();

// List all modules
router.get("/modules", requireAuth, async (_req, res) => {
  try {
    const modules = await prisma.module.findMany({
      where: { published: true },
      orderBy: { level: "asc" },
    });
    res.json(modules);
  } catch (error) {
    console.error("List modules error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get specific module (by slug)
router.get("/module/:slug", requireAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    // ⚡ Bolt Optimization: Use cached module structure
    const mod = await getModuleWithContent(slug);

    if (!mod) return res.status(404).json({ error: "not_found" });
    res.json(mod);
  } catch (error) {
    console.error("Get module error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
