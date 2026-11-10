// backend/src/routes/context.ts
// Intentionally public Task Ranker integration: aggregate rates only, no identities.
// One cache entry per process, shared across callers and query strings. Replicas
// have independent caches/limits; use a shared store if the backend scales out.
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import prisma from "../utils/prisma";

const router = Router();
const CACHE_TTL_MS = 60_000;
const FAILURE_RETRY_MS = 5_000;

router.use(
  rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many context requests, please try again later." },
  }),
);

async function computeSignals() {
  // EXISTS-based counts return six scalars instead of a row per student.
  // Drop-off preserves the previous groupBy(studentId) population (all users
  // with progress, regardless of role), counting each user once.
  const counts = await Promise.allSettled([
    prisma.user.count({ where: { role: "student" } }),
    prisma.user.count({ where: { role: "student", progress: { some: {} } } }),
    prisma.user.count({ where: { role: "teacher" } }),
    prisma.user.count({ where: { role: "teacher", courses: { some: {} } } }),
    prisma.user.count({ where: { progress: { some: {} } } }),
    prisma.user.count({
      where: { progress: { some: { status: "COMPLETED" } } },
    }),
  ]);
  // Wait for every query to settle even when one fails, keeping the batch
  // coalesced until the database work actually ends.
  const [
    totalStudents,
    activatedStudents,
    totalTeachers,
    activeTeachers,
    startedCount,
    completedCount,
  ] = counts.map((result) => {
    if (result.status === "rejected") throw result.reason;
    return result.value;
  });
  const activationRate =
    totalStudents > 0
      ? Math.round((activatedStudents / totalStudents) * 100) / 100
      : 0;
  const teacherAdoption =
    totalTeachers > 0
      ? Math.round((activeTeachers / totalTeachers) * 100) / 100
      : 0;
  const dropOff =
    startedCount > 0
      ? Math.round(((startedCount - completedCount) / startedCount) * 100) / 100
      : 0;

  return {
    app: "Bright Boost",
    signals: [
      {
        type: "activation_rate",
        value: activationRate,
        label: `${Math.round(activationRate * 100)}% students activated`,
        boost: 2,
        threshold_dir: "below",
        threshold: 0.5,
      },
      {
        type: "drop_off",
        value: dropOff,
        label: `${Math.round(dropOff * 100)}% drop-off after first module`,
        boost: 3,
        threshold_dir: "above",
        threshold: 0.4,
      },
      {
        type: "teacher_adoption",
        value: teacherAdoption,
        label: `${Math.round(teacherAdoption * 100)}% of teachers set up class`,
        boost: 2,
        threshold_dir: "below",
        threshold: 0.6,
      },
    ],
  };
}

type ContextSignals = Awaited<ReturnType<typeof computeSignals>>;
let cache: { expiresAt: number; pending: Promise<ContextSignals> } | undefined;

function getSignals(): Promise<ContextSignals> {
  if (!cache || Date.now() >= cache.expiresAt) {
    // No new batch starts while the current one is pending. Start the TTL
    // after settlement, so a slow refresh cannot cause overlapping reads.
    const entry = { expiresAt: Infinity, pending: computeSignals() };
    cache = entry;
    entry.pending = entry.pending.then(
      (signals) => {
        entry.expiresAt = Date.now() + CACHE_TTL_MS;
        return signals;
      },
      (error: unknown) => {
        // Briefly reuse the failure too: an outage must not become a query
        // storm. Never serve an expired snapshot as current app signals.
        entry.expiresAt = Date.now() + FAILURE_RETRY_MS;
        console.error("/context aggregate refresh failed");
        throw error;
      },
    );
  }
  return cache.pending;
}

router.get("/", async (_req, res) => {
  // Keep freshness under this bounded server cache, not intermediary caches.
  res.set("Cache-Control", "no-store");
  try {
    res.json(await getSignals());
  } catch {
    res.status(500).json({ error: "Failed to compute signals" });
  }
});

export default router;
