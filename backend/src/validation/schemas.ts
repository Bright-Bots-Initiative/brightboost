import { z } from 'zod';

export const checkpointSchema = z.object({
  studentId: z.string().min(1),
  moduleSlug: z.string().min(1).default('stem-1'),
  lessonId: z.string().min(1),
  activityId: z.string().optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED']),
  timeDeltaS: z.number().int().min(0).max(3600).default(0),
});

export const assessmentSubmitSchema = z.object({
  studentId: z.string().min(1),
  lessonId: z.string().min(1),
  answers: z.array(
    z.union([
      z.object({
        type: z.literal('MC'),
        answerIndex: z.number().int().min(0),
      }),
      z.object({
        type: z.literal('TF'),
        answer: z.boolean(),
      }),
    ])
  ).min(1),
});

export const createClassSchema = z.object({
  name: z.string().min(2).max(60),
});

export const joinClassSchema = z.object({
  inviteCode: z.string().min(4),
  studentId: z.string().min(1),
});
