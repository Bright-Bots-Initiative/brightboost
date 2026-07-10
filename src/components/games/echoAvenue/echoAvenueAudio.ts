/**
 * Echo Avenue — WebAudio synthesis layer. ALL sounds are synthesized from
 * oscillator/noise primitives: zero audio asset files, zero licensing
 * surface. Voices are loudness-normalized by per-voice peak gains.
 *
 * Latency discipline (proven by /dev/echo-spike, kept as the regression
 * harness): AudioContext created with latencyHint:'interactive';
 * `prewarm()` MUST be called on the Start screen's first user interaction so
 * the ~1s engine wake is never paid by the child's first musical tap
 * (design doc ruling 10 — tested in the studio).
 *
 * This module is deliberately thin and untested in jsdom (no AudioContext
 * there); everything decision-shaped lives in echoAvenueModel.ts.
 */
import type { SoundId } from "./echoAvenueModel";

export interface EchoAudio {
  ctx: AudioContext;
  master: GainNode;
  layerGain: Record<"lead" | "partner", GainNode>;
  /** resolves once the context is running — call on the FIRST user gesture */
  prewarm: () => Promise<void>;
  play: (soundId: SoundId, performer: "lead" | "partner", when?: number) => void;
  tick: (when: number, downbeat: boolean) => void;
  setMasterVolume: (v: number) => void;
  setLayerVolume: (performer: "lead" | "partner", v: number) => void;
  now: () => number;
}

let singleton: EchoAudio | null = null;

export function getEchoAudio(): EchoAudio {
  if (singleton) return singleton;

  const ctx = new AudioContext({ latencyHint: "interactive" });
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  const lead = ctx.createGain();
  const partner = ctx.createGain();
  lead.connect(master);
  partner.connect(master);

  // One second of noise, rendered once (claps, whooshes, breezes).
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const out = (performer: "lead" | "partner") => (performer === "lead" ? lead : partner);

  function osc(
    dest: GainNode,
    when: number,
    type: OscillatorType,
    f0: number,
    f1: number | null,
    peak: number,
    dur: number,
  ) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, when);
    if (f1 !== null) o.frequency.exponentialRampToValueAtTime(f1, when + dur * 0.9);
    g.gain.setValueAtTime(peak, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g);
    g.connect(dest);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  function noiseHit(
    dest: GainNode,
    when: number,
    freq0: number,
    freq1: number | null,
    q: number,
    peak: number,
    dur: number,
  ) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(freq0, when);
    if (freq1 !== null) bp.frequency.exponentialRampToValueAtTime(freq1, when + dur * 0.9);
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(dest);
    src.start(when, Math.random() * 0.5, dur + 0.05);
  }

  const play: EchoAudio["play"] = (soundId, performer, when = ctx.currentTime) => {
    const dest = out(performer);
    switch (soundId) {
      case "step":
        osc(dest, when, "sine", 130, 48, 0.9, 0.18);
        break;
      case "stomp":
        osc(dest, when, "sine", 90, 36, 1.0, 0.3);
        break;
      case "clap":
        for (let i = 0; i < 3; i++)
          noiseHit(dest, when + i * 0.012, 2000, null, 1.2, i === 2 ? 0.55 : 0.3, i === 2 ? 0.12 : 0.03);
        break;
      case "tap":
        noiseHit(dest, when, 3200, null, 3, 0.5, 0.05);
        break;
      case "chime":
        osc(dest, when, "triangle", 880, null, 0.5, 0.4);
        osc(dest, when, "triangle", 1318.5, null, 0.25, 0.35);
        break;
      case "twinkle":
        osc(dest, when, "triangle", 1568, null, 0.35, 0.25);
        osc(dest, when + 0.07, "triangle", 2093, null, 0.3, 0.3);
        break;
      case "whoosh":
        noiseHit(dest, when, 400, 2400, 2.5, 0.6, 0.3);
        break;
      case "breeze":
        noiseHit(dest, when, 1200, 500, 1.4, 0.4, 0.45);
        break;
    }
  };

  const tick: EchoAudio["tick"] = (when, downbeat) => {
    osc(master, when, "sine", downbeat ? 1200 : 900, null, downbeat ? 0.14 : 0.08, 0.05);
  };

  singleton = {
    ctx,
    master,
    layerGain: { lead, partner },
    prewarm: async () => {
      if (ctx.state !== "running") await ctx.resume();
    },
    play,
    tick,
    setMasterVolume: (v) => {
      master.gain.value = Math.max(0, Math.min(1, v));
    },
    setLayerVolume: (performer, v) => {
      out(performer).gain.value = Math.max(0, Math.min(1, v));
    },
    now: () => ctx.currentTime,
  };
  return singleton;
}
