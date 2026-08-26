import { describe, expect, it } from "vitest";
import {
  arrow,
  buildQualifyTuneRaceCompletionPayload,
  calculateQualifyTuneRaceScore,
  laneX,
  smoothLabel,
  timeLabel,
} from "../QualifyTuneRaceGame";

describe("Qualify, Tune, Race helpers", () => {
  it("scores compare results", () => {
    const result = calculateQualifyTuneRaceScore(
      { time: 20, bumps: 4, smoothness: 55 },
      { time: 18, bumps: 2, smoothness: 70 },
      "one",
    );
    expect(result).toEqual({ score: 10, total: 10 });
  });

  it("exports deterministic label helpers", () => {
    expect(laneX(0)).toBeLessThan(laneX(2));
    expect(timeLabel(14)).toBe("Fast");
    expect(smoothLabel(80)).toBe("Smooth");
    expect(arrow(10, 8)).toBe("⬇️");
  });

  it("builds completion payload", () => {
    const payload = buildQualifyTuneRaceCompletionPayload({
      run1: { time: 20, bumps: 4, smoothness: 55 },
      run2: { time: 19, bumps: 3, smoothness: 65 },
      exitAnswer: "one",
      upgrade: "grip",
    });

    expect(payload).toMatchObject({
      gameKey: "qualify_tune_race",
      total: 10,
      roundsCompleted: 2,
      gameSpecific: { upgrade: "grip", exitCorrect: true },
    });
  });
});

// Mirrors GameShell's accuracy + default star thresholds
// (`starThresholds = [30, 60, 90]` in shared/GameShell.tsx); the game does not
// override them, so score/total is what the child actually sees as % and stars.
const STAR_THRESHOLDS = [30, 60, 90];
function accuracyFor(score: number, total: number): number {
  return Math.round(Math.min(100, (score / total) * 100));
}
function starsFor(score: number, total: number): number {
  const pct = Math.min(100, (score / total) * 100);
  return pct >= STAR_THRESHOLDS[2]
    ? 3
    : pct >= STAR_THRESHOLDS[1]
      ? 2
      : pct >= STAR_THRESHOLDS[0]
        ? 1
        : 0;
}

// A run at the ceiling of all three compared metrics: Fast band time
// (`timeLabel` < 15s), no bumps, maximum smoothness.
const PERFECT_RUN = { time: 14, bumps: 0, smoothness: 100 };

describe("Qualify, Tune, Race — improvement bonus at the ceiling (#737)", () => {
  it("awards full credit when both runs are already perfect", () => {
    const { score, total } = calculateQualifyTuneRaceScore(
      PERFECT_RUN,
      { ...PERFECT_RUN },
      "one",
    );

    expect({ score, total }).toEqual({ score: 10, total: 10 });
    expect(accuracyFor(score, total)).toBe(100);
    expect(starsFor(score, total)).toBe(3);
  });

  it("awards the bumps point when a clean run stays clean", () => {
    // 3 base + 2 bumps held at zero + 2 exit ticket
    expect(
      calculateQualifyTuneRaceScore(
        { time: 20, bumps: 0, smoothness: 70 },
        { time: 20, bumps: 0, smoothness: 70 },
        "one",
      ).score,
    ).toBe(7);
  });

  it("awards the smoothness point when maximum smoothness is held", () => {
    // 3 base + 1 smoothness held at 100 + 2 exit ticket
    expect(
      calculateQualifyTuneRaceScore(
        { time: 20, bumps: 3, smoothness: 100 },
        { time: 20, bumps: 3, smoothness: 100 },
        "one",
      ).score,
    ).toBe(6);
  });

  it("awards the time point when a Fast run stays inside the Fast band", () => {
    // 3 base + 2 time held in the Fast band + 2 exit ticket
    expect(
      calculateQualifyTuneRaceScore(
        { time: 12, bumps: 2, smoothness: 60 },
        { time: 13, bumps: 2, smoothness: 60 },
        "one",
      ).score,
    ).toBe(7);
  });

  it("does not award bonuses for repeating a non-ceiling result", () => {
    // 3 base + 2 exit ticket only — nothing improved and nothing was maxed out
    expect(
      calculateQualifyTuneRaceScore(
        { time: 20, bumps: 3, smoothness: 60 },
        { time: 20, bumps: 3, smoothness: 60 },
        "one",
      ).score,
    ).toBe(5);
  });

  it("does not award bonuses when a ceiling result gets worse", () => {
    // Bumps appear, the Fast band is lost, smoothness drops: 3 base + 2 exit
    expect(
      calculateQualifyTuneRaceScore(
        PERFECT_RUN,
        { time: 16, bumps: 2, smoothness: 80 },
        null,
      ).score,
    ).toBe(3);
    expect(
      calculateQualifyTuneRaceScore(
        PERFECT_RUN,
        { time: 16, bumps: 2, smoothness: 80 },
        "one",
      ).score,
    ).toBe(5);
  });

  it("still rewards a genuine improvement from a sloppy first run", () => {
    expect(
      calculateQualifyTuneRaceScore(
        { time: 20, bumps: 4, smoothness: 55 },
        { time: 18, bumps: 2, smoothness: 70 },
        "one",
      ).score,
    ).toBe(10);
  });

  it("never scores a perfect pair below a sloppy run that improved", () => {
    const perfect = calculateQualifyTuneRaceScore(
      PERFECT_RUN,
      { ...PERFECT_RUN },
      "one",
    );
    const improved = calculateQualifyTuneRaceScore(
      { time: 20, bumps: 4, smoothness: 55 },
      { time: 18, bumps: 2, smoothness: 70 },
      "one",
    );

    expect(perfect.score).toBeGreaterThanOrEqual(improved.score);
  });
});
