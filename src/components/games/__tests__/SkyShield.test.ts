import { createElement, type ComponentProps } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SkyShieldGame, {
  buildSkyShieldCompletionPayload,
  mkChallenge,
  mkPattern,
  PT,
} from "../SkyShieldGame";
import { SKY_SHIELD_CONTENT } from "../gradeBandContent";
import type GameShell from "../shared/GameShell";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});
// Keep the real playfield, phase transitions and scorer; isolate shell routing,
// so the playfield's completion payload reaches onComplete unchanged.
vi.mock("../shared/GameShell", () => ({
  default: ({ children, onComplete }: ComponentProps<typeof GameShell>) =>
    children({ onFinish: onComplete, reducedEffects: false }),
}));

const TEST_BANDS = [
  ["k2", SKY_SHIELD_CONTENT.k2],
  ["g3_5", SKY_SHIELD_CONTENT.g3_5],
] as const;

/** GameShell's default star thresholds (see shared/GameShell.tsx). */
const STAR_THRESHOLDS = [30, 60, 90] as const;
const starsFor = (pct: number) =>
  pct >= STAR_THRESHOLDS[2]
    ? 3
    : pct >= STAR_THRESHOLDS[1]
      ? 2
      : pct >= STAR_THRESHOLDS[0]
        ? 1
        : 0;

/** Perfect-play score + exit ticket, per band — the numbers reported in #735. */
const PERFECT_TOTALS = { k2: 285, g3_5: 370 } as const;

const repeat = (times: number, points: number) =>
  Array.from({ length: times }, () => points);

/**
 * The point events a flawless run puts on the board, in play order. Mirrors the
 * phase schedule in SkyShieldGame: practice -> pattern -> scan -> challenge.
 * A flawless run hits every phase the minimum number of times, so this is also
 * the shortest possible run.
 */
function perfectRunPoints(band: keyof typeof SKY_SHIELD_CONTENT): number[] {
  const content = SKY_SHIELD_CONTENT[band];
  const normalDrops = content.challengeRounds - content.mysteryDrops;
  // K-2 reveals a fixed three-drop scan set; g3-5 scans one drop per pattern step.
  const scanDrops = band === "g3_5" ? content.patternLength / 2 : 3;

  return [
    ...repeat(content.practiceRounds, PT.catch),
    ...repeat(content.patternRounds, PT.predict),
    ...repeat(scanDrops, PT.scan),
    ...(band === "g3_5"
      ? // g3-5 challenge: predict then catch on each mystery drop, catch on the rest.
        [
          ...repeat(content.mysteryDrops, PT.predict),
          ...repeat(content.mysteryDrops, PT.catch),
          ...repeat(normalDrops, PT.catch),
        ]
      : // K-2 challenge: one scored action per drop, scan-valued on mystery drops.
        [
          ...repeat(content.mysteryDrops, PT.scan),
          ...repeat(normalDrops, PT.catch),
        ]),
  ];
}

describe("Sky Shield helpers", () => {
  it.each(TEST_BANDS)(
    "creates valid repeating base pattern for %s",
    (_band, content) => {
      const pattern = mkPattern(content);

      expect(pattern.base).toHaveLength(content.patternLength / 2);
      expect(pattern.sequence).toHaveLength(content.patternLength);

      expect(pattern.sequence).toEqual([...pattern.base, ...pattern.base]);
    },
  );

  it.each(TEST_BANDS)(
    "creates challenge with mystery constraints",
    (_band, content) => {
      const pattern = mkPattern(content);
      const challenge = mkChallenge(content, pattern);
      const mysteries = challenge
        .map((drop, idx) => ({ drop, idx }))
        .filter(({ drop }) => drop.kind === "mystery");

      expect(challenge).toHaveLength(content.challengeRounds);
      expect(mysteries).toHaveLength(content.mysteryDrops);
      expect(mysteries.every(({ idx }) => idx >= 2)).toBe(true);
      expect(
        mysteries.every(({ drop }) => drop.hiddenColor === drop.lane),
      ).toBe(true);
      expect(challenge.every((drop) => drop.lane >= 0 && drop.lane <= 2)).toBe(
        true,
      );
    },
  );

  it("builds a completion payload whose total is the points actually offered", () => {
    expect(
      buildSkyShieldCompletionPayload({
        score: 85,
        exitAns: 1,
        exitAnswer: 1,
        // A full K-2 run offers 265 points across its 21 scored rounds; rounds
        // are worth 10 / 15 / 20 depending on the action, not a flat 20 each.
        maxScore: 265,
        totalRounds: 21,
        maxStreak: 4,
        streak: 3,
      }),
    ).toMatchObject({
      gameKey: "sky_shield",
      score: 105,
      total: 285,
      streakMax: 4,
      roundsCompleted: 22,
    });
  });

  it.each(TEST_BANDS)(
    "scores an all-correct %s run at 100%% (3 stars)",
    (band, content) => {
      const points = perfectRunPoints(band);
      const earned = points.reduce((sum, p) => sum + p, 0);

      const payload = buildSkyShieldCompletionPayload({
        score: earned,
        exitAns: content.exitAnswer,
        exitAnswer: content.exitAnswer,
        // bump() adds every scored round to the maximum, right or wrong; a
        // flawless run therefore banks every point it was offered.
        maxScore: earned,
        totalRounds: points.length,
        maxStreak: points.length,
        streak: points.length,
      });

      expect(payload.total).toBe(PERFECT_TOTALS[band]);
      expect(payload.score).toBe(payload.total);

      const pct = (payload.score / payload.total) * 100;
      expect(pct).toBe(100);
      expect(starsFor(pct)).toBe(3);
    },
  );
});

// ── g3-5 challenge catch re-entrancy (#800) ─────────────────────────────────
//
// These drive the real g3-5 playfield. Everything the driver needs is read off
// the screen, because each lane is drawn with its own emoji; Math.random is not
// stubbed (mkChallenge needs varying values to place its mystery drops).
//
// Reverting the #800 fix in SkyShieldGame's g3-5 `doCatch` (the `g35Ready`
// entry guard and latch, and `disabled={!g35Ready}` on its two Catch buttons)
// makes both tests below fail.

const G35 = SKY_SHIELD_CONTENT.g3_5;
/** SkyShieldGame's LABELS: lane `i` is drawn as `LANE_EMOJI[i]`. */
const LANE_EMOJI = ["🔵", "🟡", "🩷"];
/** SkyShieldGame's delay from feedback to the next round, outside g3-5's challenge. */
const ROUND_ADVANCE_MS = 900;
/** SkyShieldGame's delay from a g3-5 challenge catch to the next round. */
const G35_ADVANCE_MS = 1200;
/** The pattern phase shows a lane at 400 ms, then every 700 ms, and asks 500 ms later. */
const PATTERN_REVEAL_MS = 400 + 700 * (G35.patternLength - 1) + 500;
/** Gap between the two taps of a double tap; well inside G35_ADVANCE_MS. */
const TAP_GAP_MS = 300;
const PREDICT_PROMPT = "Which lane will the light fall into?";

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}
const button = (name: string | RegExp) => screen.getByRole("button", { name });
const click = (name: string | RegExp) => fireEvent.click(button(name));

/** Lanes of the lane emoji drawn outside a button, in document order. */
function shownLanes(): number[] {
  return screen
    .queryAllByText(
      (content, el) => LANE_EMOJI.includes(content) && !el?.closest("button"),
    )
    .map((el) => LANE_EMOJI.indexOf(el.textContent ?? ""));
}

/** The HUD's score and streak (the streak is only drawn from 2 up). */
function hud() {
  const score = screen.getByText(/^Score: \d+$/).textContent ?? "";
  const streak = screen.queryByText(/^🔥 \d+x$/)?.textContent ?? "0";
  return {
    score: Number(score.match(/\d+/)?.[0]),
    streak: Number(streak.match(/\d+/)?.[0]),
  };
}

function renderG35() {
  const onComplete = vi.fn();
  render(
    createElement(SkyShieldGame, { config: { gradeBand: "g3_5" }, onComplete }),
  );
  click("Let's Go!");
  return onComplete;
}

/** Plays practice, pattern and scan without a mistake, then opens the challenge. */
function playFlawlesslyToChallenge() {
  for (let i = 0; i < G35.practiceRounds; i++) {
    click(LANE_EMOJI[shownLanes()[0]]); // shield under the falling light
    click("Catch!");
    advance(ROUND_ADVANCE_MS);
  }
  for (let i = 0; i < G35.patternRounds; i++) {
    advance(PATTERN_REVEAL_MS);
    // The sequence is its base pattern twice, so the next lane is its first.
    click(LANE_EMOJI[shownLanes()[0]]);
    advance(ROUND_ADVANCE_MS);
  }
  for (let i = 0; i < G35.patternLength / 2; i++) {
    click(/Scan/);
    click(LANE_EMOJI[shownLanes()[0]]); // the revealed colour
    advance(ROUND_ADVANCE_MS);
  }
  click("Start Challenge");
}

describe("Sky Shield g3-5 challenge catch is not re-entrant (#800)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("scores a double-tapped catch once and disables Catch until the next round", () => {
    renderG35();
    playFlawlesslyToChallenge();

    // Round 1 is never a mystery drop: mkChallenge places those at index >= 2.
    expect(
      screen.getByText(`Challenge (1/${G35.challengeRounds})`),
    ).toBeInTheDocument();
    expect(screen.queryByText(PREDICT_PROMPT)).not.toBeInTheDocument();
    // 3 catches, 3 predictions and 4 scans, all correct.
    const before = hud();
    expect(before).toEqual({ score: 150, streak: 10 });

    click(LANE_EMOJI[shownLanes()[0]]);
    click("Catch!");
    expect(button("Catch!")).toBeDisabled();
    advance(TAP_GAP_MS);
    click("Catch!");

    expect(hud()).toEqual({
      score: before.score + PT.catch,
      streak: before.streak + 1,
    });
    expect(button("Catch!")).toBeDisabled();

    advance(G35_ADVANCE_MS - TAP_GAP_MS);
    expect(
      screen.getByText(`Challenge (2/${G35.challengeRounds})`),
    ).toBeInTheDocument();
    expect(button("Catch!")).toBeEnabled();
  });

  it("reports a clean run's total and round count when every challenge catch is double-tapped", () => {
    const onComplete = renderG35();
    playFlawlesslyToChallenge();

    for (let round = 1; round <= G35.challengeRounds; round++) {
      expect(
        screen.getByText(`Challenge (${round}/${G35.challengeRounds})`),
      ).toBeInTheDocument();
      if (screen.queryByText(PREDICT_PROMPT)) {
        click(LANE_EMOJI[0]); // any prediction; only the denominator is pinned
        // A second tap last round would have scheduled a second round advance
        // that fires now and clears this round's prediction.
        advance(TAP_GAP_MS);
        expect(button(/Scan/)).toBeEnabled();
        click(/Scan/);
      }
      click("Catch!");
      advance(TAP_GAP_MS);
      click("Catch!");
      advance(G35_ADVANCE_MS - TAP_GAP_MS);
    }

    click(LANE_EMOJI[G35.exitAnswer]);
    click("See Results");
    click("Finish");

    // Same as the flawless run modelled above: total 370, 25 scored rounds + exit ticket.
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({
      total: PERFECT_TOTALS.g3_5,
      roundsCompleted: perfectRunPoints("g3_5").length + 1,
    });
  });
});
