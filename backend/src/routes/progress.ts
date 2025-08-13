import { Router } from "express";
import {
  checkpointSchema,
  assessmentSubmitSchema,
} from "../validation/schemas";
import { upsertCheckpoint, getAggregatedProgress } from "../services/progress";
import { submitAssessment } from "../services/assessment";

const router = Router();

router.get("/progress/:studentId", async (req, res) => {
  const studentId = req.params.studentId;
  const moduleSlug = (req.query.module as string) || "stem-1";
  try {
    const result = await getAggregatedProgress(studentId, moduleSlug);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/progress/checkpoint", async (req, res) => {
  const parse = checkpointSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.flatten() });
  try {
    const saved = await upsertCheckpoint(parse.data);
    res.json({
      ok: true,
      id: saved.id,
      timeSpentS: saved.timeSpentS,
      status: saved.status,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/assessment/submit", async (req, res) => {
  const parse = assessmentSubmitSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.flatten() });
  try {
    const result = await submitAssessment(parse.data);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
