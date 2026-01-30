import { Router } from "express";
import prisma from "../utils/prisma";
import {
  getModuleWithContent,
  getAllModules,
  getModuleStructure,
} from "../services/module";
import { requireAuth } from "../utils/auth";
import { slugSchema, levelSchema } from "../validation/schemas";

const router = Router();

// List all modules
router.get("/modules", requireAuth, async (req, res) => {
  try {
    const level = req.query.level as string | undefined;

    // 🛡️ Sentinel: Validate input to prevent resource exhaustion or cache pollution
    if (level) {
      const parse = levelSchema.safeParse(level);
      if (!parse.success) {
        return res.status(400).json({ error: "Invalid level format" });
      }
    }

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
    const structureOnly = req.query.structure === "true";

    // 🛡️ Sentinel: Validate slug format
    const parse = slugSchema.safeParse(slug);
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid slug format" });
    }

    // ⚡ Bolt Optimization: Use cached module structure when content is not needed
    const mod = structureOnly
      ? await getModuleStructure(slug)
      : await getModuleWithContent(slug);

    if (!mod) return res.status(404).json({ error: "not_found" });

    // 🛡️ Sentinel: Prevent students from accessing unpublished modules (IDOR fix)
    if (!mod.published && req.user!.role === "student") {
      return res.status(404).json({ error: "not_found" });
    }

    res.json(mod);
  } catch (error) {
    console.error("Get module error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
