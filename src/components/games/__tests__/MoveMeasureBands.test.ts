/**
 * Grade-band integrity guard for Move & Measure.
 *
 * Contract:
 * - K-2 keeps the original score-based gameplay and does not use prediction.
 * - G3-5 adds prediction and measurement comparison.
 * - All activities must have measurement functions available.
 */

import { describe, expect, it } from "vitest";
import { BAND_CONFIG } from "../gradeBandContent";
import { 
  dashMeasurement,
  jumpMeasurement,
  tossMeasurement,
} from "../MoveMeasureGame";

const BANDS = ["k2", "g3_5"] as const;

describe("Move & Measure grade-band configuration", () => {
  it.each(BANDS)("%s has valid band configuration", (band) => {
    const config = BAND_CONFIG[band];

    expect(config.decimalPlaces).toBeGreaterThanOrEqual(0);

    if (band === "k2") {
      expect(config.enablePredict).toBe(false);
      expect(config.showDecimals).toBe(false);
      expect(config.compareMeasurements).toBe(false);
    }

    if (band === "g3_5") {
      expect(config.enablePredict).toBe(true);
      expect(config.showDecimals).toBe(true);
      expect(config.compareMeasurements).toBe(true);
      expect(config.decimalPlaces).toBe(1);
    }
  });


  it("measurement functions return positive decimal values", () => {
    expect(dashMeasurement(0)).toBeGreaterThan(0);
    expect(dashMeasurement(1)).toBeGreaterThan(dashMeasurement(0));

    expect(jumpMeasurement(0)).toBeGreaterThan(0);
    expect(jumpMeasurement(1)).toBeGreaterThan(jumpMeasurement(0));

    expect(tossMeasurement(0)).toBe(0);
    expect(tossMeasurement(50)).toBeGreaterThan(tossMeasurement(0));
  });


  it("g3_5 measurement values are valid", () => {
    const dash = dashMeasurement(0.5);
    const jump = jumpMeasurement(0.5);
    const toss = tossMeasurement(50);

    for (const measurement of [dash, jump, toss]) {
      expect(Number.isFinite(measurement)).toBe(true);
      expect(measurement).toBeGreaterThanOrEqual(0);
    }
  });
});