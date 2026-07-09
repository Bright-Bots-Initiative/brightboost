/**
 * Boost Track Builder — Set 3 · game 1 ("mastery through making").
 *
 * The kid designs a motorcycle track (tap-to-place pieces), then rides it —
 * the ride's whole challenge comes from their own design. Spin-outs are
 * information about the track, never a game-over. The track persists as a
 * Creation (`type: "race_track"`); rules live in ./trackMakerModel.ts and
 * are unit-tested there. Design doc: docs/games/set3-track-maker-design.md.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import GameShell, { type GameResult } from "./shared/GameShell";
import { getGradeBand } from "./gradeBandContent";
import { pickLocale } from "@/utils/localizedContent";
import { useApi } from "@/services/api";
import {
  CURVE_TOLERANCE,
  DEFAULT_GRID,
  NAME_KIT_ADJECTIVES,
  NAME_KIT_NOUNS,
  PATTERN_BOOK,
  SOFT_TARGETS,
  buildTrackMakerResult,
  initialRideState,
  newlyUnlocked,
  pickReflectPrompt,
  starterTrack,
  stepRide,
  suggestUniqueName,
  trackToPolylinePoints,
  unlockedPieceTypes,
  validateRaceTrackContent,
  walkTrack,
  type PieceType,
  type RaceTrackContent,
  type ReflectPrompt,
  type RideState,
  type Rot,
  type TrackPiece,
} from "./trackMakerModel";

// ── Local draft (autosave-on-navigate: nothing is ever lost) ────────────────
// The server only ever stores RIDEABLE tracks (the validator is the security
// boundary, so peers can never open a broken one). Mid-edit states that
// aren't rideable yet are kept here so navigating away loses nothing.
const DRAFT_KEY = "bb_track_maker_draft_v1";

interface TrackDraft {
  name: string;
  pieces: TrackPiece[];
  creationId: string | null;
  ridesCompleted: number;
}

function loadDraft(): TrackDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as TrackDraft;
    if (!Array.isArray(d.pieces) || typeof d.name !== "string") return null;
    return d;
  } catch {
    return null;
  }
}

function persistDraft(draft: TrackDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage full/blocked — the in-memory state still stands.
  }
}

// ── Piece rendering (simple per-cell SVG roads) ─────────────────────────────

const ROAD = "#475569";
const ROAD_EDGE = "#f59e0b";

function PieceSvg({ type }: { type: PieceType }) {
  switch (type) {
    case "straight":
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden>
          <path d="M 0 50 H 100" stroke={ROAD} strokeWidth={36} fill="none" />
          <path d="M 8 50 H 92" stroke="#fff" strokeWidth={3} strokeDasharray="10 10" fill="none" />
        </svg>
      );
    case "gentleCurve":
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden>
          <path d="M 50 0 Q 50 50 100 50" stroke={ROAD} strokeWidth={36} fill="none" />
        </svg>
      );
    case "sharpCurve":
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden>
          <path d="M 50 0 L 50 50 L 100 50" stroke={ROAD} strokeWidth={36} fill="none" strokeLinejoin="miter" />
          <path d="M 50 6 L 50 50 L 94 50" stroke={ROAD_EDGE} strokeWidth={4} fill="none" strokeDasharray="8 6" />
        </svg>
      );
    case "boost":
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden>
          <path d="M 0 50 H 100" stroke={ROAD} strokeWidth={36} fill="none" />
          <text x="50" y="62" textAnchor="middle" fontSize="34">⚡</text>
        </svg>
      );
    case "start":
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden>
          <path d="M 50 50 H 100" stroke={ROAD} strokeWidth={36} fill="none" />
          <circle cx="42" cy="50" r="24" fill="#16a34a" />
          <text x="42" y="60" textAnchor="middle" fontSize="28">🏍️</text>
        </svg>
      );
    case "finish":
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden>
          <circle cx="50" cy="50" r="30" fill={ROAD} />
          <text x="50" y="62" textAnchor="middle" fontSize="34">🏁</text>
        </svg>
      );
  }
}

function PieceTile({ piece }: { piece: TrackPiece }) {
  // The finish accepts entry from any side, so rotating its glyph would only
  // flip the 🏁 upside down — keep it upright.
  const rot = piece.type === "finish" ? 0 : piece.rot;
  return (
    <div className="w-full h-full" style={{ transform: `rotate(${rot}deg)` }}>
      <PieceSvg type={piece.type} />
    </div>
  );
}

const PALETTE_LABEL_KEYS: Record<PieceType, { key: string; en: string }> = {
  start: { key: "games.trackMaker.piece.start", en: "Start" },
  straight: { key: "games.trackMaker.piece.straight", en: "Straight" },
  gentleCurve: { key: "games.trackMaker.piece.gentleCurve", en: "Gentle curve" },
  sharpCurve: { key: "games.trackMaker.piece.sharpCurve", en: "Sharp curve" },
  boost: { key: "games.trackMaker.piece.boost", en: "Boost pad" },
  finish: { key: "games.trackMaker.piece.finish", en: "Finish flag" },
};

// ── Bike geometry: position along the walked path ───────────────────────────

type Dir = "N" | "E" | "S" | "W";
const SIDE_MID: Record<Dir, [number, number]> = {
  N: [0.5, 0],
  E: [1, 0.5],
  S: [0.5, 1],
  W: [0, 0.5],
};

function dirBetween(a: TrackPiece, b: TrackPiece): Dir {
  if (b.x > a.x) return "E";
  if (b.x < a.x) return "W";
  if (b.y > a.y) return "S";
  return "N";
}

/** Bike position in cell units: entry-mid → center → exit-mid polyline. */
function bikePosition(
  path: TrackPiece[],
  pieceIndex: number,
  progress: number,
): { x: number; y: number } {
  const piece = path[Math.min(pieceIndex, path.length - 1)];
  const prev = path[pieceIndex - 1];
  const next = path[pieceIndex + 1];
  const entry: [number, number] = prev
    ? SIDE_MID[dirBetween(prev, piece) === "E" ? "W" : dirBetween(prev, piece) === "W" ? "E" : dirBetween(prev, piece) === "S" ? "N" : "S"]
    : [0.5, 0.5];
  const exit: [number, number] = next ? SIDE_MID[dirBetween(piece, next)] : [0.5, 0.5];
  const center: [number, number] = [0.5, 0.5];
  const [fx, fy] =
    progress < 0.5
      ? [
          entry[0] + (center[0] - entry[0]) * (progress * 2),
          entry[1] + (center[1] - entry[1]) * (progress * 2),
        ]
      : [
          center[0] + (exit[0] - center[0]) * ((progress - 0.5) * 2),
          center[1] + (exit[1] - center[1]) * ((progress - 0.5) * 2),
        ];
  return { x: piece.x + fx, y: piece.y + fy };
}

// ── The game core ───────────────────────────────────────────────────────────

type Screen = "imagine" | "build" | "ride";

interface CoreProps {
  onFinish: (result: GameResult) => void;
  reducedEffects: boolean;
  band: "k2" | "g3_5";
}

function TrackMakerCore({ onFinish, reducedEffects, band }: CoreProps) {
  const { t } = useTranslation();
  const api = useApi();

  // Build state
  const draft = useMemo(loadDraft, []);
  const [screen, setScreen] = useState<Screen>(draft ? "build" : "imagine");
  const [pieces, setPieces] = useState<TrackPiece[]>(
    draft?.pieces ?? starterTrack(),
  );
  const [name, setName] = useState<string>(draft?.name ?? "");
  const [tool, setTool] = useState<PieceType | "erase">("straight");
  const [ridesCompleted, setRidesCompleted] = useState(
    draft?.ridesCompleted ?? 0,
  );
  const [hintCell, setHintCell] = useState<{ x: number; y: number } | null>(null);

  // Maker telemetry (iteration signals, never rankings)
  const [tweaks, setTweaks] = useState(0);
  const tweaksSinceRideRef = useRef(0);
  const [iterated, setIterated] = useState(false);
  const [spinOutsTotal, setSpinOutsTotal] = useState(0);
  const [targetsMet, setTargetsMet] = useState<Set<string>>(new Set());
  const cleanStreakRef = useRef(0);
  const bestCleanStreakRef = useRef(0);

  // Overlays
  const [announce, setAnnounce] = useState<PieceType[]>([]);
  const [showIdeas, setShowIdeas] = useState(false);
  const [pendingPattern, setPendingPattern] = useState<string | null>(null);
  const [showNamePicker, setShowNamePicker] = useState(!draft);
  const [reflect, setReflect] = useState<ReflectPrompt | null>(null);
  const [targetJustMet, setTargetJustMet] = useState<string | null>(null);

  // Save state
  const [creationId, setCreationId] = useState<string | null>(
    draft?.creationId ?? null,
  );
  const [courseId, setCourseId] = useState<string | null>(null);
  const [existingTitles, setExistingTitles] = useState<string[]>([]);
  const [saveNote, setSaveNote] = useState<"saved" | "savedLocal" | null>(null);
  const [shared, setShared] = useState(false);

  const grid = DEFAULT_GRID;
  const unlocked = unlockedPieceTypes(ridesCompleted);
  const newPieceCandidatesRef = useRef<Set<PieceType>>(new Set());

  const content: RaceTrackContent = useMemo(
    () => ({
      v: 1,
      name:
        name ||
        `${pickLocale<string>(NAME_KIT_ADJECTIVES[0].label, "Super")} ${pickLocale<string>(NAME_KIT_NOUNS[0].label, "Track")}`,
      grid,
      pieces,
    }),
    [name, grid, pieces],
  );
  const validation = useMemo(() => validateRaceTrackContent(content), [content]);
  const rideable = validation.ok;

  // ── Group context (for saving to the gallery) ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const courses = (await api.get("/student/courses")) as
          | { id: string }[]
          | { courses?: { id: string }[] };
        const list = Array.isArray(courses) ? courses : (courses.courses ?? []);
        if (!cancelled && list.length > 0) {
          setCourseId(list[0].id);
          try {
            const creations = (await api.get(
              `/creations?courseId=${list[0].id}`,
            )) as { type: string; title: string | null }[];
            if (!cancelled) {
              setExistingTitles(
                creations
                  .filter((c) => c.type === "race_track")
                  .map((c) => c.title ?? ""),
              );
            }
          } catch {
            /* gallery list is a nice-to-have for the dup-name guard */
          }
        }
      } catch {
        /* no course → local-only mode; building still works */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persistence ──
  const latestRef = useRef({ name, pieces, creationId, ridesCompleted });
  latestRef.current = { name, pieces, creationId, ridesCompleted };

  const persistLocal = useCallback(() => {
    const s = latestRef.current;
    persistDraft({
      name: s.name,
      pieces: s.pieces,
      creationId: s.creationId,
      ridesCompleted: s.ridesCompleted,
    });
  }, []);

  useEffect(() => {
    persistLocal();
  }, [pieces, name, creationId, ridesCompleted, persistLocal]);
  // Autosave on navigate-away (unmount): local always; server if rideable.
  useEffect(() => {
    return () => {
      persistLocal();
      void saveToServerRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Saves the CURRENT track in place (never forks): first save POSTs a new
   *  Creation, every later save PATCHes the same row. Returns the creation
   *  id on server success, null when the save stayed local-only. */
  const saveToServer = useCallback(async (): Promise<string | null> => {
    const s = latestRef.current;
    const c: RaceTrackContent = { v: 1, name: content.name, grid, pieces: s.pieces };
    if (!validateRaceTrackContent(c).ok || !courseId) {
      setSaveNote("savedLocal");
      return null;
    }
    try {
      if (s.creationId) {
        await api.patch(`/creations/${s.creationId}`, { content: c });
        setSaveNote("saved");
        return s.creationId;
      }
      const created = (await api.post("/creations", {
        courseId,
        type: "race_track",
        content: c,
      })) as { id: string };
      setCreationId(created.id);
      setSaveNote("saved");
      return created.id;
    } catch {
      // Server said no (e.g. offline) — the local draft still has everything.
      setSaveNote("savedLocal");
      return null;
    }
  }, [api, content.name, courseId, grid]);
  const saveToServerRef = useRef(saveToServer);
  saveToServerRef.current = saveToServer;

  useEffect(() => {
    if (!saveNote) return;
    const id = setTimeout(() => setSaveNote(null), 2000);
    return () => clearTimeout(id);
  }, [saveNote]);

  // ── Build actions ──
  const editPiece = useCallback(
    (x: number, y: number) => {
      setHintCell(null);
      const at = pieces.find((p) => p.x === x && p.y === y);
      if (at) {
        if (at.type === "start") return; // the start is anchored
        if (tool === "erase") {
          setPieces((prev) => prev.filter((p) => !(p.x === x && p.y === y)));
        } else {
          // Tapping any placed piece rotates it — one predictable rule.
          setPieces((prev) =>
            prev.map((p) =>
              p.x === x && p.y === y
                ? { ...p, rot: (((p.rot + 90) % 360) as Rot) }
                : p,
            ),
          );
        }
      } else {
        if (tool === "erase" || !unlocked.includes(tool)) return;
        setPieces((prev) => [...prev, { x, y, type: tool, rot: 0 as Rot }]);
      }
      setTweaks((n) => n + 1);
      tweaksSinceRideRef.current += 1;
    },
    [pieces, tool, unlocked],
  );

  const applyPattern = useCallback(
    (patternId: string) => {
      const pattern = PATTERN_BOOK.find((p) => p.id === patternId);
      if (!pattern) return;
      setPieces(pattern.pieces.map((p) => ({ ...p })));
      setTweaks((n) => n + 1);
      tweaksSinceRideRef.current += 1;
      setPendingPattern(null);
      setShowIdeas(false);
    },
    [],
  );

  // ── Ride ──
  const [ridePath, setRidePath] = useState<TrackPiece[] | null>(null);
  const [rideSnap, setRideSnap] = useState<RideState>(initialRideState());
  const [rideMsg, setRideMsg] = useState<"spinOut" | "wobble" | null>(null);
  const rideRef = useRef<RideState>(initialRideState());
  const leaningRef = useRef(false);
  const pausedUntilRef = useRef(0);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const rideDoneRef = useRef(false);

  const startRide = useCallback(() => {
    const walk = walkTrack({ grid, pieces });
    if (!walk.ok) {
      if (walk.at) setHintCell(walk.at);
      return;
    }
    void saveToServer();
    setRidePath(walk.path);
    rideRef.current = initialRideState();
    setRideSnap(rideRef.current);
    setRideMsg(null);
    rideDoneRef.current = false;
    leaningRef.current = false;
    pausedUntilRef.current = 0;
    lastTsRef.current = 0;
    setScreen("ride");
  }, [grid, pieces, saveToServer]);

  const finishRide = useCallback(() => {
    const state = rideRef.current;
    const path = ridePath ?? [];
    const before = ridesCompleted;
    const after = before + 1;
    setRidesCompleted(after);

    // Unlock announcements (one completed ride per unlock; spin-outs never gate)
    const fresh = newlyUnlocked(before, after);
    if (fresh.length > 0) {
      setAnnounce((q) => [...q, ...fresh]);
      fresh.forEach((p) => newPieceCandidatesRef.current.add(p));
    }

    // Clean streak (client-only feel-good stat, never a ranking)
    if (state.spinOuts === 0) {
      cleanStreakRef.current += 1;
      bestCleanStreakRef.current = Math.max(
        bestCleanStreakRef.current,
        cleanStreakRef.current,
      );
    } else {
      cleanStreakRef.current = 0;
    }
    setSpinOutsTotal((n) => n + state.spinOuts);

    // Iteration = tweaked after a previous ride, then completed another
    if (before > 0 && tweaksSinceRideRef.current > 0) setIterated(true);
    tweaksSinceRideRef.current = 0;

    // Soft targets (suggestions, never requirements)
    const ctx = { path, boostsHit: state.boostsHit, piecesOnTrack: pieces.length };
    const newlyMet = SOFT_TARGETS.filter(
      (target) => !targetsMet.has(target.id) && target.met(ctx),
    ).map((target) => target.id);
    if (newlyMet.length > 0) {
      setTargetsMet((prev) => new Set([...prev, ...newlyMet]));
    }
    setTargetJustMet(newlyMet[0] ?? null);

    // Context-aware Reflect prompt
    let newPieceRidden: PieceType | undefined;
    for (const p of path) {
      if (newPieceCandidatesRef.current.has(p.type)) {
        newPieceRidden = p.type;
        newPieceCandidatesRef.current.delete(p.type);
        break;
      }
    }
    setReflect(
      pickReflectPrompt({
        spinOuts: state.spinOuts,
        boostsHit: state.boostsHit,
        newPieceRidden,
      }),
    );
  }, [pieces.length, ridePath, ridesCompleted, targetsMet]);

  useEffect(() => {
    if (screen !== "ride" || !ridePath) return;
    const tol = CURVE_TOLERANCE[band];
    const loop = (ts: number) => {
      if (rideDoneRef.current) return;
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      if (ts >= pausedUntilRef.current) {
        const { state, events } = stepRide(
          rideRef.current,
          ridePath,
          dt,
          leaningRef.current,
          tol,
        );
        rideRef.current = state;
        setRideSnap(state);
        if (events.spunOut) {
          setRideMsg("spinOut");
          pausedUntilRef.current = ts + (reducedEffects ? 800 : 1400);
        } else if (events.wobbled) {
          setRideMsg("wobble");
        } else if (events.entered) {
          setRideMsg(null);
        }
        if (events.finished) {
          rideDoneRef.current = true;
          finishRide();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [screen, ridePath, band, reducedEffects, finishRide]);

  // Keyboard: hold Space/ArrowDown to lean (mouse users get the button)
  useEffect(() => {
    if (screen !== "ride") return;
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowDown") {
        e.preventDefault();
        leaningRef.current = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowDown") leaningRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [screen]);

  // ── Finish the whole session ──
  const done = useCallback(() => {
    onFinish(
      buildTrackMakerResult({
        rideable,
        ridesCompleted,
        iterated,
        targetsMet: targetsMet.size,
        bestCleanStreak: bestCleanStreakRef.current,
        spinOuts: spinOutsTotal,
        tweaks,
        sharedToGallery: shared,
      }),
    );
  }, [
    onFinish,
    rideable,
    ridesCompleted,
    iterated,
    targetsMet,
    spinOutsTotal,
    tweaks,
    shared,
  ]);

  const shareToGallery = useCallback(async () => {
    const id = latestRef.current.creationId ?? (await saveToServer());
    if (!id) return;
    try {
      await api.patch(`/creations/${id}`, { status: "COMPLETE" });
      setShared(true);
    } catch {
      /* stays unshared; button remains available */
    }
  }, [api, saveToServer]);

  const applyName = useCallback(
    (adjLabel: string, nounLabel: string) => {
      const base = `${adjLabel} ${nounLabel}`;
      setName(suggestUniqueName(base, existingTitles));
      setShowNamePicker(false);
      if (latestRef.current.creationId) void saveToServer();
    },
    [existingTitles, saveToServer],
  );

  // ── Screens ──

  if (screen === "imagine") {
    return (
      <div className="flex flex-col items-center gap-6 text-center py-10 px-4">
        <div className="text-6xl" aria-hidden>🏍️</div>
        <h2 className="text-2xl font-bold text-slate-800">
          {t("games.trackMaker.imagine.prompt", {
            defaultValue: "What kind of track will you build — loopy, zoomy, twisty?",
          })}
        </h2>
        <p className="text-slate-600 max-w-md">
          {t("games.trackMaker.imagine.hint", {
            defaultValue: "Build a track for Boost's motorcycle, then ride it!",
          })}
        </p>
        <button
          type="button"
          onClick={() => setScreen("build")}
          className="min-h-14 px-10 rounded-full bg-green-600 text-white text-xl font-bold shadow-lg active:scale-95 touch-manipulation"
        >
          {t("games.trackMaker.imagine.start", { defaultValue: "Start building!" })}
        </button>
        <button
          type="button"
          onClick={() => {
            setScreen("build");
            setShowIdeas(true);
          }}
          className="min-h-11 px-6 rounded-full bg-white border-2 border-slate-300 text-slate-700 font-semibold active:scale-95 touch-manipulation"
        >
          {t("games.trackMaker.ideas.open", { defaultValue: "Show me ideas 📖" })}
        </button>
      </div>
    );
  }

  if (screen === "ride" && ridePath) {
    const pos = bikePosition(ridePath, rideSnap.pieceIndex, rideSnap.progress);
    const nextPiece = ridePath[rideSnap.pieceIndex + 1];
    const cellPct = 100 / grid.w;
    const tol = CURVE_TOLERANCE[band];
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Speed bar with the curve-safe zone marked */}
        <div className="w-full max-w-[520px] px-1">
          <div className="relative h-4 rounded-full bg-slate-200 overflow-hidden" aria-hidden>
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-[width] duration-75"
              style={{ width: `${Math.round(rideSnap.speed * 100)}%` }}
            />
            <div
              className="absolute inset-y-0 w-0.5 bg-slate-700"
              style={{ left: `${tol.sharpCurve * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-0.5">
            <span>{t("games.trackMaker.ride.lean", { defaultValue: "leaning" })}</span>
            {nextPiece?.type === "sharpCurve" && (
              <span className="font-bold text-amber-600" role="status">
                {t("games.trackMaker.ride.sharpAhead", { defaultValue: "Sharp curve ahead!" })}
              </span>
            )}
            {nextPiece?.type === "gentleCurve" && (
              <span className="font-semibold text-sky-600" role="status">
                {t("games.trackMaker.ride.curveAhead", { defaultValue: "Curve ahead" })}
              </span>
            )}
            <span>{t("games.trackMaker.ride.zoom", { defaultValue: "zooming" })}</span>
          </div>
        </div>

        {/* The track with the bike */}
        <div
          className="relative w-full max-w-[520px] rounded-2xl bg-emerald-100 p-1"
          style={{ aspectRatio: `${grid.w} / ${grid.h}` }}
        >
          {pieces.map((p) => (
            <div
              key={`${p.x},${p.y}`}
              className="absolute"
              style={{
                left: `${p.x * cellPct}%`,
                top: `${p.y * (100 / grid.h)}%`,
                width: `${cellPct}%`,
                height: `${100 / grid.h}%`,
              }}
            >
              <PieceTile piece={p} />
            </div>
          ))}
          <div
            className={`absolute text-2xl -translate-x-1/2 -translate-y-1/2 ${
              rideSnap.wobbling && !reducedEffects ? "shake" : ""
            }`}
            style={{
              left: `${((pos.x) / grid.w) * 100}%`,
              top: `${((pos.y) / grid.h) * 100}%`,
            }}
            aria-hidden
          >
            🏍️
          </div>
          {rideMsg === "spinOut" && (
            <div className="absolute inset-x-4 top-1/3 rounded-2xl bg-white/95 border-2 border-amber-300 p-3 text-center text-slate-800 font-semibold shadow-lg" role="status">
              {t("games.trackMaker.ride.spinOut", {
                defaultValue: "Whoa — too fast for that curve! Boost is okay. Try holding LEAN before the turn.",
              })}
            </div>
          )}
        </div>

        {/* THE one input */}
        <button
          type="button"
          onPointerDown={() => {
            leaningRef.current = true;
          }}
          onPointerUp={() => {
            leaningRef.current = false;
          }}
          onPointerLeave={() => {
            leaningRef.current = false;
          }}
          onPointerCancel={() => {
            leaningRef.current = false;
          }}
          className="w-full max-w-xs min-h-16 rounded-full bg-sky-600 text-white text-2xl font-extrabold shadow-lg active:scale-95 select-none touch-manipulation"
          aria-label={t("games.trackMaker.ride.holdToLean", {
            defaultValue: "Hold to lean into curves",
          })}
        >
          {t("games.trackMaker.ride.holdButton", { defaultValue: "HOLD to lean 🏍️" })}
        </button>
        {rideMsg === "wobble" && (
          <p className="text-amber-600 font-semibold" role="status">
            {t("games.trackMaker.ride.wobble", { defaultValue: "Wobbly! Just made it!" })}
          </p>
        )}

        {/* Reflect beat — a wondering question, separate from save/name */}
        {reflect && (
          <div className="fixed inset-0 z-40 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full text-center flex flex-col gap-4 shadow-2xl">
              <div className="text-4xl" aria-hidden>🏁</div>
              <h3 className="text-xl font-bold text-slate-800">
                {t("games.trackMaker.ride.finished", { defaultValue: "You finished your track!" })}
              </h3>
              <p className="text-slate-700 text-lg">{t(reflect.key, reflect.params)}</p>
              {targetJustMet && (
                <p className="text-green-700 font-semibold" role="status">
                  {t(`games.trackMaker.target.${targetJustMet}Met`, {
                    defaultValue: "You did it — that was one of the try-this ideas! ⭐",
                  })}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReflect(null);
                    setScreen("build");
                  }}
                  className="min-h-12 rounded-full bg-green-600 text-white font-bold text-lg active:scale-95 touch-manipulation"
                >
                  {t("games.trackMaker.ride.tweak", { defaultValue: "Tweak my track 🔧" })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReflect(null);
                    startRide();
                  }}
                  className="min-h-12 rounded-full bg-sky-600 text-white font-bold text-lg active:scale-95 touch-manipulation"
                >
                  {t("games.trackMaker.ride.again", { defaultValue: "Ride again 🏍️" })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReflect(null);
                    done();
                  }}
                  className="min-h-11 rounded-full bg-white border-2 border-slate-300 text-slate-700 font-semibold active:scale-95 touch-manipulation"
                >
                  {t("games.trackMaker.ride.done", { defaultValue: "Done for now" })}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Build screen ──
  const currentTarget = SOFT_TARGETS.find((s) => !targetsMet.has(s.id));
  const displayName =
    name ||
    t("games.trackMaker.build.unnamed", { defaultValue: "My Track" });

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Top bar: the current track's name is always visible */}
      <div className="w-full max-w-[520px] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowNamePicker(true)}
          className="min-h-11 px-4 rounded-full bg-white border-2 border-slate-300 font-bold text-slate-800 active:scale-95 touch-manipulation"
          aria-label={t("games.trackMaker.build.renameAria", {
            defaultValue: "Track name — tap to change",
          })}
        >
          🏷️ {displayName}
        </button>
        <div className="flex items-center gap-2">
          {saveNote && (
            <span className="text-xs text-slate-500" role="status">
              {saveNote === "saved"
                ? t("games.trackMaker.build.saved", { defaultValue: "Saved ✓" })
                : t("games.trackMaker.build.savedLocal", {
                    defaultValue: "Saved on this device ✓",
                  })}
            </span>
          )}
          <button
            type="button"
            onClick={() => void saveToServer()}
            className="min-h-11 px-4 rounded-full bg-white border-2 border-slate-300 font-semibold text-slate-700 active:scale-95 touch-manipulation"
          >
            {t("games.trackMaker.build.save", { defaultValue: "Save" })}
          </button>
        </div>
      </div>

      {/* Soft target — a suggestion, never a requirement */}
      {currentTarget && (
        <p className="text-sm text-slate-600" role="status">
          💡{" "}
          {t(`games.trackMaker.target.${currentTarget.id}`, {
            defaultValue: "Try this: can you build a track with 2 curves the bike survives?",
          })}
        </p>
      )}

      {/* The build grid */}
      <div
        className="grid w-full max-w-[520px] gap-0.5 rounded-2xl bg-emerald-100 p-1 touch-manipulation"
        style={{ gridTemplateColumns: `repeat(${grid.w}, minmax(0, 1fr))` }}
        role="group"
        aria-label={t("games.trackMaker.build.gridAria", {
          defaultValue: "Track building grid",
        })}
      >
        {Array.from({ length: grid.w * grid.h }, (_, i) => {
          const x = i % grid.w;
          const y = Math.floor(i / grid.w);
          const piece = pieces.find((p) => p.x === x && p.y === y);
          const isHint = hintCell?.x === x && hintCell?.y === y;
          return (
            <button
              key={i}
              type="button"
              onClick={() => editPiece(x, y)}
              className={`relative aspect-square min-w-11 min-h-11 rounded-md bg-emerald-50/70 active:scale-95 touch-manipulation ${
                isHint ? "ring-4 ring-amber-400" : ""
              }`}
              aria-label={
                piece
                  ? t("games.trackMaker.build.cellPieceAria", {
                      defaultValue: "{{piece}} — tap to turn it",
                      piece: t(PALETTE_LABEL_KEYS[piece.type].key, {
                        defaultValue: PALETTE_LABEL_KEYS[piece.type].en,
                      }),
                    })
                  : t("games.trackMaker.build.cellEmptyAria", {
                      defaultValue: "Empty spot — tap to place a piece",
                    })
              }
            >
              {piece && <PieceTile piece={piece} />}
            </button>
          );
        })}
      </div>
      {hintCell && (
        <p className="text-amber-700 font-semibold" role="status">
          {t("games.trackMaker.build.brokenHint", {
            defaultValue: "The road ends at the glowing spot — connect it!",
          })}
        </p>
      )}

      {/* Palette */}
      <div className="flex flex-wrap justify-center gap-2 w-full max-w-[520px]">
        {[...unlocked, "erase" as const].map((p) => {
          const isErase = p === "erase";
          const selected = tool === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setTool(p)}
              aria-pressed={selected}
              className={`flex flex-col items-center justify-center min-w-16 min-h-16 rounded-2xl border-2 p-1 active:scale-95 touch-manipulation ${
                selected
                  ? "border-sky-500 bg-sky-50"
                  : "border-slate-200 bg-white"
              }`}
              aria-label={
                isErase
                  ? t("games.trackMaker.piece.erase", { defaultValue: "Eraser" })
                  : t(PALETTE_LABEL_KEYS[p].key, {
                      defaultValue: PALETTE_LABEL_KEYS[p].en,
                    })
              }
            >
              <span className="w-9 h-9 block">
                {isErase ? (
                  <span className="text-2xl" aria-hidden>🧽</span>
                ) : (
                  <PieceSvg type={p} />
                )}
              </span>
              <span className="text-[10px] font-semibold text-slate-600">
                {isErase
                  ? t("games.trackMaker.piece.erase", { defaultValue: "Eraser" })
                  : t(PALETTE_LABEL_KEYS[p].key, {
                      defaultValue: PALETTE_LABEL_KEYS[p].en,
                    })}
              </span>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-2 w-full max-w-[520px]">
        {/* Always tappable: when the track isn't rideable yet, tapping points
            kindly at the broken spot instead of a dead disabled button. */}
        <button
          type="button"
          onClick={startRide}
          className={`min-h-14 px-8 rounded-full text-xl font-extrabold shadow-lg active:scale-95 touch-manipulation ${
            rideable
              ? "bg-green-600 text-white"
              : "bg-slate-200 text-slate-500"
          }`}
        >
          {t("games.trackMaker.build.ride", { defaultValue: "Ride! 🏍️" })}
        </button>
        <button
          type="button"
          onClick={() => setShowIdeas(true)}
          className="min-h-11 px-5 rounded-full bg-white border-2 border-slate-300 text-slate-700 font-semibold active:scale-95 touch-manipulation"
        >
          {t("games.trackMaker.ideas.open", { defaultValue: "Show me ideas 📖" })}
        </button>
        {ridesCompleted > 0 && creationId && !shared && (
          <button
            type="button"
            onClick={() => void shareToGallery()}
            className="min-h-11 px-5 rounded-full bg-violet-600 text-white font-semibold active:scale-95 touch-manipulation"
          >
            {t("games.trackMaker.build.share", { defaultValue: "Share to gallery ✨" })}
          </button>
        )}
        {shared && (
          <span className="min-h-11 px-4 inline-flex items-center text-violet-700 font-semibold" role="status">
            {t("games.trackMaker.build.sharedNote", { defaultValue: "In the gallery! ✨" })}
          </span>
        )}
        {ridesCompleted > 0 && (
          <button
            type="button"
            onClick={done}
            className="min-h-11 px-5 rounded-full bg-white border-2 border-slate-300 text-slate-700 font-semibold active:scale-95 touch-manipulation"
          >
            {t("games.trackMaker.build.done", { defaultValue: "Done for now" })}
          </button>
        )}
      </div>

      {/* Unlock announce beat — scaffolding must announce itself */}
      {announce.length > 0 && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center flex flex-col gap-4 shadow-2xl bounce-in">
            <div className="text-5xl" aria-hidden>🎉</div>
            <h3 className="text-xl font-bold text-slate-800" role="status">
              {t(`games.trackMaker.unlock.${announce[0]}`, {
                defaultValue: "You earned a new piece: {{piece}}!",
                piece: t(PALETTE_LABEL_KEYS[announce[0]].key, {
                  defaultValue: PALETTE_LABEL_KEYS[announce[0]].en,
                }),
              })}
            </h3>
            <div className="w-16 h-16 mx-auto">
              <PieceSvg type={announce[0]} />
            </div>
            <button
              type="button"
              onClick={() => {
                setTool(announce[0]);
                setAnnounce((q) => q.slice(1));
              }}
              className="min-h-12 rounded-full bg-green-600 text-white font-bold text-lg active:scale-95 touch-manipulation"
            >
              {t("games.trackMaker.unlock.tryIt", { defaultValue: "Tap to try it!" })}
            </button>
          </div>
        </div>
      )}

      {/* Pattern book — examples show possibility, never dictate */}
      {showIdeas && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 text-center">
              {t("games.trackMaker.ideas.title", { defaultValue: "Track ideas 📖" })}
            </h3>
            <div className="flex flex-col gap-2">
              {PATTERN_BOOK.map((pattern) => (
                <div
                  key={pattern.id}
                  className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 p-2"
                >
                  <svg viewBox="0 0 48 48" className="w-12 h-12 shrink-0" aria-hidden>
                    <polyline
                      points={trackToPolylinePoints(pattern, 48)}
                      fill="none"
                      stroke={ROAD}
                      strokeWidth={5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="flex-1 font-semibold text-slate-700">
                    {pickLocale(pattern.name, pattern.name.en ?? pattern.id)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      pendingPattern === pattern.id
                        ? applyPattern(pattern.id)
                        : setPendingPattern(pattern.id)
                    }
                    className={`min-h-11 px-4 rounded-full font-semibold active:scale-95 touch-manipulation ${
                      pendingPattern === pattern.id
                        ? "bg-amber-500 text-white"
                        : "bg-sky-600 text-white"
                    }`}
                  >
                    {pendingPattern === pattern.id
                      ? t("games.trackMaker.ideas.confirm", {
                          defaultValue: "Replace my track?",
                        })
                      : t("games.trackMaker.ideas.use", { defaultValue: "Build from this" })}
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowIdeas(false);
                setPendingPattern(null);
              }}
              className="min-h-11 rounded-full bg-white border-2 border-slate-300 text-slate-700 font-semibold active:scale-95 touch-manipulation"
            >
              {t("games.trackMaker.ideas.close", { defaultValue: "Keep my track" })}
            </button>
          </div>
        </div>
      )}

      {/* Name kit — structured choices, no free text */}
      {showNamePicker && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 flex items-center justify-center p-4">
          <NamePicker
            onPick={applyName}
            onClose={() => setShowNamePicker(false)}
          />
        </div>
      )}
    </div>
  );
}

function NamePicker({
  onPick,
  onClose,
}: {
  onPick: (adj: string, noun: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [adj, setAdj] = useState(NAME_KIT_ADJECTIVES[0]);
  const [noun, setNoun] = useState(NAME_KIT_NOUNS[0]);
  return (
    <div className="bg-white rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl">
      <h3 className="text-xl font-bold text-slate-800 text-center">
        {t("games.trackMaker.name.title", { defaultValue: "Name your track!" })}
      </h3>
      <p className="text-center text-2xl font-extrabold text-sky-700" role="status">
        {pickLocale(adj.label, adj.label.en ?? "")}{" "}
        {pickLocale(noun.label, noun.label.en ?? "")}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {NAME_KIT_ADJECTIVES.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAdj(a)}
            aria-pressed={adj.id === a.id}
            className={`min-h-11 px-4 rounded-full border-2 font-semibold active:scale-95 touch-manipulation ${
              adj.id === a.id
                ? "border-sky-500 bg-sky-50 text-sky-800"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {pickLocale(a.label, a.label.en ?? a.id)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {NAME_KIT_NOUNS.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setNoun(n)}
            aria-pressed={noun.id === n.id}
            className={`min-h-11 px-4 rounded-full border-2 font-semibold active:scale-95 touch-manipulation ${
              noun.id === n.id
                ? "border-green-500 bg-green-50 text-green-800"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {pickLocale(n.label, n.label.en ?? n.id)}
          </button>
        ))}
      </div>
      <div className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={() =>
            onPick(
              pickLocale(adj.label, adj.label.en ?? adj.id),
              pickLocale(noun.label, noun.label.en ?? noun.id),
            )
          }
          className="min-h-12 px-8 rounded-full bg-green-600 text-white font-bold text-lg active:scale-95 touch-manipulation"
        >
          {t("games.trackMaker.name.keep", { defaultValue: "That's it!" })}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 px-5 rounded-full bg-white border-2 border-slate-300 text-slate-700 font-semibold active:scale-95 touch-manipulation"
        >
          {t("games.trackMaker.name.later", { defaultValue: "Later" })}
        </button>
      </div>
    </div>
  );
}

// ── Shell wrapper ───────────────────────────────────────────────────────────

export default function TrackMakerGame({
  config,
  onComplete,
}: {
  config?: unknown;
  onComplete?: (result: GameResult) => void;
}) {
  const band = getGradeBand(config);
  const briefing = useMemo(
    () => ({
      title: pickLocale(
        {
          en: "Boost Track Builder",
          es: "Constructor de Pistas de Boost",
        },
        "Boost Track Builder",
      ),
      story: pickLocale(
        {
          en: "Boost got a motorcycle — but there's no track to ride! Build one for Boost, then hop on. Too fast into a sharp curve and the bike wobbles… your design decides the ride!",
          es: "¡Boost tiene una moto, pero no hay pista! Construye una para Boost y súbete. Si entras muy rápido a una curva cerrada, la moto se tambalea… ¡tu diseño decide el paseo!",
        },
        "Boost got a motorcycle — but there's no track to ride! Build one for Boost, then hop on. Too fast into a sharp curve and the bike wobbles… your design decides the ride!",
      ),
      icon: "🏍️",
      tips: [
        pickLocale(
          {
            en: "Hold LEAN before sharp curves to slow down.",
            es: "Mantén INCLINAR antes de las curvas cerradas para frenar.",
          },
          "Hold LEAN before sharp curves to slow down.",
        ),
        pickLocale(
          {
            en: "Spin-outs are okay — they show you where to tweak your track!",
            es: "Los trompos están bien: ¡te muestran dónde mejorar tu pista!",
          },
          "Spin-outs are okay — they show you where to tweak your track!",
        ),
      ],
    }),
    [],
  );
  return (
    <GameShell
      gameKey="track_maker"
      title={briefing.title}
      briefing={briefing}
      onComplete={onComplete ?? (() => {})}
      formatBest={(b) => `⭐ ${b.bestScore}/6`}
    >
      {({ onFinish, reducedEffects }) => (
        <TrackMakerCore
          onFinish={onFinish}
          reducedEffects={reducedEffects}
          band={band}
        />
      )}
    </GameShell>
  );
}
