import { describe, expect, it } from "vitest";
import {
  MAX_DUET_PAYLOAD_CHARS,
  deriveSoundDuetTitle,
  exceedsDuetPayloadCap,
  validateSoundDuet,
} from "./soundDuet";

const valid = () => ({
  v: 1,
  name: "Midnight Parade",
  band: "k2",
  pulses: 4,
  layers: {
    lead: [
      { t: 0, soundId: "step" },
      { t: 4, soundId: "chime" },
    ],
    partner: [{ t: 2, soundId: "clap" }],
  },
  spots: ["tunnel"],
  coverPose: "sideBySide",
});

describe("validateSoundDuet — schema", () => {
  it("accepts a minimal valid duet", () => {
    expect(validateSoundDuet(valid())).toEqual({ ok: true });
  });

  it("rejects non-objects and bad versions", () => {
    expect(validateSoundDuet("nope").ok).toBe(false);
    expect(validateSoundDuet(null).ok).toBe(false);
    expect(validateSoundDuet({ ...valid(), v: 2 }).ok).toBe(false);
  });

  it("rejects missing/empty/oversized names", () => {
    expect(validateSoundDuet({ ...valid(), name: "" }).ok).toBe(false);
    expect(validateSoundDuet({ ...valid(), name: "x".repeat(25) }).ok).toBe(false);
  });

  // ── The #668 divergence, tested explicitly at EVERY level ──

  it("STRICT: rejects unknown keys at the root", () => {
    const r = validateSoundDuet({ ...valid(), smuggled: "extra" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("smuggled");
  });

  it("STRICT: rejects unknown keys inside layers", () => {
    const c = valid();
    (c.layers as Record<string, unknown>).chorus = [];
    expect(validateSoundDuet(c).ok).toBe(false);
  });

  it("STRICT: rejects unknown keys inside an event", () => {
    const c = valid();
    c.layers.lead[0] = { ...c.layers.lead[0], velocity: 127 } as never;
    expect(validateSoundDuet(c).ok).toBe(false);
  });

  it("rejects sound ids outside the allowlist", () => {
    const c = valid();
    c.layers.lead[0] = { t: 0, soundId: "airhorn" as never };
    expect(validateSoundDuet(c).ok).toBe(false);
  });
});

describe("validateSoundDuet — validity guard", () => {
  it("rejects a duet with zero recorded events", () => {
    const r = validateSoundDuet({ ...valid(), layers: { lead: [], partner: [] } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("at least one");
  });

  it("rejects events outside the band's cycle grid (k2 slots are 0..7)", () => {
    const c = valid();
    c.layers.partner = [{ t: 9, soundId: "clap" }]; // legal for g35, not k2
    const r = validateSoundDuet(c);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("outside the cycle grid");
    // the same slot IS valid on the g35 grid
    const g35 = { ...valid(), band: "g35", pulses: 8 };
    g35.layers.partner = [{ t: 9, soundId: "clap" }];
    expect(validateSoundDuet(g35)).toEqual({ ok: true });
  });

  it("rejects a band/pulses mismatch", () => {
    expect(validateSoundDuet({ ...valid(), pulses: 8 }).ok).toBe(false);
  });

  it("rejects layers over the event cap (64)", () => {
    const c = valid();
    c.layers.lead = Array.from({ length: 65 }, () => ({ t: 0, soundId: "step" as const }));
    expect(validateSoundDuet(c).ok).toBe(false);
  });

  it("rejects an unknown cover pose", () => {
    expect(validateSoundDuet({ ...valid(), coverPose: "tPose" }).ok).toBe(false);
    expect(validateSoundDuet({ ...valid(), coverPose: undefined }).ok).toBe(false);
  });

  it("rejects spot lists over the two-spot cap and unknown spots", () => {
    expect(
      validateSoundDuet({ ...valid(), spots: ["tunnel", "puddle", "tunnel"] }).ok,
    ).toBe(false);
    expect(validateSoundDuet({ ...valid(), spots: ["disco"] }).ok).toBe(false);
  });
});

describe("payload-size cap (defense-in-depth)", () => {
  it("a worst-case VALID duet stays under the cap", () => {
    const maxed = {
      ...valid(),
      band: "g35",
      pulses: 8,
      name: "x".repeat(24),
      layers: {
        lead: Array.from({ length: 64 }, (_, i) => ({ t: i % 16, soundId: "twinkle" as const })),
        partner: Array.from({ length: 64 }, (_, i) => ({ t: i % 16, soundId: "twinkle" as const })),
      },
      spots: ["tunnel", "puddle"],
      coverPose: "backToBack",
    };
    expect(JSON.stringify(maxed).length).toBeLessThan(MAX_DUET_PAYLOAD_CHARS);
    expect(validateSoundDuet(maxed)).toEqual({ ok: true });
  });

  it("rejects oversized and unserializable payloads before parsing", () => {
    expect(exceedsDuetPayloadCap({ blob: "y".repeat(MAX_DUET_PAYLOAD_CHARS + 1) })).toBe(true);
    const oversized = validateSoundDuet({ blob: "y".repeat(MAX_DUET_PAYLOAD_CHARS + 1) });
    expect(oversized.ok).toBe(false);
    if (!oversized.ok) expect(oversized.error).toContain("too large");
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(exceedsDuetPayloadCap(cyclic)).toBe(true);
  });
});

describe("deriveSoundDuetTitle", () => {
  it("returns the token-built name, trimmed; null when absent", () => {
    expect(deriveSoundDuetTitle({ name: " Sunny Echo " })).toBe("Sunny Echo");
    expect(deriveSoundDuetTitle({})).toBeNull();
    expect(deriveSoundDuetTitle(null)).toBeNull();
  });
});
