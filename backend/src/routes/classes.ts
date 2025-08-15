import { Router } from "express";
import { requireAuth, requireRole } from "../utils/auth";
import { createClassSchema, joinClassSchema } from "../validation/schemas";
import { createClass, listClasses, joinClass } from "../services/classes";

const router = Router();

router.get(
  "/classes",
  requireAuth,
  requireRole("teacher"),
  async (req, res) => {
    const teacherId = req.user!.id;
    const data = await listClasses(teacherId);
    res.json(data);
  },
);

router.post(
  "/classes",
  requireAuth,
  requireRole("teacher"),
  async (req, res) => {
    const parsed = createClassSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.flatten() });
    const teacherId = req.user!.id;
    const created = await createClass(teacherId, parsed.data.name);
    res.status(201).json(created);
  },
);

router.post(
  "/classes/join",
  requireAuth,
  requireRole("student"),
  async (req, res) => {
    const parsed = joinClassSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const result = await joinClass(
        parsed.data.inviteCode,
        parsed.data.studentId,
      );
      res.json({ ok: true, ...result });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },
);

export default router;
