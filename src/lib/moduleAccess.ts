/**
 * Centralized module-access logic for specialization-locked content.
 *
 * Currently only the Quantum Quest module is gated behind specialization.
 * Change `QUANTUM_MODULE_SLUG` or `canAccessModule` to adjust the rule.
 */

export const QUANTUM_MODULE_SLUG = "k2-stem-quantum-quest";

/** Archetypes that unlock the quantum module. */
const QUANTUM_ARCHETYPES = new Set(["QUANTUM"]);

/**
 * Robustly extract the student's archetype/specialization from avatar data.
 * The API may return nested `{ avatar: { archetype } }` or flat `{ archetype }`.
 */
export function getStudentArchetype(
  avatarData: unknown,
): string | null {
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

/** True when `slug` identifies the quantum module. */
export function isQuantumModuleSlug(slug: string): boolean {
  return slug === QUANTUM_MODULE_SLUG;
}

/**
 * Whether the student can access a given module.
 * Non-quantum modules are always accessible.
 * The quantum module requires a QUANTUM archetype.
 */
export function canAccessModule({
  slug,
  archetype,
}: {
  slug: string;
  archetype: string | null;
}): boolean {
  if (!isQuantumModuleSlug(slug)) return true;
  if (!archetype) return false;
  return QUANTUM_ARCHETYPES.has(archetype.toUpperCase());
}
