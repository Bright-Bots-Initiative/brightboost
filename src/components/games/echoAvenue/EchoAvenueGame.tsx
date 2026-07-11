/**
 * Echo Avenue — live two-performer sound-and-motion studio (Set 3 · slot 3).
 * Design: docs/games/echo-avenue-design.md. Engine: ./echoAvenueModel.ts
 * (pure, tested). Audio: ./echoAvenueAudio.ts (synthesized, zero assets).
 *
 * Held-firm requirements this file implements:
 * - AudioContext pre-warms on the Start screen's FIRST interaction (gate in
 *   ./echoAvenueWarmup.ts, tested) — the child's first musical tap never
 *   pays the engine wake.
 * - Two ORIGINAL performers with clearly distinct silhouettes (round amber
 *   bobble-bot vs tall sky scarf-bot — different shape, height, and color).
 * - Reflect (one wondering question) and naming (token picker) are separate
 *   moments; a starter pulse means the canvas is never blank; mood previews
 *   + sensory controls surface BEFORE Start.
 * - ≥64px action pads, reduced-motion guard (echoAvenue.css), keyboard
 *   operability on the core loop (digits = pads, R = record, W = watch).
 * - ZERO verdict UI in the studio: no scores, accuracy, streaks, or "right
 *   rhythm" anywhere. (The platform-standard GameShell finish screen is the
 *   completion wiring mirror — nothing inside the studio judges.)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import GameShell, { type GameResult } from "../shared/GameShell";
import { pickLocale } from "@/utils/localizedContent";
import { useApi } from "@/services/api";
import "./echoAvenue.css";
import {
  BAND_CONFIG,
  COVER_POSES,
  COVER_POSE_ICONS,
  ECHO_TOKENS_FIRST,
  ECHO_TOKENS_SECOND,
  EMPTY_LAYERS,
  FRESH_ECHO_PROGRESS,
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
  soundSpec,
  spotsUnlocked,
  summarizeTake,
  tokenName,
  unlockedSounds,
  type CoverPose,
  type DuetLayers,
  type EchoBand,
  type EchoProgress,
  type Performer,
  type SoundId,
} from "./echoAvenueModel";
import { getEchoAudio, type EchoAudio } from "./echoAvenueAudio";
import { createWarmupGate, type WarmupGate } from "./echoAvenueWarmup";

const PUMP_MS = 25;
const HORIZON_SEC = 0.12;
const DRAFT_KEY = "bb_echo_avenue_draft_v1";

type Mood = "together" | "echo" | "space";

const MOOD_SEEDS: Record<Mood, DuetLayers> = {
  together: { lead: [{ t: 0, soundId: "step" }, { t: 4, soundId: "step" }], partner: [] },
  echo: { lead: [{ t: 0, soundId: "chime" }, { t: 4, soundId: "step" }], partner: [] },
  space: { lead: [{ t: 0, soundId: "chime" }], partner: [] },
};

interface EchoDraft {
  name: string;
  band: EchoBand;
  layers: DuetLayers;
  progress: EchoProgress;
  creationId: string | null;
}

function loadDraft(): EchoDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as EchoDraft;
    if (!d?.layers || !Array.isArray(d.layers.lead)) return null;
    return d;
  } catch {
    return null;
  }
}

// ── The two ORIGINAL performers (distinct silhouettes, not color-swaps) ─────

function LeadFigure({ motion }: { motion: string | null }) {
  // Round amber bobble-bot: short, circular body, antenna bobble, stub legs.
  return (
    <svg
      viewBox="0 0 80 100"
      className={`w-20 h-24 ${motion ? `ea-motion-${motion}` : ""}`}
      aria-hidden
    >
      <line x1="40" y1="18" x2="40" y2="6" stroke="#b45309" strokeWidth="4" />
      <circle cx="40" cy="6" r="5" fill="#fbbf24" />
      <circle cx="40" cy="52" r="30" fill="#f59e0b" />
      <circle cx="30" cy="46" r="5" fill="#78350f" />
      <circle cx="50" cy="46" r="5" fill="#78350f" />
      <path d="M 28 62 Q 40 70 52 62" stroke="#78350f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="26" y="80" width="9" height="16" rx="4" fill="#b45309" />
      <rect x="45" y="80" width="9" height="16" rx="4" fill="#b45309" />
    </svg>
  );
}

function PartnerFigure({ motion }: { motion: string | null }) {
  // Tall sky scarf-bot: angular trapezoid body, zigzag scarf, long legs.
  return (
    <svg
      viewBox="0 0 80 120"
      className={`w-20 h-28 ${motion ? `ea-motion-${motion}` : ""}`}
      aria-hidden
    >
      <polygon points="28,18 52,18 58,74 22,74" fill="#0ea5e9" />
      <rect x="30" y="4" width="20" height="16" rx="4" fill="#0284c7" />
      <circle cx="36" cy="12" r="3" fill="#e0f2fe" />
      <circle cx="46" cy="12" r="3" fill="#e0f2fe" />
      <polyline points="24,26 34,32 44,26 54,32" stroke="#facc15" strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="28" y="74" width="8" height="40" rx="4" fill="#0369a1" />
      <rect x="44" y="74" width="8" height="40" rx="4" fill="#0369a1" />
    </svg>
  );
}

// ── Core studio (named export so the pre-warm contract is mount-testable) ───

export interface EchoStudioCoreProps {
  onFinish: (result: GameResult) => void;
  reducedEffects: boolean;
  band: EchoBand;
  /** test seam — production uses the real singleton */
  audioFactory?: () => EchoAudio;
}

export function EchoStudioCore({
  onFinish,
  reducedEffects,
  band,
  audioFactory = getEchoAudio,
}: EchoStudioCoreProps) {
  const { t } = useTranslation();
  const api = useApi();
  const cfg = BAND_CONFIG[band];

  const draft = useMemo(loadDraft, []);
  const [screen, setScreen] = useState<"title" | "studio">("title");
  const [mood, setMood] = useState<Mood>("together");
  const [calmMode, setCalmMode] = useState(false);
  const [muted, setMuted] = useState(false);
  const [masterVol, setMasterVol] = useState(0.9);

  const [layers, setLayers] = useState<DuetLayers>(draft?.layers ?? EMPTY_LAYERS);
  const [progress, setProgress] = useState<EchoProgress>(
    draft?.progress ?? FRESH_ECHO_PROGRESS,
  );
  const [performer, setPerformer] = useState<Performer>("lead");
  const [recording, setRecording] = useState(false);
  const [watching, setWatching] = useState(false);
  const [name, setName] = useState(draft?.name ?? "");
  const [creationId, setCreationId] = useState<string | null>(draft?.creationId ?? null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [galleryTitles, setGalleryTitles] = useState<string[]>([]);
  const [saveNote, setSaveNote] = useState<"saved" | "local" | null>(null);
  const [shared, setShared] = useState(false);

  const [announceQueue, setAnnounceQueue] = useState<string[]>([]);
  const [wonder, setWonder] = useState<{ key: string; params?: Record<string, unknown> } | null>(null);
  const [showNaming, setShowNaming] = useState(false);
  const [tokenFirst, setTokenFirst] = useState(ECHO_TOKENS_FIRST[0]);
  const [tokenSecond, setTokenSecond] = useState(ECHO_TOKENS_SECOND[0]);
  const [coverPose, setCoverPose] = useState<CoverPose>("sideBySide");

  const [motionNow, setMotionNow] = useState<Record<Performer, string | null>>({
    lead: null,
    partner: null,
  });
  const [lightFlash, setLightFlash] = useState<{ color: string; key: number } | null>(null);
  const [trails, setTrails] = useState<{ id: number; performer: Performer; icon: string }[]>([]);
  const [beat, setBeat] = useState(-1);

  // session telemetry (iteration signals only)
  const takesRef = useRef(0);
  const layersReplacedRef = useRef(0);
  const newSoundCandidatesRef = useRef<Set<SoundId>>(new Set());
  const trailSeq = useRef(0);
  const motionTimers = useRef<Record<Performer, ReturnType<typeof setTimeout> | null>>({
    lead: null,
    partner: null,
  });

  const calm = calmMode || reducedEffects;

  // ── Audio + the pre-warm gate (ruling 10; tested) ──
  const audioRef = useRef<EchoAudio | null>(null);
  const gateRef = useRef<WarmupGate | null>(null);
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = audioFactory();
      gateRef.current = createWarmupGate(audioRef.current);
    }
    return audioRef.current;
  }, [audioFactory]);

  /** EVERY Start-screen interaction routes through here first. */
  const titleInteraction = useCallback(() => {
    getAudio();
    void gateRef.current!.warmOnFirstInteraction();
  }, [getAudio]);

  // ── Loop pump (spike-proven pattern; runs while in the studio) ──
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const loopStartRef = useRef(0);
  const nextPulseRef = useRef(0);
  const scheduledCycleRef = useRef(-1);
  const pumpIdRef = useRef<number | null>(null);
  const lastSlotRef = useRef(-1);

  const triggerMotion = useCallback(
    (who: Performer, soundId: SoundId) => {
      const spec = soundSpec(soundId);
      setMotionNow((m) => ({ ...m, [who]: null }));
      // restart the CSS animation on consecutive same-motion triggers
      requestAnimationFrame(() =>
        setMotionNow((m) => ({ ...m, [who]: spec.motion })),
      );
      if (motionTimers.current[who]) clearTimeout(motionTimers.current[who]!);
      motionTimers.current[who] = setTimeout(
        () => setMotionNow((m) => ({ ...m, [who]: null })),
        520,
      );
      if (!calm) {
        setLightFlash({ color: spec.lightColor, key: performance.now() });
        const id = trailSeq.current++;
        setTrails((prev) => [...prev.slice(-7), { id, performer: who, icon: spec.icon }]);
      }
    },
    [calm],
  );

  const stopPump = useCallback(() => {
    if (pumpIdRef.current !== null) {
      clearInterval(pumpIdRef.current);
      pumpIdRef.current = null;
    }
  }, []);

  const startPump = useCallback(() => {
    const audio = getAudio();
    stopPump();
    loopStartRef.current = audio.now() + 0.1;
    nextPulseRef.current = 0;
    scheduledCycleRef.current = -1;
    const pump = () => {
      const now = audio.now();
      const due = pulsesToSchedule(
        nextPulseRef.current,
        loopStartRef.current,
        now,
        HORIZON_SEC,
        cfg.pulseSec,
      );
      for (const p of due) {
        const when = loopStartRef.current + p * cfg.pulseSec;
        audio.tick(when, p % cfg.pulses === 0);
        if (p % cfg.pulses === 0) {
          const cycleIdx = p / cfg.pulses;
          if (scheduledCycleRef.current < cycleIdx) {
            scheduledCycleRef.current = cycleIdx;
            for (const who of ["lead", "partner"] as Performer[]) {
              for (const ev of layersRef.current[who]) {
                audio.play(ev.soundId, who, eventTime(loopStartRef.current, cycleIdx, ev.t, cfg));
              }
            }
          }
        }
      }
      nextPulseRef.current += due.length;
    };
    pump();
    pumpIdRef.current = window.setInterval(pump, PUMP_MS);
  }, [cfg, getAudio, stopPump]);

  useEffect(() => () => stopPump(), [stopPump]);

  // visual clock: beat lights + replay motions, driven off the audio clock
  useEffect(() => {
    if (screen !== "studio") return;
    let raf = 0;
    const frame = () => {
      const audio = audioRef.current;
      if (audio) {
        const tIn = (audio.now() - loopStartRef.current + cycleSec(cfg)) % cycleSec(cfg);
        const slot = quantizeToSubdivision(tIn, cfg);
        const pulse = Math.floor(tIn / cfg.pulseSec) % cfg.pulses;
        setBeat(pulse);
        if (slot !== lastSlotRef.current) {
          lastSlotRef.current = slot;
          for (const who of ["lead", "partner"] as Performer[]) {
            const hit = layersRef.current[who].find((ev) => ev.t === slot);
            if (hit) triggerMotion(who, hit.soundId);
          }
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [cfg, screen, triggerMotion]);

  // ── group context (save mirrors Track Builder; graceful until Phase 5) ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const courses = (await api.get("/student/courses")) as { courseId: string }[];
        if (!cancelled && Array.isArray(courses) && courses.length > 0) {
          setCourseId(courses[0].courseId);
          try {
            const creations = (await api.get(
              `/creations?courseId=${courses[0].courseId}`,
            )) as { type: string; title: string | null }[];
            if (!cancelled)
              setGalleryTitles(
                creations.filter((c) => c.type === "sound_duet").map((c) => c.title ?? ""),
              );
          } catch {
            /* dup-name hint degrades gracefully */
          }
        }
      } catch {
        /* logged-out/dev: local-only mode still works */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // draft autosave (navigate-away safety)
  const latestRef = useRef({ name, band, layers, progress, creationId });
  latestRef.current = { name, band, layers, progress, creationId };
  const coverPoseRef = useRef(coverPose);
  coverPoseRef.current = coverPose;
  const persistDraft = useCallback(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(latestRef.current));
    } catch {
      /* quota: in-memory state still stands */
    }
  }, []);
  useEffect(() => {
    persistDraft();
  }, [layers, name, progress, creationId, persistDraft]);
  useEffect(() => () => persistDraft(), [persistDraft]);

  useEffect(() => {
    if (!saveNote) return;
    const id = setTimeout(() => setSaveNote(null), 2500);
    return () => clearTimeout(id);
  }, [saveNote]);

  // ── actions ──
  const enterStudio = useCallback(() => {
    titleInteraction(); // Start is itself a title interaction (idempotent)
    if (layersRef.current.lead.length === 0 && layersRef.current.partner.length === 0) {
      setLayers(MOOD_SEEDS[mood]); // starter pulse: the canvas is never blank
    }
    setScreen("studio");
    startPump();
  }, [mood, startPump, titleInteraction]);

  const previewMood = useCallback(
    (m: Mood) => {
      titleInteraction();
      setMood(m);
      const audio = audioRef.current;
      if (!audio || !gateRef.current?.isWarm()) return; // preview plays once warm
      const seed = MOOD_SEEDS[m].lead;
      const start = audio.now() + 0.05;
      for (const ev of seed) {
        audio.play(ev.soundId, "lead", start + (ev.t * cfg.pulseSec) / cfg.snapPerPulse);
      }
    },
    [cfg, titleInteraction],
  );

  const onPad = useCallback(
    (soundId: SoundId) => {
      const audio = getAudio();
      audio.play(soundId, performer); // warm path: fully synchronous, no await
      triggerMotion(performer, soundId);
      if (recording) {
        const raw = (audio.now() - loopStartRef.current + cycleSec(cfg)) % cycleSec(cfg);
        const slot = quantizeToSubdivision(raw, cfg);
        setLayers((prev) => recordEvent(prev, performer, { t: slot, soundId }));
      }
    },
    [cfg, getAudio, performer, recording, triggerMotion],
  );

  const stopTake = useCallback(() => {
    setRecording(false);
    const take = summarizeTake(layersRef.current);
    if (!take.hadEvents) return;
    takesRef.current += 1;
    const before = latestRef.current.progress;
    const after = advanceEchoProgress(before, take);
    setProgress(after);

    const queue: string[] = [];
    if (!partnerUnlocked(band, before) && partnerUnlocked(band, after)) queue.push("partner");
    for (const s of newlyUnlockedSounds(band, before, after)) queue.push(`sound.${s}`);
    if (!spotsUnlocked(band, before) && spotsUnlocked(band, after)) queue.push("spots");
    if (queue.length > 0) {
      setAnnounceQueue((q) => [...q, ...queue]);
      newlyUnlockedSounds(band, before, after).forEach((s) =>
        newSoundCandidatesRef.current.add(s),
      );
    }

    let newSoundUsed: SoundId | undefined;
    for (const s of take.soundsInTake) {
      if (newSoundCandidatesRef.current.has(s)) {
        newSoundUsed = s;
        newSoundCandidatesRef.current.delete(s);
        break;
      }
    }
    setWonder(
      pickEchoWonder({
        callAndResponse: detectCallAndResponse(layersRef.current),
        restsUsed: detectRests(layersRef.current, cfg),
        newSoundUsed,
      }),
    );
  }, [band, cfg]);

  const clearPerformerLayer = useCallback(() => {
    layersReplacedRef.current += 1;
    setLayers((prev) => ({ ...prev, [performer]: [] }));
  }, [performer]);

  const saveDuet = useCallback(async () => {
    const duetName = latestRef.current.name;
    if (!duetName) {
      setShowNaming(true);
      return;
    }
    const content = buildDuetContent(
      duetName,
      band,
      latestRef.current.layers,
      [],
      coverPoseRef.current,
    );
    if (!courseId) {
      setSaveNote("local");
      return;
    }
    try {
      if (latestRef.current.creationId) {
        await api.patch(`/creations/${latestRef.current.creationId}`, { content });
      } else {
        const created = (await api.post("/creations", {
          courseId,
          type: "sound_duet",
          content,
        })) as { id: string };
        setCreationId(created.id);
      }
      setSaveNote("saved");
    } catch {
      setSaveNote("local"); // Phase 5 wires the allowlist; draft holds everything
    }
  }, [api, band, courseId]);

  const shareDuet = useCallback(async () => {
    if (!latestRef.current.creationId) await saveDuet();
    const id = latestRef.current.creationId;
    if (!id) return;
    try {
      await api.patch(`/creations/${id}`, { status: "COMPLETE" });
      setShared(true);
    } catch {
      /* stays unshared */
    }
  }, [api, saveDuet]);

  const done = useCallback(() => {
    stopPump();
    const familiesExplored = new Set(
      [...latestRef.current.layers.lead, ...latestRef.current.layers.partner].map(
        (ev) => soundSpec(ev.soundId).family,
      ),
    ).size;
    onFinish(
      buildEchoAvenueResult({
        phraseRecorded: latestRef.current.progress.phrasesRecorded > 0,
        overdubbed: latestRef.current.progress.layeredPhrases > 0,
        layerReplaced: layersReplacedRef.current > 0,
        shared,
        takesRecorded: takesRef.current,
        familiesExplored,
      }),
    );
  }, [onFinish, shared, stopPump]);

  // keyboard operability on the core loop (digits = pads, R = record, W = watch)
  const recordingRef = useRef(recording);
  recordingRef.current = recording;
  useEffect(() => {
    if (screen !== "studio") return;
    const pads = unlockedSounds(band, progress);
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const idx = Number.parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < pads.length) {
        onPad(pads[idx]);
      } else if (e.key.toLowerCase() === "r" && !watching) {
        if (recordingRef.current) stopTake();
        else setRecording(true);
      } else if (e.key.toLowerCase() === "w") {
        setWatching((w) => !w);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [band, onPad, progress, screen, stopTake, watching]);

  // apply volume/mute
  useEffect(() => {
    audioRef.current?.setMasterVolume(muted ? 0 : masterVol);
  }, [muted, masterVol]);

  const pads = unlockedSounds(band, progress);
  const hasPartner = partnerUnlocked(band, progress);
  const nameTaken = isNameTaken(
    tokenName(
      pickLocale(tokenFirst.label, tokenFirst.label.en),
      pickLocale(tokenSecond.label, tokenSecond.label.en),
    ),
    galleryTitles,
  );

  // ── Title / Imagine screen ──
  if (screen === "title") {
    return (
      <div
        className="flex flex-col items-center gap-4 py-6 px-4 text-center"
        onPointerDown={titleInteraction}
      >
        <div className="flex items-end gap-6" aria-hidden>
          <LeadFigure motion={null} />
          <PartnerFigure motion={null} />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800">
          {t("echoAvenue.title.prompt", {
            defaultValue: "What will your duet sound like?",
          })}
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {(["together", "echo", "space"] as Mood[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => previewMood(m)}
              aria-pressed={mood === m}
              className={`min-h-12 px-5 rounded-2xl border-[3px] font-extrabold active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-4 focus-visible:outline-sky-500 ${
                mood === m ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white"
              }`}
            >
              {m === "together"
                ? t("echoAvenue.title.moodTogether", { defaultValue: "🤝 Together" })
                : m === "echo"
                  ? t("echoAvenue.title.moodEcho", { defaultValue: "🔁 Echo" })
                  : t("echoAvenue.title.moodSpace", { defaultValue: "🌙 Space" })}
            </button>
          ))}
        </div>

        {/* Sensory controls BEFORE Start (held-firm #3) */}
        <div className="flex flex-wrap items-center justify-center gap-3 bg-white/70 rounded-2xl px-4 py-3">
          <button
            type="button"
            onClick={() => setMuted((v) => !v)}
            aria-pressed={muted}
            className="min-h-11 px-4 rounded-full bg-white border-2 border-slate-300 font-bold text-slate-700 active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
          >
            {muted
              ? t("echoAvenue.sensory.unmute", { defaultValue: "🔇 Sound off" })
              : t("echoAvenue.sensory.mute", { defaultValue: "🔊 Sound on" })}
          </button>
          <label className="flex items-center gap-2 font-bold text-slate-700 text-sm">
            {t("echoAvenue.sensory.volume", { defaultValue: "Volume" })}
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={masterVol}
              onChange={(e) => setMasterVol(Number(e.target.value))}
              className="w-28 min-h-11"
            />
          </label>
          <button
            type="button"
            onClick={() => setCalmMode((v) => !v)}
            aria-pressed={calmMode}
            className="min-h-11 px-4 rounded-full bg-white border-2 border-slate-300 font-bold text-slate-700 active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
          >
            {t("echoAvenue.sensory.calm", { defaultValue: "🕊️ Calm lights" })}
          </button>
        </div>

        <button
          type="button"
          onClick={enterStudio}
          className="min-h-14 px-10 rounded-full bg-green-600 text-white text-xl font-extrabold shadow-lg active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-4 focus-visible:outline-green-300"
        >
          {t("echoAvenue.title.start", { defaultValue: "Open the studio!" })}
        </button>
        {draft && (
          <p className="text-sm text-slate-500 font-semibold">
            {t("echoAvenue.title.resume", { defaultValue: "Your last take is waiting inside." })}
          </p>
        )}
      </div>
    );
  }

  // ── Studio ──
  return (
    <div className="flex flex-col items-center gap-3 w-full px-2 pb-4">
      {/* Stage */}
      <div className="relative w-full max-w-xl rounded-3xl bg-gradient-to-b from-indigo-100 to-indigo-200 p-4 overflow-hidden">
        <div className="flex items-end justify-around min-h-36">
          <div className="flex flex-col items-center">
            <div className="h-6 flex gap-1" aria-hidden>
              {trails
                .filter((tr) => tr.performer === "lead")
                .map((tr) => (
                  <span key={tr.id} className="ea-trail text-sm">
                    {tr.icon}
                  </span>
                ))}
            </div>
            <LeadFigure motion={motionNow.lead} />
            <span className="text-xs font-extrabold text-indigo-900">
              {t("echoAvenue.studio.lead", { defaultValue: "Lead" })}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <div className="h-6 flex gap-1" aria-hidden>
              {trails
                .filter((tr) => tr.performer === "partner")
                .map((tr) => (
                  <span key={tr.id} className="ea-trail text-sm">
                    {tr.icon}
                  </span>
                ))}
            </div>
            <PartnerFigure motion={hasPartner ? motionNow.partner : null} />
            <span className="text-xs font-extrabold text-indigo-900">
              {hasPartner
                ? t("echoAvenue.studio.partner", { defaultValue: "Partner" })
                : t("echoAvenue.studio.partnerLocked", { defaultValue: "Partner (record a take!)" })}
            </span>
          </div>
        </div>
        {/* pulse lane (silent-mode duty: beat + sound-color flashes) */}
        <div className="flex justify-center gap-2 mt-2" aria-hidden>
          {Array.from({ length: cfg.pulses }, (_, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-full ${beat === i && !calm ? "ea-beat-now" : ""}`}
              style={{
                background: beat === i ? "#facc15" : "#c7d2fe",
                ...(lightFlash && beat === i && !calm
                  ? ({ "--ea-light": lightFlash.color } as React.CSSProperties)
                  : {}),
              }}
            />
          ))}
        </div>
      </div>

      {watching ? (
        /* Watch the Take — controls hidden; the two source-specified exits */
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setWatching(false)}
            className="min-h-12 px-8 rounded-full bg-amber-500 text-white font-extrabold active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            {t("echoAvenue.watch.joinIn", { defaultValue: "🎤 Join in!" })}
          </button>
          <button
            type="button"
            onClick={() => setWatching(false)}
            className="min-h-12 px-8 rounded-full bg-white border-2 border-slate-300 font-extrabold text-slate-700 active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
          >
            {t("echoAvenue.watch.changeLayer", { defaultValue: "🔁 Change a layer" })}
          </button>
        </div>
      ) : (
        <>
          {/* Performer tabs + layer mix */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full max-w-xl">
            {(["lead", "partner"] as Performer[]).map((who) => (
              <button
                key={who}
                type="button"
                disabled={who === "partner" && !hasPartner}
                onClick={() => setPerformer(who)}
                aria-pressed={performer === who}
                className={`min-h-11 px-5 rounded-full font-extrabold active:scale-95 touch-manipulation disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 ${
                  performer === who
                    ? who === "lead"
                      ? "bg-amber-500 text-white"
                      : "bg-sky-500 text-white"
                    : "bg-white border-2 border-slate-200 text-slate-700"
                }`}
              >
                {who === "lead"
                  ? t("echoAvenue.studio.lead", { defaultValue: "Lead" })
                  : t("echoAvenue.studio.partner", { defaultValue: "Partner" })}{" "}
                ({layers[who].length})
              </button>
            ))}
            <label className="flex items-center gap-1 text-xs font-bold text-slate-600">
              {t("echoAvenue.studio.layerVolume", { defaultValue: "Layer volume" })}
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                defaultValue={1}
                onChange={(e) =>
                  audioRef.current?.setLayerVolume(performer, Number(e.target.value))
                }
                className="w-24 min-h-11"
              />
            </label>
            <button
              type="button"
              onClick={() => setMuted((v) => !v)}
              aria-pressed={muted}
              className="min-h-11 px-3 rounded-full bg-white border-2 border-slate-200 font-bold active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
              aria-label={t("echoAvenue.sensory.muteAria", { defaultValue: "Toggle sound" })}
            >
              {muted ? "🔇" : "🔊"}
            </button>
          </div>

          {/* Action pads — ≥64px, one-pointer, motion previews in the label */}
          <div className="flex flex-wrap justify-center gap-3 w-full max-w-xl">
            {pads.map((soundId, i) => {
              const spec = soundSpec(soundId);
              return (
                <button
                  key={soundId}
                  type="button"
                  onPointerDown={() => onPad(soundId)}
                  className="rounded-3xl font-extrabold text-white shadow-md active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-4 focus-visible:outline-white"
                  style={{ width: 84, height: 84, background: spec.lightColor }}
                  aria-label={t(`echoAvenue.sound.${soundId}`, { defaultValue: soundId })}
                >
                  <span className="text-3xl block" aria-hidden>
                    {spec.icon}
                  </span>
                  <span className="text-[10px] opacity-90">{i + 1}</span>
                </button>
              );
            })}
          </div>

          {/* Transport row */}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => (recording ? stopTake() : setRecording(true))}
              aria-pressed={recording}
              className={`min-h-12 px-6 rounded-full font-extrabold text-white active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                recording ? "bg-red-500" : "bg-slate-700"
              }`}
            >
              {recording
                ? t("echoAvenue.studio.stopTake", { defaultValue: "⏹ Finish the take" })
                : t("echoAvenue.studio.record", { defaultValue: "● Record a take" })}
            </button>
            <button
              type="button"
              onClick={() => setWatching(true)}
              className="min-h-12 px-6 rounded-full bg-indigo-600 text-white font-extrabold active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              {t("echoAvenue.studio.watch", { defaultValue: "🎬 Watch the Take" })}
            </button>
            <button
              type="button"
              onClick={clearPerformerLayer}
              className="min-h-11 px-4 rounded-full bg-white border-2 border-slate-300 font-bold text-slate-700 active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
            >
              {t("echoAvenue.studio.redoLayer", { defaultValue: "Redo this layer" })}
            </button>
            <button
              type="button"
              onClick={() => void saveDuet()}
              className="min-h-11 px-4 rounded-full bg-teal-600 text-white font-bold active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              {name
                ? t("echoAvenue.studio.save", { defaultValue: "Save" })
                : t("echoAvenue.studio.name", { defaultValue: "Name it" })}
            </button>
            {creationId && !shared && (
              <button
                type="button"
                onClick={() => void shareDuet()}
                className="min-h-11 px-4 rounded-full bg-violet-600 text-white font-bold active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                {t("echoAvenue.studio.share", { defaultValue: "Share ✨" })}
              </button>
            )}
            <button
              type="button"
              onClick={done}
              className="min-h-11 px-4 rounded-full bg-white border-2 border-slate-300 font-bold text-slate-700 active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
            >
              {t("echoAvenue.studio.done", { defaultValue: "Done for now" })}
            </button>
          </div>
          <p className="text-xs text-slate-500 font-semibold" role="status">
            {name ? `🏷️ ${name}` : t("echoAvenue.studio.untitled", { defaultValue: "Untitled take" })}
            {saveNote === "saved" && ` · ${t("echoAvenue.studio.saved", { defaultValue: "Saved ✓" })}`}
            {saveNote === "local" &&
              ` · ${t("echoAvenue.studio.savedLocal", { defaultValue: "Kept on this device ✓" })}`}
          </p>
        </>
      )}

      {/* Unlock announces (before Reflect — scaffolding announces itself) */}
      {announceQueue.length > 0 && !wonder && (
        <Overlay>
          <div className="text-5xl" aria-hidden>
            🎉
          </div>
          <h3 className="text-xl font-extrabold text-slate-800" role="status">
            {announceQueue[0] === "partner"
              ? t("echoAvenue.unlock.partner", {
                  defaultValue: "Your Partner joins the stage! Overdub a second layer!",
                })
              : announceQueue[0] === "spots"
                ? t("echoAvenue.unlock.spots", {
                    defaultValue: "Sound spots opened! The tunnel and the puddle color your sounds!",
                  })
                : t(`echoAvenue.unlock.${announceQueue[0].replace("sound.", "")}`, {
                    defaultValue: "You earned a new sound!",
                  })}
          </h3>
          <button
            type="button"
            onClick={() => setAnnounceQueue((q) => q.slice(1))}
            className="min-h-12 px-8 rounded-full bg-green-600 text-white font-extrabold text-lg active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            {t("echoAvenue.unlock.tryIt", { defaultValue: "Let's try it!" })}
          </button>
        </Overlay>
      )}

      {/* Reflect — ONE wondering question; a separate moment from naming */}
      {wonder && (
        <Overlay>
          <div className="flex items-start gap-3 text-left w-full">
            <div className="text-5xl" aria-hidden>
              🎙️
            </div>
            <div className="flex-1 bg-white rounded-2xl p-3 font-bold text-lg text-slate-800 shadow">
              {t(wonder.key, { defaultValue: "What would you try next?", ...(wonder.params ?? {}) })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWonder(null)}
            className="min-h-12 px-8 rounded-full bg-orange-500 text-white font-extrabold text-lg active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            {t("echoAvenue.reflect.backToStudio", { defaultValue: "Back to my studio" })}
          </button>
        </Overlay>
      )}

      {/* Naming — approved token pools only (kid-safety; no free text) */}
      {showNaming && (
        <Overlay>
          <h3 className="text-xl font-extrabold text-slate-800">
            {t("echoAvenue.name.title", { defaultValue: "Name your duet!" })}
          </h3>
          <p className="text-2xl font-black text-sky-700" role="status">
            {pickLocale(tokenFirst.label, tokenFirst.label.en)}{" "}
            {pickLocale(tokenSecond.label, tokenSecond.label.en)}
          </p>
          {nameTaken && (
            <p className="text-amber-700 font-bold text-sm" role="status">
              {t("echoAvenue.name.taken", {
                defaultValue: "That name's taken — try a different mix!",
              })}
            </p>
          )}
          {/* Cover pose — chosen at share time (source §Share) */}
          <p className="text-sm font-bold text-slate-600">
            {t("echoAvenue.name.poseTitle", { defaultValue: "Pick a cover pose" })}
          </p>
          <div className="flex justify-center gap-2">
            {COVER_POSES.map((pose) => (
              <button
                key={pose}
                type="button"
                onClick={() => setCoverPose(pose)}
                aria-pressed={coverPose === pose}
                aria-label={t(`echoAvenue.pose.${pose}`, { defaultValue: pose })}
                className={`min-w-14 min-h-12 px-3 rounded-2xl border-2 text-2xl active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 ${
                  coverPose === pose
                    ? "border-sky-500 bg-sky-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                {COVER_POSE_ICONS[pose]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {ECHO_TOKENS_FIRST.map((tok) => (
              <button
                key={tok.id}
                type="button"
                onClick={() => setTokenFirst(tok)}
                aria-pressed={tokenFirst.id === tok.id}
                className={`min-h-11 px-4 rounded-full border-2 font-bold active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 ${
                  tokenFirst.id === tok.id
                    ? "border-sky-500 bg-sky-50 text-sky-800"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {pickLocale(tok.label, tok.label.en)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {ECHO_TOKENS_SECOND.map((tok) => (
              <button
                key={tok.id}
                type="button"
                onClick={() => setTokenSecond(tok)}
                aria-pressed={tokenSecond.id === tok.id}
                className={`min-h-11 px-4 rounded-full border-2 font-bold active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 ${
                  tokenSecond.id === tok.id
                    ? "border-green-500 bg-green-50 text-green-800"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {pickLocale(tok.label, tok.label.en)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={nameTaken}
              onClick={() => {
                setName(
                  tokenName(
                    pickLocale(tokenFirst.label, tokenFirst.label.en),
                    pickLocale(tokenSecond.label, tokenSecond.label.en),
                  ),
                );
                setShowNaming(false);
                setTimeout(() => void saveDuet(), 0);
              }}
              className="min-h-12 px-8 rounded-full bg-teal-600 text-white font-extrabold text-lg active:scale-95 touch-manipulation disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              {t("echoAvenue.name.keep", { defaultValue: "That's it!" })}
            </button>
            <button
              type="button"
              onClick={() => setShowNaming(false)}
              className="min-h-11 px-5 rounded-full bg-white border-2 border-slate-300 font-bold text-slate-700 active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
            >
              {t("echoAvenue.name.later", { defaultValue: "Later" })}
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#fdf9f0] rounded-3xl p-5 w-full max-w-sm flex flex-col items-center gap-3 text-center shadow-2xl max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// ── Shell wrapper (completion wiring mirrors Boost Track Builder) ───────────

export default function EchoAvenueGame({
  config,
  onComplete,
}: {
  config?: unknown;
  onComplete?: (result: GameResult) => void;
}) {
  const band: EchoBand =
    (config as { gradeBand?: string } | undefined)?.gradeBand === "g3_5" ? "g35" : "k2";
  return (
    <GameShell
      gameKey="echo_avenue"
      title={pickLocale(
        { en: "Echo Avenue", es: "Avenida del Eco", "zh-CN": "回声大道" },
        "Echo Avenue",
      )}
      onComplete={onComplete ?? (() => {})}
    >
      {({ onFinish, reducedEffects }) => (
        <EchoStudioCore onFinish={onFinish} reducedEffects={reducedEffects} band={band} />
      )}
    </GameShell>
  );
}
