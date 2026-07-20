import { describe, expect, it } from "vitest";
import {
  BAND_CONFIG,
  ECHO_AVENUE_TOTAL,
  ECHO_TOKENS_FIRST,
  ECHO_TOKENS_SECOND,
  EMPTY_LAYERS,
  FRESH_ECHO_PROGRESS,
  K2_START_SOUNDS,
  SOUND_IDS,
  SOUND_SET,
  advanceEchoProgress,
  buildDuetContent,
  buildEchoAvenueResult,
  cycleSec,
  detectCallAndResponse,
  detectRests,
  eventTime,
  isNameTaken,
  newlyUnlockedSounds,
  partnerUnlocked,
  pickEchoWonder,
  pulsesToSchedule,
  quantizeToSubdivision,
  recordEvent,
  replaceLayer,
  spotsUnlocked,
  subdivisions,
  summarizeTake,
  tokenName,
  unlockedSounds,
  type DuetLayers,
} from "../echoAvenue/echoAvenueModel";

const K2 = BAND_CONFIG.k2;
const G35 = BAND_CONFIG.g35;

// ── Cycle + quantization (the K-2 scaffold) ─────────────────────────────────

describe("quantizeToSubdivision", () => {
  it("snaps to the nearest half-pulse", () => {
    // K-2: pulse 0.6s, snap 0.3s, 8 slots (0..7)
    expect(quantizeToSubdivision(0, K2)).toBe(0);
    expect(quantizeToSubdivision(0.31, K2)).toBe(1);
    expect(quantizeToSubdivision(0.44, K2)).toBe(1); // closer to 0.3 than 0.6
    expect(quantizeToSubdivision(0.46, K2)).toBe(2); // closer to 0.6
    expect(quantizeToSubdivision(1.2, K2)).toBe(4);
  });

  it("WRAPS at the cycle boundary: a tap just before the loop point lands on slot 0", () => {
    // cycle = 2.4s; a tap at 2.31s is nearest to 2.4 → slot 8 → wraps to 0
    expect(quantizeToSubdivision(2.31, K2)).toBe(0);
    // and a tap just after 0 stays at 0
    expect(quantizeToSubdivision(0.05, K2)).toBe(0);
    // exact midpoint at the top of the cycle rounds up → wrap
    expect(quantizeToSubdivision(2.25, K2)).toBe(0);
  });

  it("band grids differ: K-2 has 8 slots, 3-5 has 16", () => {
    expect(subdivisions(K2)).toBe(8);
    expect(subdivisions(G35)).toBe(16);
    expect(cycleSec(K2)).toBeCloseTo(2.4);
    expect(cycleSec(G35)).toBeCloseTo(4.8);
  });
});

// ── Scheduler math (mocked clock) ───────────────────────────────────────────

describe("lookahead scheduler math", () => {
  it("returns exactly the pulses inside the horizon", () => {
    // loopStart=10, pulse 0.6, now=10.5, horizon 0.12 → pulses with time < 10.62
    expect(pulsesToSchedule(0, 10, 10.5, 0.12, 0.6)).toEqual([0, 1]); // 10.0, 10.6
    // resume from pulse 2: next times 11.2, 11.8 — none inside 10.62
    expect(pulsesToSchedule(2, 10, 10.5, 0.12, 0.6)).toEqual([]);
    // wide horizon picks up several
    expect(pulsesToSchedule(2, 10, 11.5, 0.9, 0.6)).toEqual([2, 3]);
  });

  it("event replay times are exact grid math per cycle pass (drift-impossible)", () => {
    // slot 3 of K-2 = 0.9s into each 2.4s cycle
    expect(eventTime(100, 0, 3, K2)).toBeCloseTo(100.9);
    expect(eventTime(100, 1, 3, K2)).toBeCloseTo(103.3);
    expect(eventTime(100, 25, 3, K2)).toBeCloseTo(100 + 25 * 2.4 + 0.9); // 60s+ out, still exact
  });
});

// ── Layers ──────────────────────────────────────────────────────────────────

describe("layer independence", () => {
  const layers: DuetLayers = {
    lead: [
      { t: 0, soundId: "step" },
      { t: 4, soundId: "chime" },
    ],
    partner: [{ t: 2, soundId: "clap" }],
  };

  it("re-recording one layer never touches the other (the overdub invariant)", () => {
    const next = replaceLayer(layers, "partner", [{ t: 6, soundId: "whoosh" }]);
    expect(next.lead).toBe(layers.lead); // same reference — untouched
    expect(next.partner).toEqual([{ t: 6, soundId: "whoosh" }]);
  });

  it("recordEvent appends to the right performer only", () => {
    const next = recordEvent(layers, "lead", { t: 6, soundId: "tap" });
    expect(next.lead).toHaveLength(3);
    expect(next.partner).toBe(layers.partner);
  });
});

// ── Unlock ladder — fast pacing; making, never accuracy ─────────────────────

describe("unlock ladder", () => {
  const take = (lead: number, partner: number): DuetLayers => ({
    lead: Array.from({ length: lead }, (_, i) => ({ t: i, soundId: "step" as const })),
    partner: Array.from({ length: partner }, (_, i) => ({ t: i + 4, soundId: "chime" as const })),
  });

  it("K-2 starts with two sounds, Lead only; 3-5 starts with everything", () => {
    expect(unlockedSounds("k2", FRESH_ECHO_PROGRESS)).toEqual(K2_START_SOUNDS);
    expect(partnerUnlocked("k2", FRESH_ECHO_PROGRESS)).toBe(false);
    expect(unlockedSounds("g35", FRESH_ECHO_PROGRESS)).toHaveLength(8);
    expect(partnerUnlocked("g35", FRESH_ECHO_PROGRESS)).toBe(true);
  });

  it("FAST PACING: first phrase → Partner + 2 sounds; first layered phrase → spot + 2 more (~6 sounds in a first session)", () => {
    const p1 = advanceEchoProgress(FRESH_ECHO_PROGRESS, summarizeTake(take(2, 0)));
    expect(partnerUnlocked("k2", p1)).toBe(true);
    expect(unlockedSounds("k2", p1)).toHaveLength(4);
    expect(spotsUnlocked("k2", p1)).toBe(false);

    const p2 = advanceEchoProgress(p1, summarizeTake(take(2, 2)));
    expect(unlockedSounds("k2", p2)).toHaveLength(6); // ~6 sounds, session one
    expect(spotsUnlocked("k2", p2)).toBe(true);
  });

  it("unlocks respond to MAKING only — ignoring every prompt still unlocks everything by making", () => {
    // No prompt/suggestion state exists anywhere in Progress: the ladder is a
    // pure function of phrases and layers made. Make things → unlocked.
    let p = FRESH_ECHO_PROGRESS;
    p = advanceEchoProgress(p, summarizeTake(take(1, 0)));
    p = advanceEchoProgress(p, summarizeTake(take(1, 1)));
    expect(unlockedSounds("k2", p)).toHaveLength(6);
    expect(Object.keys(p)).not.toContain("promptsFollowed"); // accuracy/obedience is not tracked
  });

  it("an empty take advances nothing (and costs nothing)", () => {
    const p = advanceEchoProgress(FRESH_ECHO_PROGRESS, summarizeTake(EMPTY_LAYERS));
    expect(p).toEqual(FRESH_ECHO_PROGRESS);
  });

  it("newlyUnlockedSounds reports each unlock exactly once (the announce beat)", () => {
    const p1 = advanceEchoProgress(FRESH_ECHO_PROGRESS, summarizeTake(take(1, 0)));
    expect(newlyUnlockedSounds("k2", FRESH_ECHO_PROGRESS, p1)).toEqual(["chime", "whoosh"]);
    expect(newlyUnlockedSounds("k2", p1, p1)).toEqual([]);
  });
});

// ── Reflect ─────────────────────────────────────────────────────────────────

describe("wondering question", () => {
  const callResponse: DuetLayers = {
    lead: [{ t: 0, soundId: "step" }],
    partner: [{ t: 4, soundId: "chime" }],
  };

  it("detects call-and-response (partner plays in the lead's gaps)", () => {
    expect(detectCallAndResponse(callResponse)).toBe(true);
    expect(
      detectCallAndResponse({
        lead: [{ t: 0, soundId: "step" }],
        partner: [{ t: 0, soundId: "clap" }], // stacked, not answering
      }),
    ).toBe(false);
    expect(detectCallAndResponse({ lead: [{ t: 0, soundId: "step" }], partner: [] })).toBe(false);
  });

  it("detects rests and prioritizes: new sound > call-and-response > rests > evergreen", () => {
    expect(detectRests(callResponse, K2)).toBe(true);
    expect(
      pickEchoWonder({ callAndResponse: true, restsUsed: true, newSoundUsed: "whoosh" }).key,
    ).toBe("echoAvenue.wonder.newSound.whoosh");
    expect(pickEchoWonder({ callAndResponse: true, restsUsed: true }).key).toBe(
      "echoAvenue.wonder.callResponse",
    );
    expect(pickEchoWonder({ callAndResponse: false, restsUsed: true }).key).toBe(
      "echoAvenue.wonder.rests",
    );
    expect(pickEchoWonder({ callAndResponse: false, restsUsed: false }, () => 0.9).key).toBe(
      "echoAvenue.wonder.next",
    );
  });
});

// ── Naming tokens (kid-safety: approved pools only) ─────────────────────────

describe("name tokens", () => {
  it("every token carries real EN + ES and a zh-CN label (localized pools, per ruling)", () => {
    for (const token of [...ECHO_TOKENS_FIRST, ...ECHO_TOKENS_SECOND]) {
      expect(token.label.en?.length).toBeGreaterThan(0);
      expect(token.label.es?.length).toBeGreaterThan(0);
      expect(token.label["zh-CN"]?.length).toBeGreaterThan(0);
    }
  });

  it("token names join and cap at 24 chars; duplicates are detected (hint, never error)", () => {
    expect(tokenName("Midnight", "Parade")).toBe("Midnight Parade");
    expect(isNameTaken("midnight parade", ["Midnight Parade"])).toBe(true);
    expect(isNameTaken("Sunny Echo", ["Midnight Parade", null])).toBe(false);
  });
});

// ── Silent-mode registry + completion payload ───────────────────────────────

describe("sound registry (silent-mode duty)", () => {
  it("every sound has a distinct motion signature, a light color, and a trail", () => {
    const motions = new Set(SOUND_SET.map((s) => s.motion));
    expect(motions.size).toBe(SOUND_IDS.length); // distinct per sound
    for (const spec of SOUND_SET) {
      expect(spec.lightColor).toMatch(/^#/);
      expect(spec.trail.length).toBeGreaterThan(0);
    }
  });
});

describe("completion payload (mirrors Track Builder; zero verdicts)", () => {
  it("is flat participation shape with integer score/total", () => {
    const r = buildEchoAvenueResult({
      phraseRecorded: true,
      overdubbed: true,
      layerReplaced: true,
      shared: true,
      takesRecorded: 5,
      familiesExplored: 3,
    });
    expect(r.gameKey).toBe("echo_avenue");
    expect(r.score).toBe(6);
    expect(r.total).toBe(ECHO_AVENUE_TOTAL);
    expect(r.streakMax).toBe(0); // no streak concept — flat by design
    expect(r.roundsCompleted).toBe(5);
  });

  it("carries no accuracy, verdict, or timing fields anywhere", () => {
    const r = buildEchoAvenueResult({
      phraseRecorded: true,
      overdubbed: false,
      layerReplaced: false,
      shared: false,
      takesRecorded: 1,
      familiesExplored: 1,
    });
    const flat = JSON.stringify(r).toLowerCase();
    for (const banned of ["accuracy", "verdict", "correct", "miss", "combo", "grade"]) {
      expect(flat).not.toContain(banned);
    }
  });
});

// ── Persisted content builder ───────────────────────────────────────────────

describe("buildDuetContent", () => {
  it("derives pulses from the band (the validator cross-checks this)", () => {
    const c = buildDuetContent("Sunny Echo", "k2", EMPTY_LAYERS, ["tunnel"]);
    expect(c.pulses).toBe(4);
    expect(c.coverPose).toBe("sideBySide"); // default pose until the child picks
    expect(buildDuetContent("X", "g35", EMPTY_LAYERS, []).pulses).toBe(8);
  });
});
