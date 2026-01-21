import { z } from "zod";

export const checkpointSchema = z.object({
  studentId: z.string().max(100),
  moduleSlug: z.string().max(100),
  lessonId: z.string().max(100),
  activityId: z.string().max(100),
  timeSpentS: z.number().nonnegative(),
  completed: z.boolean().optional(),
});

export type CheckpointData = z.infer<typeof checkpointSchema>;

export const completeActivitySchema = z.object({
  moduleSlug: z.string().min(1, "Module slug required").max(100),
  lessonId: z.string().max(100).optional().nullable(),
  activityId: z.string().min(1, "Activity ID required").max(100),
  timeSpentS: z.number().int().nonnegative().optional().default(0),
});

export const selectArchetypeSchema = z.object({
  archetype: z.enum(["AI", "QUANTUM", "BIOTECH"]),
});
