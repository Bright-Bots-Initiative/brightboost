/**
 * Echo Avenue — pure engine model (Set 3 · slot 3 · "mastery through making").
 *
 * Everything timing-critical is integer subdivision math on the cycle grid —
 * events persist as grid indices, never float seconds, so replay is exact and
 * drift-impossible by construction. All functions here are pure and
 * mock-clock testable; the WebAudio layer lives in ./echoAvenueAudio.ts.
 *
 * Non-negotiables from docs/games/echo-avenue-design.md:
 * - NO scores/stars/timers/verdicts/win-lose/correct-rhythms anywhere.
 * - Quantization is a scaffold (every tap lands musically) AND the
 *   hardware-latency shock absorber (§3 of the design doc).
 * - Unlocks respond to MAKING (phrases, layers) — never accuracy; ignoring
 *   every prompt still unlocks everything by making.
 */
import type { GameResult } from "../shared/GameShell";

// ── Sounds (all synthesized; each pairs with a silent-mode signature) ───────

export type Performer = "lead" | "partner";
export type SoundFamily = "steps" | "hands" | "bells" | "air";
export const SOUND_IDS = [
  "step",
  "stomp",
  "clap",
  "tap",
  "chime",
  "twinkle",
  "whoosh",
  "breeze",
] as const;
export type SoundId = (typeof SOUND_IDS)[number];

export interface SoundSpec {
  id: SoundId;
  family: SoundFamily;
  icon: string;
  /** motion signature id — the animation the performer plays (silent-mode duty) */
  motion: "stride" | "bounce" | "armSnap" | "nod" | "spin" | "sparkleTurn" | "glide" | "sway";
  /** pulse-light color flashed on the beat lane (silent-mode duty) */
  lightColor: string;
  /** trail glyph left on the stage strip (silent-mode duty) */
  trail: "ripple" | "flash" | "sparkle" | "streak";
}

export const SOUND_SET: SoundSpec[] = [
  { id: "step", family: "steps", icon: "🦶", motion: "stride", lightColor: "#8b5cf6", trail: "ripple" },
  { id: "stomp", family: "steps", icon: "🐘", motion: "bounce", lightColor: "#6d28d9", trail: "ripple" },
  { id: "clap", family: "hands", icon: "👏", motion: "armSnap", lightColor: "#f59e0b", trail: "flash" },
  { id: "tap", family: "hands", icon: "👆", motion: "nod", lightColor: "#fbbf24", trail: "flash" },
  { id: "chime", family: "bells", icon: "🔔", motion: "spin", lightColor: "#0ea5e9", trail: "sparkle" },
  { id: "twinkle", family: "bells", icon: "✨", motion: "sparkleTurn", lightColor: "#38bdf8", trail: "sparkle" },
  { id: "whoosh", family: "air", icon: "💨", motion: "glide", lightColor: "#10b981", trail: "streak" },
  { id: "breeze", family: "air", icon: "🍃", motion: "sway", lightColor: "#34d399", trail: "streak" },
];

export function soundSpec(id: SoundId): SoundSpec {
  return SOUND_SET.find((s) => s.id === id)!;
}

// ── Cycle model ─────────────────────────────────────────────────────────────

export type EchoBand = "k2" | "g35"; // 6-8 is documented future intent, not built

export interface BandConfig {
  pulses: number;
  pulseSec: number;
  /** snap subdivisions per pulse (the quantization scaffold) */
  snapPerPulse: number;
}

export const BAND_CONFIG: Record<EchoBand, BandConfig> = {
  k2: { pulses: 4, pulseSec: 0.6, snapPerPulse: 2 }, // 100 BPM, 8 slots
  g35: { pulses: 8, pulseSec: 0.6, snapPerPulse: 2 }, // 16 slots
};

export function subdivisions(cfg: BandConfig): number {
  return cfg.pulses * cfg.snapPerPulse;
}
export function cycleSec(cfg: BandConfig): number {
  return cfg.pulses * cfg.pulseSec;
}

/**
 * Quantize a raw offset (seconds into the cycle) to the nearest subdivision,
 * WRAPPING at the cycle boundary: a tap a hair before the loop point lands on
 * slot 0 of the next pass, never on a phantom slot past the end.
 */
export function quantizeToSubdivision(rawOffsetSec: number, cfg: BandConfig): number {
  const subSec = cfg.pulseSec / cfg.snapPerPulse;
  const total = subdivisions(cfg);
  const idx = Math.round(rawOffsetSec / subSec);
  return ((idx % total) + total) % total;
}

export function subdivisionTime(t: number, cfg: BandConfig): number {
  return t * (cfg.pulseSec / cfg.snapPerPulse);
}

// ── Scheduler math (the lookahead pump's brain; mock-clock testable) ────────

/** Pulse indices whose start times fall inside the lookahead horizon. */
export function pulsesToSchedule(
  nextPulse: number,
  loopStart: number,
  now: number,
  horizonSec: number,
  pulseSec: number,
): number[] {
  const out: number[] = [];
  let p = nextPulse;
  while (loopStart + p * pulseSec < now + horizonSec) {
    out.push(p);
    p += 1;
  }
  return out;
}

/** Absolute AudioContext time of an event in a given cycle pass. */
export function eventTime(
  loopStart: number,
  cycleIdx: number,
  t: number,
  cfg: BandConfig,
): number {
  return loopStart + cycleIdx * cycleSec(cfg) + subdivisionTime(t, cfg);
}

// ── Layers ──────────────────────────────────────────────────────────────────

export interface DuetEvent {
  t: number; // subdivision index
  soundId: SoundId;
}

export interface DuetLayers {
  lead: DuetEvent[];
  partner: DuetEvent[];
}

export const EMPTY_LAYERS: DuetLayers = { lead: [], partner: [] };

export function recordEvent(
  layers: DuetLayers,
  performer: Performer,
  ev: DuetEvent,
): DuetLayers {
  return { ...layers, [performer]: [...layers[performer], ev] };
}

/** Re-recording replaces ONE layer; the other is untouched (tested invariant). */
export function replaceLayer(
  layers: DuetLayers,
  performer: Performer,
  events: DuetEvent[],
): DuetLayers {
  return { ...layers, [performer]: events };
}

export function clearLayer(layers: DuetLayers, performer: Performer): DuetLayers {
  return replaceLayer(layers, performer, []);
}

export function totalEvents(layers: DuetLayers): number {
  return layers.lead.length + layers.partner.length;
}

// ── Unlock ladder (fast pacing — founder-review flag; making, never accuracy) ─

export interface EchoProgress {
  /** completed recorded takes with ≥1 event */
  phrasesRecorded: number;
  /** takes where BOTH performers had events */
  layeredPhrases: number;
  layersReplaced: number;
  shared: boolean;
  soundsUsed: SoundId[];
}

export const FRESH_ECHO_PROGRESS: EchoProgress = {
  phrasesRecorded: 0,
  layeredPhrases: 0,
  layersReplaced: 0,
  shared: false,
  soundsUsed: [],
};

// Source-reconciled K-2 opening: Step + Clap pads first; the first phrase
// brings the Partner plus Chime/Whoosh; the first layered phrase reveals the
// sound spot plus Stomp/Twinkle (design doc §7).
export const K2_START_SOUNDS: SoundId[] = ["step", "clap"];
const K2_UNLOCK_1: SoundId[] = ["chime", "whoosh"]; // first phrase
const K2_UNLOCK_2: SoundId[] = ["stomp", "twinkle"]; // first layered phrase

export function unlockedSounds(band: EchoBand, p: EchoProgress): SoundId[] {
  if (band !== "k2") return [...SOUND_IDS];
  const out: SoundId[] = [...K2_START_SOUNDS];
  if (p.phrasesRecorded >= 1) out.push(...K2_UNLOCK_1);
  if (p.layeredPhrases >= 1) out.push(...K2_UNLOCK_2);
  return out;
}

/** The Partner joins after the child's first recorded phrase (K-2). */
export function partnerUnlocked(band: EchoBand, p: EchoProgress): boolean {
  return band !== "k2" || p.phrasesRecorded >= 1;
}

/** The two curated sound spots open with the first layered phrase (K-2). */
export function spotsUnlocked(band: EchoBand, p: EchoProgress): boolean {
  return band !== "k2" || p.layeredPhrases >= 1;
}

export function newlyUnlockedSounds(
  band: EchoBand,
  before: EchoProgress,
  after: EchoProgress,
): SoundId[] {
  const prev = new Set(unlockedSounds(band, before));
  return unlockedSounds(band, after).filter((id) => !prev.has(id));
}

export interface TakeSummary {
  hadEvents: boolean;
  bothPerformers: boolean;
  soundsInTake: SoundId[];
}

export function summarizeTake(layers: DuetLayers): TakeSummary {
  return {
    hadEvents: totalEvents(layers) > 0,
    bothPerformers: layers.lead.length > 0 && layers.partner.length > 0,
    soundsInTake: [
      ...new Set([...layers.lead, ...layers.partner].map((ev) => ev.soundId)),
    ],
  };
}

export function advanceEchoProgress(p: EchoProgress, take: TakeSummary): EchoProgress {
  if (!take.hadEvents) return p; // an empty take advances nothing (and costs nothing)
  return {
    ...p,
    phrasesRecorded: p.phrasesRecorded + 1,
    layeredPhrases: p.layeredPhrases + (take.bothPerformers ? 1 : 0),
    soundsUsed: [...new Set([...p.soundsUsed, ...take.soundsInTake])],
  };
}

// ── Reflect: the mascot's ONE wondering question (separate from naming) ─────

export interface EchoWonderContext {
  callAndResponse: boolean;
  restsUsed: boolean;
  newSoundUsed?: SoundId;
}

/** Call-and-response: both performers played, and the Partner's hits all sit
 *  in the Lead's gaps (no shared slots) — the simplest honest detector. */
export function detectCallAndResponse(layers: DuetLayers): boolean {
  if (layers.lead.length === 0 || layers.partner.length === 0) return false;
  const leadSlots = new Set(layers.lead.map((ev) => ev.t));
  return layers.partner.every((ev) => !leadSlots.has(ev.t));
}

/** Rests: at least two grid slots left intentionally empty (and something played). */
export function detectRests(layers: DuetLayers, cfg: BandConfig): boolean {
  if (totalEvents(layers) === 0) return false;
  const occupied = new Set([...layers.lead, ...layers.partner].map((ev) => ev.t));
  return subdivisions(cfg) - occupied.size >= 2;
}

export function pickEchoWonder(
  ctx: EchoWonderContext,
  rand: () => number = Math.random,
): { key: string; params?: Record<string, unknown> } {
  if (ctx.newSoundUsed) return { key: `echoAvenue.wonder.newSound.${ctx.newSoundUsed}` };
  if (ctx.callAndResponse) return { key: "echoAvenue.wonder.callResponse" };
  if (ctx.restsUsed) return { key: "echoAvenue.wonder.rests" };
  return rand() < 0.5
    ? { key: "echoAvenue.wonder.favorite" }
    : { key: "echoAvenue.wonder.next" };
}

// ── Naming: approved localized token pools only (no free text — kid-safety) ─

type LocalizedLabel = Record<string, string>;

export interface NameToken {
  id: string;
  label: LocalizedLabel; // per-locale curated pools, not word-by-word translation
}

export const ECHO_TOKENS_FIRST: NameToken[] = [
  { id: "midnight", label: { en: "Midnight", es: "Medianoche", "zh-CN": "午夜" } },
  { id: "sunny", label: { en: "Sunny", es: "Soleado", "zh-CN": "阳光" } },
  { id: "bouncy", label: { en: "Bouncy", es: "Saltarín", "zh-CN": "蹦蹦" } },
  { id: "quiet", label: { en: "Quiet", es: "Tranquilo", "zh-CN": "安静" } },
  { id: "double", label: { en: "Double", es: "Doble", "zh-CN": "双重" } },
  { id: "electric", label: { en: "Electric", es: "Eléctrico", "zh-CN": "闪电" } },
];

export const ECHO_TOKENS_SECOND: NameToken[] = [
  { id: "echo", label: { en: "Echo", es: "Eco", "zh-CN": "回声" } },
  { id: "parade", label: { en: "Parade", es: "Desfile", "zh-CN": "巡游" } },
  { id: "groove", label: { en: "Groove", es: "Ritmo", "zh-CN": "节奏" } },
  { id: "shuffle", label: { en: "Shuffle", es: "Pasitos", "zh-CN": "小步舞" } },
  { id: "duet", label: { en: "Duet", es: "Dúo", "zh-CN": "二重奏" } },
  { id: "avenue", label: { en: "Avenue", es: "Avenida", "zh-CN": "大道" } },
];

export function tokenName(first: string, second: string): string {
  return `${first} ${second}`.trim().slice(0, 24);
}

/** Duplicate titles are handled by a recombination hint, never an error. */
export function isNameTaken(
  name: string,
  existingTitles: (string | null | undefined)[],
): boolean {
  const target = name.trim().toLowerCase();
  return existingTitles.some((t) => !!t && t.trim().toLowerCase() === target);
}

// ── Completion payload — mirrors Boost Track Builder EXACTLY (no verdicts) ──

export interface EchoSessionSummary {
  phraseRecorded: boolean;
  overdubbed: boolean;
  layerReplaced: boolean;
  shared: boolean;
  takesRecorded: number;
  familiesExplored: number;
}

export const ECHO_AVENUE_TOTAL = 6;

/**
 * Flat participation-shaped score (integer, platform byte-compatible):
 * recorded a phrase (+2), overdubbed the Partner (+2), revised a layer (+1),
 * shared (+1). Nothing in-game ever displays this — zero verdict UI.
 */
export function buildEchoAvenueResult(s: EchoSessionSummary): GameResult {
  const score =
    (s.phraseRecorded ? 2 : 0) +
    (s.overdubbed ? 2 : 0) +
    (s.layerReplaced ? 1 : 0) +
    (s.shared ? 1 : 0);
  return {
    gameKey: "echo_avenue",
    score,
    total: ECHO_AVENUE_TOTAL,
    streakMax: 0, // no streak concept exists in this game — flat by design
    roundsCompleted: s.takesRecorded,
    gameSpecific: {
      takesRecorded: s.takesRecorded,
      familiesExplored: s.familiesExplored,
      shared: s.shared,
    },
  };
}

// ── Persisted content shape (validated server-side in soundDuet.ts) ─────────

/** The gallery card's cover pose — chosen at share time (design doc §6). */
export const COVER_POSES = ["sideBySide", "highFive", "backToBack"] as const;
export type CoverPose = (typeof COVER_POSES)[number];

export const COVER_POSE_ICONS: Record<CoverPose, string> = {
  sideBySide: "🧍🧍",
  highFive: "🙌",
  backToBack: "🔄",
};

export interface SoundDuetContent {
  v: 1;
  name: string;
  band: EchoBand;
  pulses: number;
  layers: DuetLayers;
  spots: ("tunnel" | "puddle")[];
  coverPose: CoverPose;
}

export function buildDuetContent(
  name: string,
  band: EchoBand,
  layers: DuetLayers,
  spots: ("tunnel" | "puddle")[],
  coverPose: CoverPose = "sideBySide",
): SoundDuetContent {
  return { v: 1, name, band, pulses: BAND_CONFIG[band].pulses, layers, spots, coverPose };
}
