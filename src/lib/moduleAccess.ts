/**
 * Centralized module-access logic for specialization-locked content.
 *
 * Rules:
 * 1. Public/foundation modules (Quantum Quest, Lost Steps, etc.) are always accessible.
 * 2. Specialization modules (Quantum Explorers / stem-1-intro) are hidden until
 *    the student has chosen a specialization.
 * 3. Specialization choice is gated behind completing STEM Set 3
 *    (enforced in Avatar.tsx + backend POST /avatar/select-archetype).
 */

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
