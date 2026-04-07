/**
 * Centralized module-access logic for set-gated and specialization-locked content.
 *
 * Rules:
 * 1. Set 1 (Foundation) modules are always accessible.
 * 2. Set 2 (Exploration) modules are locked until all Set 1 activities are complete.
 *    Once unlocked, all 5 Set 2 modules are accessible at the same time.
 * 3. Specialization modules (Quantum Explorers / stem-1-intro) are hidden until
 *    the student has chosen a specialization.
 * 4. Specialization choice is gated behind completing STEM Set 3
 *    (enforced in Avatar.tsx + backend POST /avatar/select-archetype).
 */
import { STEM_SET_2_MODULE_SLUGS, isSet2Locked } from "@/constants/stemSets";

// ── Specialization-gated module slugs ────────────────────────────────────
// Add future specialization-only modules here.
const SPECIALIZATION_MODULE_SLUGS = new Set([
  "stem-1-intro", // "Quantum Explorers" — hidden until archetype chosen
]);

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Robustly extract the student's archetype/specialization from avatar data.
 * The API may return nested `{ avatar: { archetype } }` or flat `{ archetype }`.
 */
export function getStudentArchetype(avatarData: unknown): string | null {
  if (!avatarData || typeof avatarData !== "object") return null;
  const obj = avatarData as Record<string, unknown>;

  // nested: avatar.avatar.archetype
  if (obj.avatar && typeof obj.avatar === "object") {
    const inner = obj.avatar as Record<string, unknown>;
    if (typeof inner.archetype === "string") return inner.archetype;
    if (typeof inner.specialization === "string") return inner.specialization;
  }

  // flat: avatar.archetype / avatar.specialization
  if (typeof obj.archetype === "string") return obj.archetype;
  if (typeof obj.specialization === "string") return obj.specialization;

  return null;
}

/** True when `slug` is a specialization-gated module (e.g. Quantum Explorers). */
export function isSpecializationModuleSlug(slug: string): boolean {
  return SPECIALIZATION_MODULE_SLUGS.has(slug);
}

/** True when `slug` is a Set 2 module. */
export function isSet2ModuleSlug(slug: string): boolean {
  return (STEM_SET_2_MODULE_SLUGS as readonly string[]).includes(slug);
}

/**
 * Whether Set 2 is currently locked for the student.
 * Pass the list of completed activity IDs from their progress.
 */
export function checkSet2Locked(completedActivityIds: string[]): boolean {
  return isSet2Locked(completedActivityIds);
}

/**
 * Whether the student can access a given module.
 *
 * - Foundation/public modules → always true.
 * - Specialization modules → true only if the student has any archetype.
 */
export function canAccessModule({
  slug,
  archetype,
}: {
  slug: string;
  archetype: string | null;
}): boolean {
  if (!isSpecializationModuleSlug(slug)) return true;
  // Specialization modules require *any* archetype to be chosen
  return !!archetype;
}
