import { describe, it, expect } from "vitest";
import { slugSchema, levelSchema } from "../src/validation/schemas";

describe("Input Validation Schemas", () => {
  describe("slugSchema", () => {
    it("should accept valid slugs", () => {
      expect(slugSchema.safeParse("stem-1-intro").success).toBe(true);
      expect(slugSchema.safeParse("k2-stem-sequencing").success).toBe(true);
      expect(slugSchema.safeParse("abc-123").success).toBe(true);
      expect(slugSchema.safeParse("a").success).toBe(true);
    });

    it("should reject uppercase letters", () => {
      expect(slugSchema.safeParse("Stem-1").success).toBe(false);
    });

    it("should reject special characters", () => {
      expect(slugSchema.safeParse("stem!").success).toBe(false);
      expect(slugSchema.safeParse("stem_1").success).toBe(false); // only hyphens allowed
    });

    it("should reject empty strings", () => {
      expect(slugSchema.safeParse("").success).toBe(false);
    });

    it("should reject too long strings", () => {
      const longSlug = "a".repeat(101);
      expect(slugSchema.safeParse(longSlug).success).toBe(false);
    });
  });

  describe("levelSchema", () => {
    it("should accept valid levels", () => {
      expect(levelSchema.safeParse("K-2").success).toBe(true);
      expect(levelSchema.safeParse("3-5").success).toBe(true);
      expect(levelSchema.safeParse("Explorer").success).toBe(true);
    });

    it("should reject special characters", () => {
      expect(levelSchema.safeParse("K@2").success).toBe(false);
    });

    it("should reject too long strings", () => {
      const longLevel = "a".repeat(21);
      expect(levelSchema.safeParse(longLevel).success).toBe(false);
    });
  });
});
