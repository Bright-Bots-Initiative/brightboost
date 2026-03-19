import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../utils/auth";
import { enableHomeAccess } from "../services/enableHomeAccess";
import { logAudit } from "../utils/audit";

const router = Router();

router.post(
  "/auth/home-access/enable",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== "student") {
        return res
          .status(403)
          .json({ error: "Only students can enable home access" });
      }

      const result = await enableHomeAccess(req.user.id, req.body);

      await logAudit("HOME_ACCESS_ENABLED", req.user.id, {
        email: result.email,
        ip: req.ip,
      });

      return res.json({ ok: true, user: result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      if (error instanceof Error) {
        if (error.message === "Email already in use") {
          return res.status(409).json({ error: error.message });
        }
        if (error.message === "Student not found") {
          return res.status(404).json({ error: error.message });
        }
      }
      console.error("Home access error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
