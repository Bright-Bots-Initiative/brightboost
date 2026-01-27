import { z } from "zod";

// 🛡️ Sentinel: Shared validation schemas for consistent security

// 🛡️ Sentinel: Prevent XSS by disallowing HTML tags in user input
export const safeString = z
  .string()
  .regex(/^[^<>]*$/, "Input cannot contain HTML characters (< or >)");

export const nameSchema = safeString
  .min(1, "Name is required")
  .max(100, "Name too long");

export const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(100, "Slug too long")
  .regex(/^[a-z0-9-]+$/, "Invalid slug format (only lowercase, numbers, hyphens)");

export const levelSchema = z
  .string()
  .min(1, "Level is required")
  .max(20, "Level too long")
  .regex(/^[a-zA-Z0-9-]+$/, "Invalid level format (only alphanumeric and hyphens)");

export const checkpointSchema = z.object({
  studentId: z.string().max(100),
  moduleSlug: slugSchema,
  lessonId: z.string().max(100),
  activityId: z.string().max(100),
  timeSpentS: z.number().nonnegative(),
  completed: z.boolean().optional(),
});

export type CheckpointData = z.infer<typeof checkpointSchema>;

export const completeActivitySchema = z.object({
  moduleSlug: slugSchema,
  lessonId: z.string().max(100).optional().nullable(),
  activityId: z.string().min(1, "Activity ID required").max(100),
  timeSpentS: z.number().int().nonnegative().optional().default(0),
});

export const selectArchetypeSchema = z.object({
  archetype: z.enum(["AI", "QUANTUM", "BIOTECH"]),
});
