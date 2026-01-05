import { z } from "zod";
import { VALID_BANDS } from "../utils/validation";

export const checkpointSchema = z.object({
  studentId: z.string(),
  moduleSlug: z.string(),
  lessonId: z.string(),
  activityId: z.string(),
  timeSpentS: z.number().nonnegative(),
  completed: z.boolean().optional(),
});

export type CheckpointData = z.infer<typeof checkpointSchema>;

// Match Validation
export const matchQueueSchema = z.object({
  band: z
    .enum([VALID_BANDS[0], ...VALID_BANDS.slice(1)] as [string, ...string[]])
    .optional(),
});

export const matchActSchema = z.object({
  abilityId: z.string().min(1, "Ability ID required"),
  quiz: z
    .object({
      questionId: z.string(),
      answerIndex: z.number().int().min(0),
    })
    .optional(),
});
