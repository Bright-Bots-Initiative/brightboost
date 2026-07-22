import { describe, expect, it } from "vitest";
import { SKY_SHIELD_CONTENT } from "../gradeBandContent";

describe("Sky Shield grade-band content", () => {
  for (const [band, content] of Object.entries(SKY_SHIELD_CONTENT)) {
    describe(band, () => {
      it("has valid patterns", () => {
        expect(content.patterns.length).toBeGreaterThan(0);

        const baseLength = content.patterns[0].length;

        expect(content.patternLength).toBe(baseLength * 2);

        for (const pattern of content.patterns) {
          expect(pattern).toHaveLength(baseLength);

          for (const lane of pattern) {
            expect(lane).toBeGreaterThanOrEqual(0);
            expect(lane).toBeLessThan(3);
          }
        }
      });

      it("has a valid exit ticket", () => {
        expect(content.exitPattern.length).toBeGreaterThan(0);

        for (const lane of content.exitPattern) {
          expect(lane).toBeGreaterThanOrEqual(0);
          expect(lane).toBeLessThan(3);
        }

        expect(content.exitAnswer).toBeGreaterThanOrEqual(0);
        expect(content.exitAnswer).toBeLessThan(3);
      });

      it("has valid mystery settings", () => {
        expect(content.mysteryColors).toBeGreaterThanOrEqual(2);
        expect(content.mysteryColors).toBeLessThanOrEqual(3);

        expect(content.mysteryDrops).toBeGreaterThanOrEqual(0);
        expect(content.mysteryDrops).toBeLessThan(content.challengeRounds);
      });

      it("has valid round counts", () => {
        expect(content.practiceRounds).toBeGreaterThan(0);
        expect(content.patternRounds).toBeGreaterThan(0);
        expect(content.challengeRounds).toBeGreaterThan(0);
      });
    });
  }
});