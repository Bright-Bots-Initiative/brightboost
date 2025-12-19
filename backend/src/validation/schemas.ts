import { z } from "zod";

export const checkpointSchema = z.object({
  studentId: z.string().min(1),
  moduleSlug: z.string().min(1).default("stem-1"),
  lessonId: z.string().min(1),
  activityId: z.string().min(1),
  status: z.enum(["IN_PROGRESS", "COMPLETED"]),
  timeDeltaS: z.number().int().min(0).max(3600).default(0),
});
