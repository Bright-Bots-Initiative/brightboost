import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Race, {
  raceExitKey,
  buildQualifyTuneRaceCompletionPayload,
  metricCredit,
} from "../QualifyTuneRaceGame";
import {
  BUMP_ZONE,
  createRaceEngine,
  FIXED_STEP_SECONDS,
  maxCleanSmoothness,
  minCleanLaneChanges,
  OBSTACLES,
  raceCones,
  SCROLL_UNITS_PER_SECOND,
  START_LANE,
  TRACK_LENGTH,
  upgradeTuning,
  type RaceBand,
  type Upgrade,
} from "../qualifyTuneRaceEngine";
vi.mock("react-i18next", async () =>
  (await import("@/test/i18nMock")).enMock(),
);
vi.mock("../shared/GameShell", () => ({
  default: ({ briefing }: { briefing: { story: string } }) => (
    <p>{briefing.story}</p>
  ),
}));

// Independent search: one input per tenth of a second, at most one lane at a
// time. Reject a lane if a cone spans any part of that interval, then drive
// the witness through the actual fixed-step engine.
function cleanLap(band: RaceBand, upgrade: Upgrade | null) {
  const cones = raceCones(band),
    tune = upgradeTuning(upgrade);
  let paths = new Map<number, number[]>([[START_LANE, []]]);
  const distance =
    SCROLL_UNITS_PER_SECOND * tune.speedMultiplier * 12 * FIXED_STEP_SECONDS;
  for (let y = 0; y < TRACK_LENGTH; y += distance) {
    const next = new Map<number, number[]>();
    for (const [lane, path] of paths)
      for (const target of [lane, lane - 1, lane + 1]) {
        if (target < 0 || target > 2 || next.has(target)) continue;
        if (
          cones.some(
            (c) =>
              c.lane === target &&
              c.y + BUMP_ZONE >= y &&
              c.y - BUMP_ZONE <= y + distance,
          )
        )
          continue;
        next.set(target, [...path, target]);
      }
    paths = next;
  }
  const path = paths.values().next().value;
  if (!path) throw Error("No drivable route");
  const engine = createRaceEngine(upgrade, band);
  for (const target of path) {
    if (engine.lane !== target) engine.steer(target > engine.lane ? 1 : -1);
    for (let frame = 0; frame < 12; frame++) engine.advance(FIXED_STEP_SECONDS);
  }
  expect(engine.finished).toBe(true);
  expect(engine.result().bumps).toBe(0);
}
describe("age-banded race lab", () => {
  it("preserves the original track and gives grades 3–5 a denser, solvable course", () => {
    expect(raceCones("k2")).toBe(OBSTACLES);
    expect(OBSTACLES).toHaveLength(10);
    expect(raceCones("g3_5").length).toBeGreaterThan(OBSTACLES.length);
    expect(minCleanLaneChanges(raceCones("g3_5"), START_LANE)).toBeGreaterThan(
      minCleanLaneChanges(OBSTACLES, START_LANE),
    );
    for (const band of ["k2", "g3_5"] as const)
      for (const upgrade of [null, "speed", "grip", "steering"] as const)
        cleanLap(band, upgrade);
  });
  it("selects the evidence challenge only for the upper band", () => {
    const v = render(<Race config={{ gradeBand: "g3_5" }} />);
    expect(screen.getByText(/denser slalom/i)).toBeVisible();
    v.rerender(<Race config={{ gradeBand: "k2" }} />);
    expect(screen.getByText(/First we test/i)).toBeVisible();
  });
  it("scores actual bump evidence and the selected course’s attainable ceiling", () => {
    const first = {
      bumps: 0,
      smoothness: maxCleanSmoothness(null, "g3_5"),
      time: 21.3,
    };
    expect(metricCredit(first, first, "g3_5").smoothness).toBe("held");
    expect(raceExitKey("g3_5", { ...first, bumps: 2 }, first)).toBe("fewer");
    expect(raceExitKey("g3_5", first, { ...first, bumps: 2 })).toBe("more");
    expect(
      buildQualifyTuneRaceCompletionPayload({
        band: "g3_5",
        run1: first,
        run2: first,
        upgrade: "grip",
        exitAnswer: "same",
      }).score,
    ).toBe(10);
    expect(
      buildQualifyTuneRaceCompletionPayload({
        band: "g3_5",
        run1: first,
        run2: first,
        upgrade: "grip",
        exitAnswer: "one",
      }).score,
    ).toBe(8);
  });
});
