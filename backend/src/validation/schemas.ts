import { z } from "zod";

export const checkpointSchema = z.object({
  studentId: z.string(),
  moduleSlug: z.string(),
  lessonId: z.string(),
  activityId: z.string(),
  timeSpentS: z.number().nonnegative(),
  completed: z.boolean().optional(),
});

export type CheckpointData = z.infer<typeof checkpointSchema>;
