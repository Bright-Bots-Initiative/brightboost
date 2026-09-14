import {
  BIOTRAIL_ACTIVITY_ID,
  BIOTRAIL_LESSON_ID,
  BIOTRAIL_SLUG,
} from "@brightboost/greatwork-engine/dist/progression/advanced";
import { STEM_SET_3_IDS } from "@brightboost/greatwork-engine/dist/progression/stemSetIds";
import prisma from "../utils/prisma";
import { getModuleStructure } from "./module";
import { GameError } from "../utils/errors";
import type { CheckpointData } from "../validation/schemas";

const ProgressStatus = {
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;
type ProgressStatus = (typeof ProgressStatus)[keyof typeof ProgressStatus];

/**
 * A refused progress write. `status` is the HTTP answer and `message` is
 * safe to expose to the client (no ids, no payload echo).
 */
export class ProgressWriteError extends Error {
  readonly status: 400 | 403 | 404;
  constructor(status: 400 | 403 | 404, message: string) {
    super(message);
    this.name = "ProgressWriteError";
    this.status = status;
    Object.setPrototypeOf(this, ProgressWriteError.prototype);
  }
}

function loadActivityChain(activityId: string) {
  return prisma.activity.findUnique({
    where: { id: activityId },
    include: {
      Lesson: {
        include: { Unit: { include: { Module: { select: { slug: true } } } } },
      },
    },
  });
}

export type ResolvedActivity = {
  activity: NonNullable<Awaited<ReturnType<typeof loadActivityChain>>>;
  /** The module slug the chain resolves to — persisted instead of the body's. */
  moduleSlug: string;
  /** The activity's own lesson id — persisted instead of the body's. */
  lessonId: string;
};

/**
 * #876 (PROG-01): every progress writer resolves the activity through its
 * curriculum chain (Activity → Lesson → Unit → Module) before writing.
 *
 * - No Activity row (an orphan id, or a reserved Set 3 placeholder such as
 *   `set3-game-2`) → 404. Progress has no foreign key to Activity, so this is
 *   the check that keeps rows for non-activities out of the table.
 * - A module slug or lesson id that is not the activity's own → 400. The
 *   chain's identifiers are what get persisted, so the stored `moduleSlug` /
 *   `lessonId` can never disagree with the curriculum.
 *
 * A caller that omits `lessonId` (complete-activity's schema allows that)
 * gets the activity's lesson back instead of storing null.
 */
export async function resolveActivityForWrite(input: {
  activityId: string;
  moduleSlug: string;
  lessonId?: string | null;
}): Promise<ResolvedActivity> {
  const activity = await loadActivityChain(input.activityId);
  if (!activity) {
    throw new ProgressWriteError(404, "Activity not found");
  }
  const canonicalSlug = activity.Lesson?.Unit?.Module?.slug ?? null;
  const lessonMismatch =
    input.lessonId !== undefined &&
    input.lessonId !== null &&
    input.lessonId !== activity.lessonId;
  if (
    canonicalSlug === null ||
    canonicalSlug !== input.moduleSlug ||
    lessonMismatch
  ) {
    throw new ProgressWriteError(
      400,
      "Activity does not belong to this module or lesson",
    );
  }
  return { activity, moduleSlug: canonicalSlug, lessonId: activity.lessonId };
}

/**
 * The one prerequisite the backend enforces on a learner's own progress
 * writes: the advanced BioTrail lesson requires the matching earned specialty
 * and a complete Set 3. Set 1/2/3 locks themselves stay presentation-only
 * (#856, owner-deferred) — see docs/architecture/progress-integrity.md.
 *
 * Bound to the activity identity, so a forged module slug cannot skip it.
 * Shared by both writers (#876): a locked learner cannot open even an
 * in-progress BioTrail row.
 */
export async function assertAdvancedEligibility(
  studentId: string,
  activity: { id: string; lessonId: string },
  moduleSlug: string,
  lessonId: string,
): Promise<void> {
  if (activity.id !== BIOTRAIL_ACTIVITY_ID && moduleSlug !== BIOTRAIL_SLUG) {
    return;
  }
  if (
    activity.id !== BIOTRAIL_ACTIVITY_ID ||
    moduleSlug !== BIOTRAIL_SLUG ||
    lessonId !== BIOTRAIL_LESSON_ID ||
    activity.lessonId !== BIOTRAIL_LESSON_ID
  ) {
    throw new ProgressWriteError(
      400,
      "Activity does not belong to this advanced lesson",
    );
  }
  const [specialized, completed] = await Promise.all([
    prisma.avatar.findUnique({
      where: { studentId },
      select: { stage: true, archetype: true },
    }),
    prisma.progress.findMany({
      where: { studentId, status: "COMPLETED" },
      select: { activityId: true },
    }),
  ]);
  const completedIds = new Set(completed.map((p) => p.activityId));
  if (
    specialized?.stage !== "SPECIALIZED" ||
    specialized.archetype !== "BIOTECH" ||
    !STEM_SET_3_IDS.every((id) => completedIds.has(id))
  ) {
    throw new ProgressWriteError(
      403,
      "Complete Set 3 and choose Biotech before playing BioTrail",
    );
  }
}

/**
 * #876: a checkpoint is a time-keeping write, never a completion. It creates
 * the row as IN_PROGRESS and afterwards only adds time; it never touches
 * `status`, so a row that complete-activity has marked COMPLETED stays that
 * way through any number of later checkpoints. Callers pass the identifiers
 * `resolveActivityForWrite` returned, not the request body's.
 */
export async function upsertCheckpoint(
  data: Omit<CheckpointData, "completed">,
) {
  return prisma.progress.upsert({
    where: {
      studentId_activityId: {
        studentId: data.studentId,
        activityId: data.activityId,
      },
    },
    create: {
      studentId: data.studentId,
      moduleSlug: data.moduleSlug,
      lessonId: data.lessonId,
      activityId: data.activityId,
      status: ProgressStatus.IN_PROGRESS,
      timeSpentS: data.timeSpentS,
    },
    update: {
      timeSpentS: { increment: data.timeSpentS },
    },
  });
}

export async function getAggregatedProgress(
  studentId: string,
  moduleSlug: string,
) {
  // Aggregate by Unit -> Lesson -> Activity
  // This mimics the structure needed for the "map" view
  // Prisma doesn't do deep nested aggregation easily, so we might fetch raw or fetch all progress.

  // OPTIMIZED: Fetch progress and module structure in parallel
  const [progressItems, module] = await Promise.all([
    // 1. Get all progress for this user + module
    prisma.progress.findMany({
      where: { studentId, moduleSlug },
      select: {
        activityId: true,
        status: true,
        timeSpentS: true,
      },
    }),

    // 2. Get module structure (units, lessons, activities)
    // ⚡ Bolt Optimization: Use cached module structure
    getModuleStructure(moduleSlug),
  ]);

  if (!module) {
    throw new GameError(`Module ${moduleSlug} not found`);
  }

  // 3. Merge
  // We want to return the Module object but with an added "status" field on each node?
  // Or just return the list of completed activity IDs?
  // The frontend likely wants { activityId: 'completed', ... }

  const progressMap: Record<string, any> = {};
  progressItems.forEach((p: any) => {
    progressMap[p.activityId] = {
      status: p.status,
      timeSpentS: p.timeSpentS,
    };
  });

  return {
    module: {
      title: module.title,
      units: module.units.map((u: any) => ({
        ...u,
        lessons: u.lessons.map((l: any) => ({
          ...l,
          activities: l.activities.map((a: any) => {
            // ⚡ Bolt Optimization: Strip 'content' (JSON/HTML) from the aggregated view
            // This significantly reduces payload size for the dashboard/map view.
            const { content, ...rest } = a;
            return {
              ...rest,
              userProgress: progressMap[a.id] || null,
            };
          }),
        })),
      })),
    },
  };
}
