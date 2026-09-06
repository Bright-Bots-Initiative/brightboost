import { describe, it, expect } from "vitest";
import { parseSpecialtyStatus, BIOTRAIL_SLUG } from "../specialty";
import { canAccessModule, resolveModuleAccess } from "../moduleAccess";
describe("Advanced specialty policy", () => {
  it("requires the matching track even for teacher-assigned advanced content", () => {
    expect(canAccessModule({ slug: BIOTRAIL_SLUG, archetype: "BIOTECH" })).toBe(
      true,
    );
    for (const archetype of [null, "AI", "QUANTUM", "unknown"]) {
      expect(
        resolveModuleAccess({
          slug: BIOTRAIL_SLUG,
          module: { slug: BIOTRAIL_SLUG, level: "K-2", published: true },
          hiddenSlugs: new Set(),
          completedActivityIds: [],
          archetype,
          gradeBand: "k2",
          assignedModuleSlugs: [BIOTRAIL_SLUG],
        }),
      ).toEqual({ allowed: false, reason: "not_specialized" });
    }
  });
  it("rejects incomplete or malformed server state instead of granting access", () => {
    const valid = {
      unlocked: true,
      completed: 5,
      required: 5,
      specialty: "BIOTECH",
    };
    expect(parseSpecialtyStatus(valid)).toEqual(valid);
    for (const invalid of [
      { ...valid, completed: 4 },
      { ...valid, specialty: "ADMIN" },
      { ...valid, required: 0 },
      { ...valid, completed: 5.5 },
      null,
    ])
      expect(() => parseSpecialtyStatus(invalid)).toThrow();
  });
});
