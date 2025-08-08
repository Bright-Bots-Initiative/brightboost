import { PrismaClient, ProgressStatus } from '@prisma/client';

const prisma = new PrismaClient();

type McItem = { type: 'MC'; answerIndex: number; points: number };
type TfItem = { type: 'TF'; answer: boolean; points: number };
type AnyItem = McItem | TfItem;

export async function submitAssessment(input: {
  studentId: string;
  lessonId: string;
  answers: Array<{ type: 'MC'; answerIndex: number } | { type: 'TF'; answer: boolean }>;
}) {
  const assessment = await prisma.assessment.findUnique({ where: { lessonId: input.lessonId } });
  if (!assessment) throw new Error('No assessment for this lesson');

  const items = assessment.items as unknown as AnyItem[];
  if (!Array.isArray(items) || items.length === 0) throw new Error('Invalid assessment items');

  const maxScore = assessment.maxScore;
  let score = 0;
  const n = Math.min(items.length, input.answers.length);

  for (let i = 0; i < n; i++) {
    const key = items[i];
    const ans = input.answers[i] as any;
    if (key.type === 'MC' && ans?.type === 'MC') {
      if (ans.answerIndex === (key as McItem).answerIndex) score += (key as McItem).points;
    } else if (key.type === 'TF' && ans?.type === 'TF') {
      if (ans.answer === (key as TfItem).answer) score += (key as TfItem).points;
    }
  }

  score = Math.min(score, maxScore);
  const passed = score >= Math.ceil(maxScore * 0.6);

  const existing = await prisma.progress.findFirst({
    where: { studentId: input.studentId, lessonId: input.lessonId, activityId: null },
  });

  if (existing) {
    await prisma.progress.update({
      where: { id: existing.id },
      data: { status: ProgressStatus.COMPLETED, score },
    });
  } else {
    await prisma.progress.create({
      data: {
        studentId: input.studentId,
        moduleSlug: await inferModuleSlugFromLessonId(input.lessonId),
        lessonId: input.lessonId,
        activityId: null,
        status: ProgressStatus.COMPLETED,
        score,
      },
    });
  }

  return { score, maxScore, passed };
}

async function inferModuleSlugFromLessonId(lessonId: string): Promise<string> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { Unit: { include: { Module: true } } },
  });
  if (!lesson?.Unit?.Module?.slug) throw new Error('Unable to infer module slug');
  return lesson.Unit.Module.slug;
}
