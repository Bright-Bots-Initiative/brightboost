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
        req.user!.id,
      );
      // Ensure result is an object before spreading
      // Typescript knows joinClass returns void (throws Error), so spreading void is invalid.
      // But we are in a catch block if it throws.
      // If we are here, result is... wait, the service throws unconditionally right now.
      // So this line is unreachable in practice, but TS complains about types.

      // I'll make it type-safe.
      const responseData = (result as any) || {};
      res.json({ ok: true, ...responseData });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },
);

export default router;
