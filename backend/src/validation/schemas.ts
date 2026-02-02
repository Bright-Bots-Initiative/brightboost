import { z } from "zod";

// 🛡️ Sentinel: Shared validation schemas for consistent security

// 🛡️ Sentinel: Prevent XSS by disallowing HTML tags in user input
export const safeString = z
  .string()
  .regex(/^[^<>]*$/, "Input cannot contain HTML characters (< or >)");

// 🛡️ Sentinel: ID validation for CUIDs/UUIDs
export const idSchema = z
  .string()
  .min(1, "ID is required")
  .max(50, "ID too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid ID format");

export const nameSchema = safeString
  .min(1, "Name is required")
  .max(100, "Name too long");

// 🛡️ Sentinel: Enforce email normalization to prevent duplicate accounts via case variance
export const emailSchema = z
  .string()
  .email("Invalid email")
  .max(255, "Email too long")
  .toLowerCase();

// 🛡️ Sentinel: Enforce reasonable limits on time spent to prevent integer overflow and data corruption
// Cap at 24 hours (86400 seconds)
export const timeSpentSchema = z
  .number()
  .int()
  .nonnegative()
  .max(86400, "Time spent cannot exceed 24 hours");

export const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(100, "Slug too long")
  .regex(
    /^[a-z0-9-]+$/,
    "Invalid slug format (only lowercase, numbers, hyphens)",
  );

export const levelSchema = z
  .string()
  .min(1, "Level is required")
  .max(20, "Level too long")
  .regex(
    /^[a-zA-Z0-9-]+$/,
    "Invalid level format (only alphanumeric and hyphens)",
  );

export const checkpointSchema = z.object({
  studentId: z.string().max(100),
  moduleSlug: slugSchema,
  lessonId: z.string().max(100),
  activityId: z.string().max(100),
  timeSpentS: timeSpentSchema,
  completed: z.boolean().optional(),
});

export type CheckpointData = z.infer<typeof checkpointSchema>;

export const completeActivitySchema = z.object({
  moduleSlug: slugSchema,
  lessonId: z.string().max(100).optional().nullable(),
  activityId: z.string().min(1, "Activity ID required").max(100),
  timeSpentS: timeSpentSchema.optional().default(0),
});

export const selectArchetypeSchema = z.object({
  archetype: z.enum(["AI", "QUANTUM", "BIOTECH"]),
});
