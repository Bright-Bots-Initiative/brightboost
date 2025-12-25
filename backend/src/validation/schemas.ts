import { z } from "zod";

export const VALID_BANDS = ["K2", "G35"] as const;

export const checkpointSchema = z.object({
  studentId: z.string(),
  moduleSlug: z.string(),
  lessonId: z.string(),
  activityId: z.string(),
  timeSpentS: z.number().nonnegative(),
  completed: z.boolean().optional(),
});

export type CheckpointData = z.infer<typeof checkpointSchema>;

export const matchQueueSchema = z.object({
  band: z.enum(VALID_BANDS).optional(),
});
