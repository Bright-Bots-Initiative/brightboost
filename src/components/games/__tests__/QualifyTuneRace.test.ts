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
