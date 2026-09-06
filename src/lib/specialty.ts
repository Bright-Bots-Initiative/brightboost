export const SPECIALTIES = ["AI", "QUANTUM", "BIOTECH"] as const;
export type Specialty = (typeof SPECIALTIES)[number];
export function isSpecialty(value: unknown): value is Specialty {
  return SPECIALTIES.some((item) => item === value);
}
import { BIOTRAIL_SLUG } from "@shared/progression/advanced";
export { BIOTRAIL_SLUG };
export const BIOTRAIL_PATH = `/student/modules/${BIOTRAIL_SLUG}/lessons/biotrail-field-lab/activities/biotrail`;
export const SPECIALTY_UPDATED = "brightboost:specialty-updated";
export type SpecialtyStatus = {
  unlocked: boolean;
  specialty: Specialty | null;
  completed: number;
  required: number;
};
export function parseSpecialtyStatus(value: unknown): SpecialtyStatus {
  if (!value || typeof value !== "object")
    throw new Error("Invalid specialty status");
  const v = value as Record<string, unknown>;
  if (
    typeof v.unlocked !== "boolean" ||
    !(v.specialty === null || isSpecialty(v.specialty)) ||
    !Number.isInteger(v.completed) ||
    !Number.isInteger(v.required) ||
    Number(v.required) <= 0 ||
    Number(v.completed) < 0 ||
    Number(v.completed) > Number(v.required) ||
    (v.unlocked && v.completed !== v.required)
  )
    throw new Error("Invalid specialty status");
  return {
    unlocked: v.unlocked,
    specialty: v.specialty as Specialty | null,
    completed: Number(v.completed),
    required: Number(v.required),
  };
}
