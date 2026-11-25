import { isDeepStrictEqual } from "node:util";
import { performance } from "node:perf_hooks";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  GREAT_WORK_ENGINE_VERSION,
  canonicalize,
  parseStudioDraft,
  renderStudioName,
  verifyStudioDraft,
  type StudioDraft,
} from "@brightboost/greatwork-engine";

export const MACHINE_TYPE = "great_work_machine";

export class MachineRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

const count = z.number().int().nonnegative();
const lastRunSchema = z.object({
  solved: z.boolean(),
  cycles: count,
  cost: count,
  area: count,
  instructions: count,
  produced: z.array(
    z.object({ canonical: z.string(), count, firstTick: count }),
  ),
  mirrored: z.boolean(),
  engineVersion: z.string(),
  verifiedAt: z.string().datetime(),
});
const storedSchema = z
  .object({
    revision: count.min(1),
    parentCreationId: z.string().uuid().nullable(),
    lastRun: lastRunSchema,
  })
  .passthrough();

type VerifiedRun = z.infer<typeof lastRunSchema>;
export const machineFields = {
  id: true,
  courseId: true,
  content: true,
  updatedAt: true,
} as const;
type MachineRow = {
  id: string;
  courseId: string;
  content: Prisma.JsonValue;
  updatedAt: Date;
};

export function machineDTO(row: MachineRow) {
  const { lastRun, revision, parentCreationId, ...draft } = storedSchema.parse(
    row.content,
  );
  return {
    id: row.id,
    courseId: row.courseId,
    updatedAt: row.updatedAt,
    revision,
    parentCreationId,
    content: parseStudioDraft(draft),
    lastRun,
  };
}

function verify(draft: StudioDraft): VerifiedRun {
  const deadline = performance.now() + 750;
  try {
    const result = verifyStudioDraft(
      draft,
      () => performance.now() >= deadline,
    );
    if (performance.now() >= deadline) throw new Error("verification deadline");
    return {
      solved: result.solved,
      cycles: result.cycles,
      cost: result.cost,
      area: result.area,
      instructions: result.instructions,
      produced: result.produced.map(({ canonical, count, firstTick }) => ({
        canonical,
        count,
        firstTick,
      })),
      mirrored: result.mirrored ?? false,
      engineVersion: GREAT_WORK_ENGINE_VERSION,
      verifiedAt: new Date().toISOString(),
    };
  } catch {
    throw new MachineRequestError(422, "machine_verification_failed");
  }
}

type Metrics = { cycles: number; cost: number; area: number };
const metricsSchema = z.object({ cycles: count, cost: count, area: count });
const bestsSchema = z.object({
  overall: metricsSchema,
  byTarget: z.record(metricsSchema),
});
function lowerMetrics(run: Metrics, prior?: Metrics): Metrics {
  return {
    cycles: Math.min(run.cycles, prior?.cycles ?? Infinity),
    cost: Math.min(run.cost, prior?.cost ?? Infinity),
    area: Math.min(run.area, prior?.area ?? Infinity),
  };
}

async function recordPersonalBest(
  tx: Prisma.TransactionClient,
  studentId: string,
  draft: StudioDraft,
  run: VerifiedRun,
) {
  if (!run.solved || draft.mode !== "target" || !draft.targetProduct) return;
  // A learner may be enrolled in two courses. Serialize their best across both.
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${studentId} FOR NO KEY UPDATE`;
  const where = { studentId_gameKey: { studentId, gameKey: "great_work" } };
  const prior = await tx.gamePersonalBest.findUnique({
    where,
    select: { meta: true },
  });
  const parsed = bestsSchema.safeParse(prior?.meta);
  const bests = parsed.success ? parsed.data : undefined;
  const key = JSON.stringify([
    draft.levelKey,
    draft.targetCount,
    canonicalize(draft.targetProduct),
  ]);
  const meta = {
    overall: lowerMetrics(run, bests?.overall),
    byTarget: {
      ...bests?.byTarget,
      [key]: lowerMetrics(run, bests?.byTarget[key]),
    },
  };
  await tx.gamePersonalBest.upsert({
    where,
    create: { studentId, gameKey: "great_work", meta, playCount: 1 },
    update: { meta, lastPlayedAt: new Date(), playCount: { increment: 1 } },
  });
}

export const shelfQuery = (studentId: string, courseId: string) => ({
  courseId,
  authorId: studentId,
  type: MACHINE_TYPE,
  course: { enrollments: { some: { studentId } } },
});

type WriteMachine = {
  id: string;
  courseId: string;
  studentId: string;
  expectedRevision: number | null;
  content: unknown;
  parentCreationId?: string;
};

export async function saveMachine(
  tx: Prisma.TransactionClient,
  input: WriteMachine,
) {
  const { id, studentId, courseId, expectedRevision } = input;
  // Serializes revisions, duplicate PUTs and membership revocation until commit.
  const membership = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Enrollment" WHERE "studentId" = ${studentId} AND "courseId" = ${courseId} FOR UPDATE`;
  if (!membership.length) throw new MachineRequestError(403, "not_enrolled");

  let draft: StudioDraft;
  try {
    const submitted = input.content;
    if (
      submitted &&
      typeof submitted === "object" &&
      !Array.isArray(submitted) &&
      "lastRun" in submitted
    ) {
      // A result echoed by an older client is display-only. Always regenerate it.
      const { lastRun: _ignored, ...editable } = submitted;
      draft = parseStudioDraft(editable);
    } else {
      draft = parseStudioDraft(submitted);
    }
  } catch {
    throw new MachineRequestError(422, "invalid_machine");
  }

  const where = { ...shelfQuery(studentId, courseId), id };
  const row = await tx.creation.findFirst({ where, select: machineFields });
  const existing = row && machineDTO(row);
  const lineage = existing?.parentCreationId ?? input.parentCreationId ?? null;
  if (existing) {
    if (
      input.parentCreationId !== undefined &&
      input.parentCreationId !== existing.parentCreationId
    )
      throw new MachineRequestError(409, "machine_revision_conflict");
    if (existing.revision !== expectedRevision) {
      // Retry the immediately preceding write only when the learner sent the same design.
      if (
        existing.revision === (expectedRevision ?? 0) + 1 &&
        isDeepStrictEqual(existing.content, draft)
      )
        return { machine: existing, created: false };
      throw new MachineRequestError(409, "machine_revision_conflict");
    }
  } else {
    if (expectedRevision !== null)
      throw new MachineRequestError(404, "machine_not_found");
    if (
      lineage &&
      !(await tx.creation.findFirst({
        where: { ...where, id: lineage },
        select: { id: true },
      }))
    )
      throw new MachineRequestError(404, "machine_not_found");
  }
  const lastRun = verify(draft);
  const revision = (existing?.revision ?? 0) + 1;
  const content = {
    ...draft,
    revision,
    parentCreationId: lineage,
    lastRun,
  } as unknown as Prisma.InputJsonObject;
  const data = {
    content,
    title: renderStudioName(draft.nameSeed, draft.nameSeed.poolLocale),
  };
  const saved = existing
    ? await tx.creation.update({ where: { id }, data, select: machineFields })
    : await tx.creation.create({
        data: {
          ...data,
          id,
          authorId: studentId,
          courseId,
          type: MACHINE_TYPE,
          status: "IN_PROGRESS",
        },
        select: machineFields,
      });
  await recordPersonalBest(tx, studentId, draft, lastRun);
  return { machine: machineDTO(saved), created: !existing };
}
