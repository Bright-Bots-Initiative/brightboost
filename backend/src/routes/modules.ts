import { Router } from "express";
import prisma from "../utils/prisma";
import { getModuleWithContent, getAllModules } from "../services/module";
import { requireAuth } from "../utils/auth";

const router = Router();

// List all modules
router.get("/modules", requireAuth, async (req, res) => {
  try {
    const level = req.query.level as string | undefined;
    // ⚡ Bolt Optimization: Use cached module list with optional server-side filtering
    // This reduces payload size when client only needs specific grade levels (e.g. K-2)
    const modules = await getAllModules({ level });
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
    const mod = await getModuleWithContent(slug as string);

    if (!mod) return res.status(404).json({ error: "not_found" });
    res.json(mod);
  } catch (error) {
    console.error("Get module error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
