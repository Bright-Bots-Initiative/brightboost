/**
 * /dev/echo-spike — Echo Avenue LATENCY SPIKE (dev-only harness, NOT the game).
 *
 * The whole Echo Avenue concept lives or dies on tap→sound→motion latency.
 * This page proves (or kills) the live-instrument feel before any game code
 * is written:
 *   1. Four pads: pointerdown → synthesized sound scheduled immediately
 *      (AudioContext latencyHint:'interactive', pre-resumed, pre-built
 *      buffers) → simultaneous motion flash.
 *   2. Honest instrumentation on screen: baseLatency / outputLatency where
 *      the browser exposes them, per-tap pointerdown→scheduled-start delta.
 *      NOTE: touch-digitizer→event input latency is NOT measurable from JS
 *      (typically ~15–30 ms) — the human feel test is the real gate.
 *   3. The loop-engine primitive: a repeating 4-pulse cycle with lookahead
 *      scheduling (25 ms pump, ~120 ms horizon against ctx.currentTime);
 *      recorded taps replay on-grid. Underruns + pump health are counted to
 *      prove drift-free replay over 60+ seconds.
 *
 * Dev-only: registered behind import.meta.env.DEV — never in a prod build.
 * Strings are intentionally unlocalized (developer harness, not kid UI).
 */
import { useCallback, useEffect, useRef, useState } from "react";

// ── Synth voices (all synthesized — zero audio assets) ──────────────────────

type VoiceId = "chime" | "thump" | "clap" | "whoosh";

const VOICES: { id: VoiceId; label: string; emoji: string; color: string }[] = [
  { id: "chime", label: "Chime", emoji: "🔔", color: "#0ea5e9" },
  { id: "thump", label: "Step", emoji: "🦶", color: "#8b5cf6" },
  { id: "clap", label: "Clap", emoji: "👏", color: "#f59e0b" },
  { id: "whoosh", label: "Whoosh", emoji: "💨", color: "#10b981" },
];

let sharedCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let masterGain: GainNode | null = null;

function getCtx(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new AudioContext({ latencyHint: "interactive" });
    masterGain = sharedCtx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(sharedCtx.destination);
    // Pre-render one second of noise ONCE (clap + whoosh source material).
    noiseBuffer = sharedCtx.createBuffer(1, sharedCtx.sampleRate, sharedCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return sharedCtx;
}

/** Schedule one voice at `when` (AudioContext time). Loudness-normalized
 *  by ear via per-voice peak gains. */
function playVoice(id: VoiceId, when: number) {
  const ctx = getCtx();
  const out = masterGain!;
  if (id === "chime") {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 880;
    osc2.type = "triangle";
    osc2.frequency.value = 1318.5; // a fifth above — small sparkle
    g.gain.setValueAtTime(0.5, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.4);
    osc.connect(g);
    osc2.connect(g);
    g.connect(out);
    osc.start(when);
    osc2.start(when);
    osc.stop(when + 0.45);
    osc2.stop(when + 0.45);
  } else if (id === "thump") {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(130, when);
    osc.frequency.exponentialRampToValueAtTime(48, when + 0.16);
    g.gain.setValueAtTime(0.9, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
    osc.connect(g);
    g.connect(out);
    osc.start(when);
    osc.stop(when + 0.2);
  } else if (id === "clap") {
    // click-burst: three micro noise hits
    for (let i = 0; i < 3; i++) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2000;
      bp.Q.value = 1.2;
      const g = ctx.createGain();
      const t = when + i * 0.012;
      g.gain.setValueAtTime(i === 2 ? 0.55 : 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (i === 2 ? 0.12 : 0.03));
      src.connect(bp);
      bp.connect(g);
      g.connect(out);
      src.start(t, Math.random() * 0.5, 0.15);
    }
  } else {
    // whoosh: filtered noise with a rising sweep
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(400, when);
    bp.frequency.exponentialRampToValueAtTime(2400, when + 0.28);
    bp.Q.value = 2.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.6, when + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(when, Math.random() * 0.4, 0.35);
  }
}

// ── Loop primitive constants ────────────────────────────────────────────────

const PULSES = 4;
const PULSE_SEC = 0.6; // 100 BPM — a comfortable K-2 walking pulse
const CYCLE_SEC = PULSES * PULSE_SEC;
const SNAP_SEC = PULSE_SEC / 2; // half-pulse quantization grid (the K-2 scaffold)
const PUMP_MS = 25;
const HORIZON_SEC = 0.12;

interface LoopEvent {
  offset: number; // seconds into the cycle, quantized
  voice: VoiceId;
}

export default function EchoSpike() {
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<{
    base: number | null;
    output: number | null;
    deltas: number[];
    firstTapMs: number | null;
  }>({ base: null, output: null, deltas: [], firstTapMs: null });
  const [flash, setFlash] = useState<VoiceId | null>(null);

  // loop state
  const [looping, setLooping] = useState(false);
  const [recording, setRecording] = useState(false);
  const [events, setEvents] = useState<LoopEvent[]>([]);
  const [cycles, setCycles] = useState(0);
  const [underruns, setUnderruns] = useState(0);
  const [worstPumpGap, setWorstPumpGap] = useState(0);
  const [beat, setBeat] = useState(-1);

  const loopStartRef = useRef(0);
  const nextPulseRef = useRef(0); // absolute pulse index scheduled next
  const scheduledCycleEventsRef = useRef(0); // cycle index whose events are scheduled
  const eventsRef = useRef<LoopEvent[]>([]);
  eventsRef.current = events;
  const recordingRef = useRef(false);
  recordingRef.current = recording;
  const loopingRef = useRef(false);
  const pumpRef = useRef<number | null>(null);
  const lastPumpAtRef = useRef(0);

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ensureAudio = useCallback(async (): Promise<AudioContext> => {
    const ctx = getCtx();
    if (ctx.state !== "running") await ctx.resume();
    if (!ready) {
      setReady(true);
      const withOutput = ctx as AudioContext & { outputLatency?: number };
      setStats((s) => ({
        ...s,
        base: ctx.baseLatency ?? null,
        output: typeof withOutput.outputLatency === "number" ? withOutput.outputLatency : null,
      }));
    }
    return ctx;
  }, [ready]);

  // ── Pad tap: the latency-critical path ──
  const onPad = useCallback(
    async (voice: VoiceId) => {
      const tDown = performance.now();
      const ctx = await ensureAudio();
      playVoice(voice, ctx.currentTime); // schedule ASAP — "now"
      const jsDelta = performance.now() - tDown;
      setStats((s) =>
        s.firstTapMs === null
          ? { ...s, firstTapMs: jsDelta } // first tap pays the resume cost — shown separately
          : { ...s, deltas: [...s.deltas.slice(-19), jsDelta] },
      );
      // simultaneous motion cue
      setFlash(voice);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlash(null), 160);
      // record into the loop, snapped to the half-pulse grid
      if (recordingRef.current && loopingRef.current) {
        const raw = (ctx.currentTime - loopStartRef.current) % CYCLE_SEC;
        const snapped = (Math.round(raw / SNAP_SEC) * SNAP_SEC) % CYCLE_SEC;
        setEvents((prev) => [...prev, { offset: snapped, voice }]);
      }
    },
    [ensureAudio],
  );

  // keyboard operability (laptop test): 1-4 trigger pads
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const idx = ["1", "2", "3", "4"].indexOf(e.key);
      if (idx >= 0) void onPad(VOICES[idx].id);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [onPad]);

  // ── The lookahead pump (the standard WebAudio scheduler pattern) ──
  const startLoop = useCallback(async () => {
    const ctx = await ensureAudio();
    loopingRef.current = true;
    setLooping(true);
    setCycles(0);
    setUnderruns(0);
    setWorstPumpGap(0);
    loopStartRef.current = ctx.currentTime + 0.1;
    nextPulseRef.current = 0;
    scheduledCycleEventsRef.current = -1;
    lastPumpAtRef.current = performance.now();

    const pump = () => {
      if (!loopingRef.current) return;
      const nowMs = performance.now();
      const gap = nowMs - lastPumpAtRef.current;
      lastPumpAtRef.current = nowMs;
      if (gap > worstGapLocal) {
        worstGapLocal = gap;
        setWorstPumpGap(Math.round(gap));
      }
      const now = ctx.currentTime;
      // schedule pulses (metronome ticks) into the horizon
      while (loopStartRef.current + nextPulseRef.current * PULSE_SEC < now + HORIZON_SEC) {
        const pulseIdx = nextPulseRef.current;
        const when = loopStartRef.current + pulseIdx * PULSE_SEC;
        if (when < now) setUnderruns((u) => u + 1); // fell behind — count honestly
        tick(ctx, when, pulseIdx % PULSES === 0);
        nextPulseRef.current += 1;
        if (pulseIdx % PULSES === 0) {
          const cycleIdx = pulseIdx / PULSES;
          setCycles(cycleIdx);
          // schedule this cycle's recorded events, on-grid
          if (scheduledCycleEventsRef.current < cycleIdx) {
            scheduledCycleEventsRef.current = cycleIdx;
            const cycleStart = loopStartRef.current + cycleIdx * PULSES * PULSE_SEC;
            for (const ev of eventsRef.current) playVoice(ev.voice, cycleStart + ev.offset);
          }
        }
      }
    };
    let worstGapLocal = 0;
    pump();
    pumpRef.current = window.setInterval(pump, PUMP_MS);
  }, [ensureAudio]);

  const stopLoop = useCallback(() => {
    loopingRef.current = false;
    setLooping(false);
    setRecording(false);
    setBeat(-1);
    if (pumpRef.current !== null) {
      clearInterval(pumpRef.current);
      pumpRef.current = null;
    }
  }, []);
  useEffect(() => stopLoop, [stopLoop]);

  // visual beat indicator (rAF against the audio clock — display only)
  useEffect(() => {
    if (!looping) return;
    let raf = 0;
    const ctx = getCtx();
    const frame = () => {
      const t = ctx.currentTime - loopStartRef.current;
      if (t >= 0) setBeat(Math.floor(t / PULSE_SEC) % PULSES);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [looping]);

  const avg =
    stats.deltas.length > 0
      ? stats.deltas.reduce((a, b) => a + b, 0) / stats.deltas.length
      : null;
  const max = stats.deltas.length > 0 ? Math.max(...stats.deltas) : null;
  const outputMs =
    stats.output !== null ? stats.output * 1000 : stats.base !== null ? stats.base * 1000 : null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 flex flex-col items-center gap-4 touch-manipulation select-none">
      <h1 className="text-xl font-bold">Echo Avenue — latency spike (dev harness)</h1>

      {/* Pads */}
      <div className="grid grid-cols-2 gap-4">
        {VOICES.map((v) => (
          <button
            key={v.id}
            type="button"
            onPointerDown={() => void onPad(v.id)}
            className="rounded-3xl font-extrabold text-2xl text-white shadow-lg active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-4 focus-visible:outline-white"
            style={{
              width: 140,
              height: 140,
              background: v.color,
              transform: flash === v.id ? "scale(1.12)" : undefined,
              boxShadow: flash === v.id ? `0 0 40px ${v.color}` : undefined,
              transition: "transform 60ms linear, box-shadow 60ms linear",
            }}
          >
            <span className="text-4xl block" aria-hidden>
              {v.emoji}
            </span>
            {v.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400">keys 1–4 work too · first tap wakes the audio engine</p>

      {/* Latency readout */}
      <div className="bg-slate-800 rounded-2xl p-4 w-full max-w-md font-mono text-sm flex flex-col gap-1">
        <div>audio state: {ready ? "running" : "tap any pad to start"}</div>
        <div>baseLatency: {stats.base !== null ? `${(stats.base * 1000).toFixed(1)} ms` : "n/a"}</div>
        <div>
          outputLatency: {stats.output !== null ? `${(stats.output * 1000).toFixed(1)} ms` : "n/a (browser doesn't expose it)"}
        </div>
        <div>
          first tap (incl. engine wake): {stats.firstTapMs !== null ? `${stats.firstTapMs.toFixed(1)} ms` : "—"}
        </div>
        <div>
          tap→schedule delta (last {stats.deltas.length}): avg {avg !== null ? avg.toFixed(1) : "—"} ms · max {max !== null ? max.toFixed(1) : "—"} ms
        </div>
        <div className="text-emerald-300">
          est. audible latency ≈ tap-delta + output ≈ {avg !== null && outputMs !== null ? (avg + outputMs).toFixed(0) : "—"} ms
          <span className="text-slate-400"> (+ ~15–30 ms touch input, unmeasurable from JS)</span>
        </div>
      </div>

      {/* Loop primitive */}
      <div className="bg-slate-800 rounded-2xl p-4 w-full max-w-md flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {!looping ? (
            <button
              type="button"
              onClick={() => void startLoop()}
              className="min-h-11 px-5 rounded-full bg-emerald-600 font-bold touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              ▶ Start loop
            </button>
          ) : (
            <button
              type="button"
              onClick={stopLoop}
              className="min-h-11 px-5 rounded-full bg-rose-600 font-bold touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              ⏹ Stop
            </button>
          )}
          <button
            type="button"
            onClick={() => setRecording((r) => !r)}
            disabled={!looping}
            aria-pressed={recording}
            className={`min-h-11 px-5 rounded-full font-bold touch-manipulation disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
              recording ? "bg-red-500" : "bg-slate-600"
            }`}
          >
            {recording ? "● Recording taps" : "○ Record"}
          </button>
          <button
            type="button"
            onClick={() => setEvents([])}
            className="min-h-11 px-5 rounded-full bg-slate-600 font-bold touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            Clear ({events.length})
          </button>
        </div>
        {/* beat lights */}
        <div className="flex gap-2 justify-center" aria-hidden>
          {Array.from({ length: PULSES }, (_, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full transition-colors duration-75"
              style={{ background: beat === i ? "#facc15" : "#334155" }}
            />
          ))}
        </div>
        <div className="font-mono text-sm flex flex-col gap-1">
          <div>
            cycle: {cycles} ({(cycles * CYCLE_SEC).toFixed(0)}s) · 4 pulses @ 100 BPM · snap grid ½ pulse
          </div>
          <div>
            scheduler underruns: <span className={underruns > 0 ? "text-rose-400" : "text-emerald-300"}>{underruns}</span> · worst pump gap: {worstPumpGap} ms (pump {PUMP_MS} ms, horizon {HORIZON_SEC * 1000} ms)
          </div>
          <div className="text-slate-400">
            drift check: events are scheduled on the AudioContext clock, so replay is drift-free
            unless underruns rise — run 60s+ and watch that counter.
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 max-w-md text-center">
        Feel test: tap pads freely, then record a phrase and let it loop for a minute. Live = go.
        Rubbery = numbers below tell us which stage is eating the time.
      </p>
    </div>
  );
}

function tick(ctx: AudioContext, when: number, downbeat: boolean) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = downbeat ? 1200 : 900;
  g.gain.setValueAtTime(downbeat ? 0.18 : 0.1, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
  osc.connect(g);
  g.connect(masterGain!);
  osc.start(when);
  osc.stop(when + 0.06);
}
