import { PrismaClient, ProgressStatus } from "@prisma/client";

const prisma = new PrismaClient();

type McItem = { type: "MC"; answerIndex: number; points: number };
type TfItem = { type: "TF"; answer: boolean; points: number };
type AnyItem = McItem | TfItem;

export async function submitAssessment(input: {
  studentId: string;
  lessonId: string;
  answers: Array<
    { type: "MC"; answerIndex: number } | { type: "TF"; answer: boolean }
  >;
}) {
  // 🛡️ Sentinel: Assessment model is missing from schema.
  // We cannot verify answers against the database.
  // We must fail securely rather than granting unearned progress.

  // For now, to fix the build, we assume failure or throw error.
  const score = 0;
  const maxScore = 100;
  const passed = false; // FAIL SECURELY: Do not auto-pass if validation is broken.

  // Logic: If the assessment cannot be validated, we should probably throw an error
  // so the user knows something is wrong, rather than just failing them silently.
  throw new Error("Assessment validation service is temporarily unavailable.");

  /*
  const existing = await prisma.progress.findFirst({
    where: {
      studentId: input.studentId,
      lessonId: input.lessonId,
      activityId: undefined,
    },
  });

  if (existing) {
    await prisma.progress.update({
      where: { id: existing.id },
      data: { status: ProgressStatus.COMPLETED },
    });
  } else {
    await prisma.progress.create({
      data: {
        studentId: input.studentId,
        moduleSlug: await inferModuleSlugFromLessonId(input.lessonId),
        lessonId: input.lessonId,
        activityId: "assessment-placeholder",
        status: ProgressStatus.COMPLETED,
      },
    });
  }

  return { score, maxScore, passed };
  */
}

async function inferModuleSlugFromLessonId(lessonId: string): Promise<string> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { Unit: { include: { Module: true } } },
  });
  if (!lesson?.Unit?.Module?.slug)
    throw new Error("Unable to infer module slug");
  return lesson.Unit.Module.slug;
}
