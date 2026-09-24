/**
 * Grade-band integrity guard for Move & Measure.
 *
 * Contract:
 * - K-2 keeps the original score-based gameplay and does not use prediction.
 * - G3-5 adds prediction and measurement comparison.
 * - All activities must have measurement functions available.
 * - G3-5's exit ticket compares the first attempt's measurement with the
 *   retry's; K-2's shows no measurements.
 */

import { createElement, type ComponentProps } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BAND_CONFIG } from "../gradeBandContent";
import MoveMeasureGame, {
  dashMeasurement,
  jumpMeasurement,
  tossMeasurement,
  tossScore,
} from "../MoveMeasureGame";
import type GameShell from "../shared/GameShell";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});
// Keep the real playfield, phase transitions and scorer; isolate shell routing.
vi.mock("../shared/GameShell", () => ({
  default: ({ children, onComplete }: ComponentProps<typeof GameShell>) =>
    children({ onFinish: onComplete, reducedEffects: false }),
}));

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

const FIRST_TOSS = 20;
const RETRY_TOSS = 50;
const metres = (value: number) => `${value.toFixed(1)} m`;

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}
function click(name: string | RegExp, init?: MouseEventInit) {
  fireEvent.click(screen.getByRole("button", { name }), init);
}
function setToss(value: number) {
  fireEvent.change(screen.getByRole("slider"), {
    target: { value: String(value) },
  });
}

/**
 * Plays dash, jump and toss once (toss at FIRST_TOSS), then retries the toss
 * at RETRY_TOSS and stops on the exit ticket. No animation frame ever runs,
 * so dash stops at 0 and jump releases at 0: every value is a constant.
 */
function playToExitTicket(band: (typeof BANDS)[number]) {
  const onComplete = vi.fn();
  render(
    createElement(MoveMeasureGame, { config: { gradeBand: band }, onComplete }),
  );
  const predicts = BAND_CONFIG[band].enablePredict;
  const finishEvent = (measured: number) => {
    advance(1200);
    if (!predicts) return;
    // The prediction is left at its seeded 0, so the difference is the measurement.
    click(metres(measured));
    click("Continue");
  };

  click("Let's Go!");
  if (predicts) click("Start!");
  click("TAP!");
  finishEvent(dashMeasurement(0));

  if (predicts) click("Start!");
  click("HOLD ME!", { detail: 0 });
  click("RELEASE!", { detail: 0 });
  finishEvent(jumpMeasurement(0));

  if (predicts) click("Start!");
  setToss(FIRST_TOSS);
  click("THROW!");
  finishEvent(tossMeasurement(FIRST_TOSS));

  click(/Toss/);
  advance(1200);
  click(/Aim carefully/);
  advance(800);
  setToss(RETRY_TOSS);
  click("THROW!");
  advance(1200);
  return onComplete;
}

describe("Move & Measure exit ticket before/after (#835)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("g3_5 shows the first attempt's metres as Before and the retry's as After", () => {
    const onComplete = playToExitTicket("g3_5");

    const before = screen.getByText("Before").parentElement as HTMLElement;
    const after = screen.getByText("After").parentElement as HTMLElement;
    expect(
      within(before).getByText(String(tossScore(FIRST_TOSS))),
    ).toBeInTheDocument();
    expect(
      within(before).getByText(metres(tossMeasurement(FIRST_TOSS))),
    ).toBeInTheDocument();
    expect(
      within(before).queryByText(metres(tossMeasurement(RETRY_TOSS))),
    ).toBeNull();
    expect(
      within(after).getByText(String(tossScore(RETRY_TOSS))),
    ).toBeInTheDocument();
    expect(
      within(after).getByText(metres(tossMeasurement(RETRY_TOSS))),
    ).toBeInTheDocument();
    expect(screen.getByText("→")).toBeInTheDocument();

    click("I measured and compared");
    advance(1500);
    // The celebration pairs each event's first-run score with that run's metres.
    const tossCard = screen.getByText("🥎").parentElement as HTMLElement;
    expect(
      within(tossCard).getByText(String(tossScore(FIRST_TOSS))),
    ).toBeInTheDocument();
    expect(
      within(tossCard).getByText(metres(tossMeasurement(FIRST_TOSS))),
    ).toBeInTheDocument();

    advance(2500);
    expect(onComplete).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        score: 18,
        gameSpecific: {
          dash: 4,
          jump: 0,
          toss: 4,
          impEvent: "toss",
          impScore: 10,
          exitCorrect: true,
        },
      }),
    );
  });

  it("k2 shows no metre readings on the exit ticket", () => {
    playToExitTicket("k2");

    expect(screen.getByText("Before")).toBeInTheDocument();
    expect(screen.queryByText(/\d m$/)).toBeNull();
  });
});
