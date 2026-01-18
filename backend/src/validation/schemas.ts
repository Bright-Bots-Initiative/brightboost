import { z } from "zod";
import { VALID_BANDS } from "../utils/validation";

export const checkpointSchema = z.object({
  studentId: z.string().max(100),
  moduleSlug: z.string().max(100),
  lessonId: z.string().max(100),
  activityId: z.string().max(100),
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
  abilityId: z.string().min(1, "Ability ID required").max(100),
  quiz: z
    .object({
      questionId: z.string().max(100),
      answerIndex: z.number().int().min(0),
    })
    .optional(),
});

export const completeActivitySchema = z.object({
  moduleSlug: z.string().min(1, "Module slug required").max(100),
  lessonId: z.string().max(100).optional().nullable(),
  activityId: z.string().min(1, "Activity ID required").max(100),
  timeSpentS: z.number().int().nonnegative().optional().default(0),
});

export const selectArchetypeSchema = z.object({
  archetype: z.enum(["AI", "QUANTUM", "BIOTECH"]),
});
