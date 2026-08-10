/**
 * 都江堰水利工坊 · Waterworks — standalone showcase game (design:
 * docs/games/waterworks-design.md; sim rules in ./waterworksSim.ts).
 *
 * ISOLATION CONTRACT: no auth, no API calls, no backend anywhere. All
 * persistence is device-local (./waterworksStorage.ts). This component is
 * deliberately NOT wired into GameShell/modules/Creations — its permanent
 * placement (#676 Set 3 candidacy) is decided later, so relocating it must
 * never require unwinding integrations.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./waterworks.css";
import {
  FRESH_PROGRESS,
  PATTERN_BOOK,
  TICKS_PER_RUN,
  TICK_MS,
  advanceProgress,
  applyPattern,
  completeMetTargets,
  currentTarget,
  freshGrid,
  newlyUnlockedParts,
  patternIsAvailable,
  pickWonder,
  shouldInviteStorm,
  simulateTick,
  tapCell,
  unlockedParts,
  type Band,
  type Cell,
  type PartType,
  type Progress,
  type RiverPattern,
  type RunStats,
  type Tool,
  type WonderPrompt,
} from "./waterworksSim";
import {
  loadDraft,
  loadGallery,
  loadSeen,
  newRiverId,
  restoreCells,
  saveDraft,
  saveRiver,
  saveSeen,
  snapshotCells,
  uniqueName,
  type SavedRiver,
  type SeenFlags,
} from "./waterworksStorage";

// ── Part & cell presentation ────────────────────────────────────────────────

const PART_ICON: Record<PartType, string> = {
  channel: "🟦",
  gate: "🚪",
  fishmouth: "🐟",
  sandweir: "⛲",
  bottleneck: "🍾",
  field: "🌱",
};

const HERITAGE_PARTS: PartType[] = ["fishmouth", "sandweir", "bottleneck"];

const WATER_COLORS = ["", "#cdeffb", "#8fd6f4", "#41b2ec", "#1d7ccf"];

function cellVisual(cell: Cell): { bg: string; icon: string } {
  switch (cell.type) {
    case "land":
      return { bg: "#ece0c2", icon: "" };
    case "source":
      return { bg: "#2bb3a3", icon: "🚰" };
    case "house":
      return { bg: cell.flooded ? "#134f97" : "#d8c39a", icon: "🏠" };
    case "field":
      return {
        bg: cell.flooded ? "#134f97" : cell.watered ? "#79c563" : "#dcb87e",
        icon: cell.flooded ? "🌊" : cell.watered ? "🌾" : "🌱",
      };
    case "gate":
      if (!cell.gateOpen) return { bg: "#b7895a", icon: "🚧" };
      return {
        bg: cell.water > 0 ? WATER_COLORS[cell.water] : "#b7ccd6",
        icon: "🚪",
      };
    default: {
      const icon =
        cell.type === "fishmouth"
          ? "🐟"
          : cell.type === "sandweir"
            ? "⛲"
            : cell.type === "bottleneck"
              ? "🍾"
              : "";
      return {
        bg: cell.water > 0 ? WATER_COLORS[cell.water] : "#b7ccd6",
        icon,
      };
    }
  }
}

function thumbColor(t: string): string {
  switch (t) {
    case "source":
      return "#2bb3a3";
    case "house":
      return "#a98c5f";
    case "channel":
      return "#41b2ec";
    case "gate":
      return "#b7895a";
    case "fishmouth":
      return "#56c2ef";
    case "sandweir":
      return "#7fb0d6";
    case "bottleneck":
      return "#e98a3c";
    case "field":
      return "#79c563";
    default:
      return "#ece0c2";
  }
}

// ── Screens ─────────────────────────────────────────────────────────────────

type Screen = "title" | "build" | "gallery";

function upsertRiver(list: SavedRiver[], river: SavedRiver): SavedRiver[] {
  const next = list.slice();
  const index = next.findIndex((entry) => entry.id === river.id);
  if (index >= 0) next[index] = river;
  else next.push(river);
  return next;
}

function mergeGallery(
  persisted: SavedRiver[],
  volatile: SavedRiver[],
): SavedRiver[] {
  return volatile.reduce(upsertRiver, persisted);
}

export default function WaterworksGame() {
  const { t } = useTranslation();

  // ---- persistent-ish state, restored from the on-device draft ----
  const initialDraft = useMemo(loadDraft, []);
  const [screen, setScreen] = useState<Screen>(
    initialDraft ? "build" : "title",
  );
  const [hasActiveBuild, setHasActiveBuild] = useState(!!initialDraft);
  const [band, setBand] = useState<Band>(initialDraft?.band ?? "k2");
  const [grid, setGrid] = useState<Cell[][]>(() =>
    initialDraft ? restoreCells(initialDraft.cells) : freshGrid("k2"),
  );
  const [progress, setProgress] = useState<Progress>(
    initialDraft?.progress ?? FRESH_PROGRESS,
  );
  const [currentId, setCurrentId] = useState<string | null>(
    initialDraft?.id ?? null,
  );
  const [name, setName] = useState<string>(initialDraft?.name ?? "");
  const [gallery, setGallery] = useState<SavedRiver[]>(() => loadGallery());
  const [seen, setSeen] = useState<SeenFlags>(() => loadSeen());

  // ---- session state ----
  const [tool, setTool] = useState<Tool>("channel");
  const [raining, setRaining] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<RunStats | null>(null);
  const [dismissedTargets, setDismissedTargets] = useState<Set<string>>(
    new Set(),
  );

  // ---- overlays ----
  const [wonder, setWonder] = useState<WonderPrompt | null>(null);
  const [targetJustMet, setTargetJustMet] = useState(false);
  const [announceQueue, setAnnounceQueue] = useState<PartType[]>([]);
  const [heritagePart, setHeritagePart] = useState<PartType | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showPatterns, setShowPatterns] = useState(false);
  const [pendingPattern, setPendingPattern] = useState<string | null>(null);
  const [showNameCard, setShowNameCard] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [saveNote, setSaveNote] = useState<"saved" | "local" | "draft" | null>(
    null,
  );
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [boardViewRevision, setBoardViewRevision] = useState(0);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const hasActiveBuildRef = useRef(!!initialDraft);
  const galleryOriginRef = useRef<"title" | "build">(
    initialDraft ? "build" : "title",
  );
  const volatileGalleryRef = useRef<SavedRiver[]>([]);

  const unlocked = unlockedParts(band, progress);
  const newPartCandidatesRef = useRef<Set<PartType>>(new Set());

  // ---- draft autosave: on every meaningful change + on unmount ----
  const latestRef = useRef({ grid, name, band, progress, currentId });
  latestRef.current = { grid, name, band, progress, currentId };
  const structuralGridKey = useMemo(
    () => JSON.stringify(snapshotCells(grid)),
    [grid],
  );
  const persistDraft = useCallback(() => {
    const s = latestRef.current;
    return saveDraft({
      id: s.currentId,
      name: s.name,
      band: s.band,
      cells: snapshotCells(s.grid),
      progress: s.progress,
    });
  }, []);
  useEffect(() => {
    if (screen === "build" && hasActiveBuild && !persistDraft())
      setSaveNote((note) => (note === "local" ? note : "draft"));
  }, [
    structuralGridKey,
    name,
    band,
    progress,
    currentId,
    persistDraft,
    screen,
    hasActiveBuild,
  ]);
  useEffect(
    () => () => {
      if (hasActiveBuildRef.current) persistDraft();
    },
    [persistDraft],
  );

  useEffect(() => {
    if (!saveNote) return;
    const id = setTimeout(() => setSaveNote(null), 2500);
    return () => clearTimeout(id);
  }, [saveNote]);

  // ── The run loop (16 ticks × 180 ms; flood accumulation for stats) ────────
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const rafRef = useRef(0);
  const runningRef = useRef(false);

  const stopFlow = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    cancelAnimationFrame(rafRef.current);
  }, []);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const markSeen = useCallback((patch: SeenFlags) => {
    setSeen((prev) => {
      const next = { ...prev, ...patch };
      saveSeen(next);
      return next;
    });
  }, []);

  const finishRun = useCallback(
    (
      finalGrid: Cell[][],
      floodedFields: Set<string>,
      floodedHouses: Set<string>,
      stormTested: boolean,
    ) => {
      const stats: RunStats = {
        fieldsWatered: finalGrid
          .flat()
          .filter((cell) => cell.type === "field" && cell.watered).length,
        fieldsPlaced: finalGrid.flat().filter((cell) => cell.type === "field")
          .length,
        fieldsFloodedEver: floodedFields.size,
        housesFloodedEver: floodedHouses.size,
        stormTested,
        fishmouthUsed: finalGrid
          .flat()
          .some((cell) => cell.type === "fishmouth" && cell.water > 0),
        anyFlood: floodedFields.size > 0 || floodedHouses.size > 0,
      };
      const before = latestRef.current.progress;
      // The unlock ladder and storm-invite counter belong only to Guided.
      // Playing an older band must never silently pre-unlock K–2 parts.
      const ladderAfter =
        band === "k2" ? advanceProgress(before, stats) : before;

      // Evaluate the suggestion that was visible BEFORE this run, then store
      // completion so a later experiment cannot make the achieved target
      // reappear.
      const suggested = currentTarget(band, before, lastRun, dismissedTargets);
      const metSuggested = !!suggested && suggested.met(ladderAfter, stats);
      const after = completeMetTargets(band, ladderAfter, stats);
      setProgress(after);
      setLastRun(stats);

      // Unlocks announce themselves (never silently) — queued before Reflect.
      const fresh = newlyUnlockedParts(band, before, after);
      if (fresh.length > 0) {
        setAnnounceQueue((q) => [...q, ...fresh]);
        fresh.forEach((part) => newPartCandidatesRef.current.add(part));
      }

      // A just-unlocked part ridden by water for the first time?
      let newPartUsed: PartType | undefined;
      for (const part of newPartCandidatesRef.current) {
        if (
          finalGrid.some((row) =>
            row.some((cell) => cell.type === part && cell.water > 0),
          )
        ) {
          newPartUsed = part;
          newPartCandidatesRef.current.delete(part);
          break;
        }
      }

      // Did this run meet the target we were suggesting? (celebrate, softly)
      setTargetJustMet(metSuggested);

      // The first-run flow arrow is consumed only by a completed Guided run.
      if (band === "k2") markSeen({ flowArrow: true });

      // Reflect — ONE wondering question; a separate beat from save/naming.
      setWonder(
        pickWonder({
          stats,
          newPartUsed,
          inviteStorm: shouldInviteStorm(band, after),
        }),
      );
    },
    [band, dismissedTargets, lastRun, markSeen],
  );

  const runFlow = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    const stormTested = raining;

    // reset water, then tick on a fixed clock
    let g = gridRef.current.map((row) =>
      row.map((cell) => ({
        ...cell,
        water: 0,
        wTicks: 0,
        watered: false,
        flooded: false,
        draining: false,
      })),
    );
    setGrid(g);
    const floodedFields = new Set<string>();
    const floodedHouses = new Set<string>();
    let tick = 0;
    let last: number | null = null;
    let acc = 0;
    const frame = (now: number) => {
      if (!runningRef.current) return;
      if (last === null) last = now;
      acc += now - last;
      last = now;
      while (acc >= TICK_MS && tick < TICKS_PER_RUN) {
        acc -= TICK_MS;
        g = simulateTick(g, raining);
        for (let r = 0; r < g.length; r++)
          for (let c = 0; c < g[r].length; c++) {
            const cell = g[r][c];
            if (cell.flooded && cell.type === "field")
              floodedFields.add(`${r},${c}`);
            if (cell.flooded && cell.type === "house")
              floodedHouses.add(`${r},${c}`);
          }
        setGrid(g);
        tick++;
      }
      if (tick >= TICKS_PER_RUN) {
        stopFlow();
        finishRun(g, floodedFields, floodedHouses, stormTested);
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [finishRun, raining, stopFlow]);

  // ── Save model (design §5): save-in-place, autosave, dup guard ────────────
  const currentGallery = useCallback(
    () => mergeGallery(loadGallery(), volatileGalleryRef.current),
    [],
  );
  const refreshGallery = useCallback(
    () => setGallery(currentGallery()),
    [currentGallery],
  );

  const persistRiver = useCallback(
    (riverName: string): boolean => {
      const s = latestRef.current;
      const id = s.currentId ?? newRiverId();
      const river: SavedRiver = {
        id,
        name: riverName,
        band: s.band,
        cells: snapshotCells(s.grid),
        savedAt: Date.now(),
      };
      const ok = saveRiver(river);
      if (ok) {
        volatileGalleryRef.current = volatileGalleryRef.current.filter(
          (entry) => entry.id !== id,
        );
      } else {
        volatileGalleryRef.current = upsertRiver(
          volatileGalleryRef.current,
          river,
        );
      }
      // Keep callback reads coherent before React flushes these updates.
      // Navigation may persist the draft in the same event as this save.
      latestRef.current = { ...s, currentId: id, name: riverName };
      setCurrentId(id);
      setName(riverName);
      refreshGallery();
      setSaveNote(ok ? "saved" : "local");
      return ok;
    },
    [refreshGallery],
  );

  const defaultName = t("waterworks.build.defaultName", {
    defaultValue: "New River",
  });

  const onSaveTap = useCallback(() => {
    if (!latestRef.current.name) {
      setNameInput("");
      setShowNameCard(true);
      return;
    }
    persistRiver(latestRef.current.name);
  }, [persistRiver]);

  const confirmName = useCallback(() => {
    const base = nameInput.trim() || defaultName;
    persistRiver(
      uniqueName(base, currentGallery(), latestRef.current.currentId),
    );
    setShowNameCard(false);
  }, [currentGallery, defaultName, nameInput, persistRiver]);

  /** "Nothing is lost": before anything replaces the working build, an
   *  unnamed-but-meaningful river is quietly saved under a default name. */
  const quietSaveIfMeaningful = useCallback(() => {
    const s = latestRef.current;
    if (s.currentId || s.name) {
      if (s.currentId) persistRiver(s.name || defaultName);
      return;
    }
    const meaningful =
      JSON.stringify(snapshotCells(s.grid)) !==
      JSON.stringify(snapshotCells(freshGrid(s.band)));
    if (meaningful)
      persistRiver(uniqueName(defaultName, currentGallery(), null));
  }, [currentGallery, defaultName, persistRiver]);

  const activateBuild = useCallback(() => {
    hasActiveBuildRef.current = true;
    setHasActiveBuild(true);
    setBoardViewRevision((value) => value + 1);
  }, []);

  // ── Navigation (autosave on every navigate-away) ──────────────────────────
  const goTitle = useCallback(() => {
    stopFlow();
    if (hasActiveBuildRef.current) persistDraft();
    setScreen("title");
  }, [persistDraft, stopFlow]);

  const goGallery = useCallback(() => {
    stopFlow();
    galleryOriginRef.current = screen === "build" ? "build" : "title";
    if (screen === "build" && hasActiveBuildRef.current) {
      // Gallery entries are explicit shares. Navigation protects the working
      // draft but must not silently publish or overwrite a saved river.
      persistDraft();
    }
    refreshGallery();
    setScreen("gallery");
  }, [persistDraft, refreshGallery, screen, stopFlow]);

  const startBand = useCallback(
    (nextBand: Band) => {
      quietSaveIfMeaningful();
      setBand(nextBand);
      setGrid(freshGrid(nextBand));
      setCurrentId(null);
      setName("");
      setRaining(false);
      setLastRun(null);
      setTool("channel");
      newPartCandidatesRef.current.clear();
      activateBuild();
      setScreen("build");
      if (!seen.help) setShowHelp(true);
    },
    [activateBuild, quietSaveIfMeaningful, seen.help],
  );

  const openRiver = useCallback(
    (river: SavedRiver) => {
      // A card can represent an older explicit save of the river that is
      // still active in the working draft. Return to the live draft rather
      // than replacing it with that stale card snapshot.
      if (
        hasActiveBuildRef.current &&
        river.id === latestRef.current.currentId
      ) {
        activateBuild();
        setScreen("build");
        return;
      }
      quietSaveIfMeaningful();
      setBand(river.band);
      setGrid(restoreCells(river.cells));
      setCurrentId(river.id);
      setName(river.name);
      setRaining(false);
      setLastRun(null);
      setTool("channel");
      newPartCandidatesRef.current.clear();
      activateBuild();
      setScreen("build");
    },
    [activateBuild, quietSaveIfMeaningful],
  );

  const createFresh = useCallback(() => {
    quietSaveIfMeaningful();
    setGrid(freshGrid(band));
    setCurrentId(null);
    setName("");
    setRaining(false);
    setLastRun(null);
    setTool("channel");
    newPartCandidatesRef.current.clear();
    activateBuild();
    setScreen("build");
  }, [activateBuild, band, quietSaveIfMeaningful]);

  // ── Build actions ─────────────────────────────────────────────────────────
  const onCellTap = useCallback(
    (r: number, c: number) => {
      if (runningRef.current) return;
      const allowed = unlockedParts(band, latestRef.current.progress);
      const safeTool =
        tool === "erase" || allowed.includes(tool) ? tool : "channel";
      if (safeTool !== tool) setTool(safeTool);
      const before = gridRef.current;
      const after = tapCell(before, r, c, safeTool);
      if (after === before) return;
      setGrid(after);
      if (band === "k2" && !seen.placedArrow) markSeen({ placedArrow: true });
    },
    [band, markSeen, seen.placedArrow, tool],
  );

  const applyPatternById = useCallback(
    (pattern: RiverPattern) => {
      if (
        !patternIsAvailable(
          pattern,
          unlockedParts(band, latestRef.current.progress),
        )
      )
        return;
      setGrid(applyPattern(band, pattern));
      setPendingPattern(null);
      setShowPatterns(false);
    },
    [band],
  );

  const partLabel = useCallback(
    (part: PartType) =>
      t(`waterworks.part.${part}`, {
        defaultValue:
          part === "channel"
            ? "Channel 水渠"
            : part === "gate"
              ? "Gate 水闸"
              : part === "fishmouth"
                ? "Fish Mouth 鱼嘴"
                : part === "sandweir"
                  ? "Flying Sand Weir 飞沙堰"
                  : part === "bottleneck"
                    ? "Bottle-Neck 宝瓶口"
                    : "Field 农田",
      }),
    [t],
  );

  const target = currentTarget(band, progress, lastRun, dismissedTargets);

  // Phone cold-open (a primary pitch path): when the board overflows a
  // narrow viewport, start scrolled to the source + starter channel (the
  // water's origin must be the first thing seen) and show a one-time swipe
  // hint until the child scrolls or dismisses it.
  useEffect(() => {
    if (screen !== "build") return;
    const el = boardScrollRef.current;
    if (!el) return;
    el.scrollLeft = 0; // sources live in column 0 — anchor the story there
  }, [boardViewRevision, screen]);

  useEffect(() => {
    if (screen !== "build") return;
    const el = boardScrollRef.current;
    if (!el) return;
    if (seen.swipeHint) {
      setShowSwipeHint(false);
      return;
    }
    const syncHint = () => {
      setShowSwipeHint(el.scrollWidth > el.clientWidth + 8);
    };
    const dismiss = () => {
      setShowSwipeHint(false);
      markSeen({ swipeHint: true });
    };
    syncHint();
    el.addEventListener("scroll", dismiss, { once: true });
    window.addEventListener("resize", syncHint);
    return () => {
      el.removeEventListener("scroll", dismiss);
      window.removeEventListener("resize", syncHint);
    };
  }, [boardViewRevision, markSeen, screen, seen.swipeHint]);

  // ── Screens ───────────────────────────────────────────────────────────────

  if (screen === "title") {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-8 px-4">
        <div className="text-8xl ww-bob" aria-hidden>
          🦏
        </div>
        <h2 className="text-2xl font-extrabold text-[#3a2e22]">
          {t("waterworks.title.tagline", {
            defaultValue: "What will you build?",
          })}
        </h2>
        <p className="text-[#7d6c52] font-bold">
          {t("waterworks.title.pickLevel", { defaultValue: "Pick your level" })}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={() => startBand("k2")}
            className="min-h-14 rounded-2xl bg-teal-500 text-white text-xl font-extrabold shadow-[0_5px_0_#1d8a7d] active:translate-y-1 active:shadow-none touch-manipulation"
          >
            🐣 {t("waterworks.title.bandK2", { defaultValue: "K–2 · Guided" })}
          </button>
          <button
            type="button"
            onClick={() => startBand("g35")}
            className="min-h-14 rounded-2xl bg-orange-500 text-white text-xl font-extrabold shadow-[0_5px_0_#cf7126] active:translate-y-1 active:shadow-none touch-manipulation"
          >
            🌱 {t("waterworks.title.bandG35", { defaultValue: "Grades 3–5" })}
          </button>
          <button
            type="button"
            onClick={() => startBand("g68")}
            className="min-h-14 rounded-2xl bg-[#4a6fa5] text-white text-xl font-extrabold shadow-[0_5px_0_#34527d] active:translate-y-1 active:shadow-none touch-manipulation"
          >
            🚀{" "}
            {t("waterworks.title.bandG68", {
              defaultValue: "Grades 6–8 · Open",
            })}
          </button>
        </div>
        <button
          type="button"
          onClick={goGallery}
          className="min-h-11 px-6 rounded-full bg-white text-[#3a2e22] font-bold shadow active:scale-95 touch-manipulation"
        >
          {t("waterworks.gallery.title", { defaultValue: "My Waterworks" })}
        </button>
        {hasActiveBuild && (
          <button
            type="button"
            onClick={() => {
              setBoardViewRevision((value) => value + 1);
              setScreen("build");
            }}
            className="min-h-11 px-6 rounded-full border-2 border-[#e1d0a6] bg-[#fbf4e3] text-[#3a2e22] font-bold active:scale-95 touch-manipulation"
          >
            {t("waterworks.title.resume", {
              defaultValue: "Keep building my river",
            })}
          </button>
        )}
      </div>
    );
  }

  if (screen === "gallery") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 px-4 w-full">
        <h2 className="text-2xl font-extrabold text-[#3a2e22]">
          {t("waterworks.gallery.title", { defaultValue: "My Waterworks" })}
        </h2>
        <button
          type="button"
          onClick={() => setScreen(galleryOriginRef.current)}
          className="min-h-11 px-6 rounded-full bg-white text-[#3a2e22] font-bold shadow active:scale-95 touch-manipulation"
        >
          {t("waterworks.gallery.back", { defaultValue: "Back" })}
        </button>
        <div className="ww-gallery-grid grid grid-cols-2 gap-3 w-full max-w-4xl">
          {/* Create (+) lives IN the gallery so starting fresh never routes
              through Levels (the leads' layout note). */}
          <button
            type="button"
            onClick={createFresh}
            className="w-full min-h-32 rounded-2xl border-4 border-dashed border-[#d9c79f] bg-white/60 flex flex-col items-center justify-center gap-1 text-[#7d6c52] font-extrabold active:scale-95 touch-manipulation"
          >
            <span className="text-4xl" aria-hidden>
              ＋
            </span>
            {t("waterworks.gallery.create", { defaultValue: "New river" })}
          </button>
          {gallery.map((river) => (
            <button
              key={river.id}
              type="button"
              onClick={() => openRiver(river)}
              className="w-full min-w-0 rounded-2xl bg-white p-2 shadow-[0_4px_0_#0002] active:translate-y-0.5 touch-manipulation"
              aria-label={t("waterworks.gallery.openAria", {
                defaultValue: "Open {{name}}",
                name: river.name,
              })}
            >
              <div
                className="grid gap-px rounded-lg overflow-hidden bg-[#d9c79f] p-0.5"
                style={{
                  gridTemplateColumns: `repeat(${river.cells[0]?.length ?? 14}, 1fr)`,
                }}
                aria-hidden
              >
                {river.cells.flat().map((cell, i) => (
                  <i
                    key={i}
                    className="block aspect-square rounded-[2px]"
                    style={{ background: thumbColor(cell.t) }}
                  />
                ))}
              </div>
              <div className="font-extrabold text-sm mt-2 text-[#3a2e22] truncate">
                {river.name}
              </div>
            </button>
          ))}
        </div>
        {gallery.length === 0 && (
          <p className="text-[#8a795d] font-bold text-lg">
            {t("waterworks.gallery.empty", {
              defaultValue: "No rivers yet — build one!",
            })}
          </p>
        )}
      </div>
    );
  }

  // ── Build screen ──────────────────────────────────────────────────────────
  const displayName =
    name || t("waterworks.build.defaultName", { defaultValue: "New River" });

  return (
    <div className="ww-build flex flex-col items-center gap-3 w-full px-2 pb-6">
      {/* Top bar: title chip + grouped navigation (leads' layout note) */}
      <div className="ww-topbar w-full max-w-5xl flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={running}
          onClick={() => {
            setNameInput(name);
            setShowNameCard(true);
          }}
          className="ww-river-name min-h-11 min-w-0 px-4 rounded-full bg-white font-extrabold text-[#3a2e22] shadow active:scale-95 touch-manipulation disabled:opacity-50"
          aria-label={t("waterworks.build.renameAria", {
            defaultValue: "River name — tap to change",
          })}
        >
          <span aria-hidden>🏷️</span>
          <span className="truncate">{displayName}</span>
        </button>
        <button
          type="button"
          disabled={running}
          onClick={onSaveTap}
          className="ww-save min-h-11 px-4 rounded-full bg-teal-600 text-white font-bold shadow active:scale-95 touch-manipulation disabled:opacity-50"
        >
          {t("waterworks.build.save", { defaultValue: "Save" })}
        </button>
        {saveNote && (
          <span className="text-sm text-[#6a5836] font-bold" role="status">
            {saveNote === "saved"
              ? t("waterworks.build.saved", { defaultValue: "Saved ✓" })
              : saveNote === "local"
                ? t("waterworks.build.savedLocalOff", {
                    defaultValue:
                      "This device is full — your river stays until you leave the page.",
                  })
                : t("waterworks.build.draftUnavailable", {
                    defaultValue:
                      "Autosave is unavailable — keep this tab open so your river isn't lost.",
                  })}
          </span>
        )}
        <div className="ww-build-nav ml-auto grid gap-2">
          <button
            type="button"
            disabled={running}
            onClick={goGallery}
            className="min-h-11 px-3 rounded-full bg-white font-bold text-[#3a2e22] shadow active:scale-95 touch-manipulation disabled:opacity-50"
          >
            {t("waterworks.gallery.title", { defaultValue: "My Waterworks" })}
          </button>
          <button
            type="button"
            disabled={running}
            onClick={goTitle}
            className="min-h-11 px-3 rounded-full bg-white font-bold text-[#3a2e22] shadow active:scale-95 touch-manipulation disabled:opacity-50"
          >
            🏠 {t("waterworks.build.levels", { defaultValue: "Levels" })}
          </button>
          <button
            type="button"
            disabled={running}
            onClick={() => setShowHelp(true)}
            className="min-h-11 px-3 rounded-full bg-white font-bold text-[#3a2e22] shadow active:scale-95 touch-manipulation disabled:opacity-50"
          >
            ❓ {t("waterworks.help.button", { defaultValue: "How to play" })}
          </button>
        </div>
      </div>

      {/* Soft target — a dismissible suggestion, never a requirement */}
      {target && (
        <div
          className="w-full max-w-5xl flex items-center gap-2 rounded-2xl border-2 border-[#f0dca5] bg-[#fff7e0] px-3 py-2 text-[#6a5836] font-bold"
          role="status"
        >
          <span className="text-2xl" aria-hidden>
            🦏
          </span>
          <span className="flex-1">
            {t(`waterworks.target.${target.id}`, {
              defaultValue:
                "Can you water a field? Put a 🌱 at the end of your channel!",
            })}
          </span>
          <button
            type="button"
            disabled={running}
            onClick={() =>
              setDismissedTargets((prev) => new Set([...prev, target.id]))
            }
            className="min-w-11 min-h-11 rounded-full text-[#a08c62] font-extrabold active:scale-95 touch-manipulation disabled:opacity-50"
            aria-label={t("waterworks.target.dismiss", {
              defaultValue: "Dismiss suggestion",
            })}
          >
            ✕
          </button>
        </div>
      )}

      <div className="ww-workspace w-full max-w-5xl flex flex-col md:flex-row gap-3 items-stretch md:items-start">
        {/* Palette */}
        <div
          className="ww-palette flex md:flex-col flex-row gap-2 justify-start md:justify-center relative"
          role="toolbar"
          aria-label={t("waterworks.build.paletteAria", {
            defaultValue: "River parts",
          })}
        >
          {unlocked.map((part) => (
            <button
              key={part}
              type="button"
              disabled={running}
              onClick={() => setTool(part)}
              aria-pressed={tool === part}
              className={`shrink-0 flex items-center gap-2 min-h-12 min-w-11 px-3 rounded-2xl border-[3px] shadow-[0_3px_0_#0002] font-extrabold text-sm active:translate-y-0.5 touch-manipulation disabled:opacity-50 ${
                tool === part
                  ? "border-orange-400 bg-orange-50"
                  : "border-transparent bg-white"
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {PART_ICON[part]}
              </span>
              <span className="text-left leading-tight text-[#3a2e22]">
                {partLabel(part)}
              </span>
            </button>
          ))}
          <button
            type="button"
            disabled={running}
            onClick={() => setTool("erase")}
            aria-pressed={tool === "erase"}
            className={`shrink-0 flex items-center gap-2 min-h-12 px-3 rounded-2xl border-[3px] shadow-[0_3px_0_#0002] font-extrabold text-sm active:translate-y-0.5 touch-manipulation disabled:opacity-50 ${
              tool === "erase"
                ? "border-orange-400 bg-orange-50"
                : "border-transparent bg-white"
            }`}
          >
            <span className="text-2xl" aria-hidden>
              🧽
            </span>
            <span className="text-[#3a2e22]">
              {t("waterworks.part.erase", { defaultValue: "Erase" })}
            </span>
          </button>
          {/* Tutorial arrow 1: palette → land (first Guided visit only) */}
          {band === "k2" && !seen.placedArrow && (
            <div
              className="ww-arrow absolute -right-8 top-6 text-4xl hidden md:block"
              aria-hidden
            >
              👉
            </div>
          )}
        </div>

        {/* Board */}
        <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
          <p
            className="ww-hint max-w-full text-sm text-[#6f6048] font-bold bg-white/70 rounded-2xl px-4 py-2"
            role="status"
          >
            {tool === "erase"
              ? t("waterworks.hint.erase", {
                  defaultValue: "🧽 Tap a part to rub it out.",
                })
              : t(`waterworks.hint.${tool}`, {
                  defaultValue: "Tap a part, then tap the land to place it.",
                })}
          </p>
          <div
            className="ww-board-scroll w-full overflow-x-auto relative"
            ref={boardScrollRef}
          >
            {showSwipeHint && (
              <button
                type="button"
                onClick={() => {
                  setShowSwipeHint(false);
                  markSeen({ swipeHint: true });
                }}
                className="absolute right-2 top-2 z-10 min-h-11 px-4 rounded-full bg-[#3a2e22]/80 text-white font-extrabold text-sm shadow-lg touch-manipulation"
                aria-label={t("waterworks.build.swipeHintDismiss", {
                  defaultValue: "Dismiss swipe hint",
                })}
              >
                ⇆{" "}
                {t("waterworks.build.swipeHint", {
                  defaultValue: "Swipe to see more",
                })}
              </button>
            )}
            <div
              className={`ww-board relative grid gap-[3px] rounded-2xl bg-[#d9c79f] p-1.5 ${
                raining ? "ww-raining" : ""
              } ${running ? "ww-flowing" : ""}`}
              role="group"
              aria-busy={running}
              aria-label={t("waterworks.build.boardAria", {
                defaultValue: "River building board",
              })}
            >
              {grid.flatMap((row, r) =>
                row.map((cell, c) => {
                  const { bg, icon } = cellVisual(cell);
                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      disabled={running}
                      onClick={() => onCellTap(r, c)}
                      className={`ww-cell relative aspect-square rounded-md text-lg leading-none touch-manipulation disabled:cursor-wait ${
                        cell.water >= 4 || cell.type === "source"
                          ? "ww-shimmer"
                          : ""
                      } ${cell.draining ? "ww-drip" : ""}`}
                      style={{ background: bg }}
                      aria-label={t("waterworks.build.cellAria", {
                        defaultValue: "Row {{r}}, column {{c}}: {{what}}",
                        r: r + 1,
                        c: c + 1,
                        what: t(`waterworks.part.${cell.type}`, {
                          defaultValue:
                            cell.type === "land" ? "open land" : cell.type,
                        }),
                      })}
                    >
                      {icon}
                    </button>
                  );
                }),
              )}
            </div>
          </div>

          {/* Build-action row (leads' layout: doing lives together) */}
          <div className="ww-actions grid justify-center gap-2 w-full">
            <button
              type="button"
              onClick={runFlow}
              disabled={running}
              className="ww-flow-action min-h-14 px-8 rounded-2xl bg-teal-500 text-white text-xl font-extrabold shadow-[0_5px_0_#1d8a7d] active:translate-y-1 active:shadow-none disabled:opacity-60 touch-manipulation"
            >
              {t("waterworks.build.flow", { defaultValue: "Let it flow! 💧" })}
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => setRaining((v) => !v)}
              aria-pressed={raining}
              className={`min-h-11 px-5 rounded-full font-extrabold shadow active:scale-95 touch-manipulation disabled:opacity-50 ${
                raining ? "bg-[#4a6fa5] text-white" : "bg-white text-[#3a2e22]"
              }`}
            >
              {raining
                ? t("waterworks.build.rainOn", { defaultValue: "🌧️ Rain: ON" })
                : t("waterworks.build.rain", { defaultValue: "Rain" })}
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => {
                if (!running) setGrid(freshGrid(band));
              }}
              className="min-h-11 px-5 rounded-full bg-white font-extrabold text-[#3a2e22] shadow active:scale-95 touch-manipulation disabled:opacity-50"
            >
              {t("waterworks.build.clear", { defaultValue: "Clear" })}
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => setShowPatterns(true)}
              className="ww-pattern-action min-h-11 px-5 rounded-full bg-white font-extrabold text-[#3a2e22] shadow active:scale-95 touch-manipulation disabled:opacity-50"
            >
              {t("waterworks.patterns.open", {
                defaultValue: "Show me ideas 📖",
              })}
            </button>
            {/* Tutorial arrow 2: → Let it flow (until the first run) */}
            {band === "k2" && seen.placedArrow && !seen.flowArrow && (
              <div
                className="ww-arrow absolute -top-9 left-8 text-4xl"
                aria-hidden
              >
                👇
              </div>
            )}
          </div>
          <p className="text-xs text-[#6f6048] font-bold">
            {t("waterworks.build.caption", {
              defaultValue: "💧 run the water · 🌧️ storm test",
            })}
          </p>
        </div>
      </div>

      {/* ── Overlays ── */}

      {/* Unlock announce (before Reflect): scaffolding must announce itself */}
      {announceQueue.length > 0 && (
        <Overlay>
          <div className="text-5xl" aria-hidden>
            🎉
          </div>
          <h3 className="text-xl font-extrabold text-[#3a2e22]" role="status">
            {t(`waterworks.unlock.${announceQueue[0]}`, {
              defaultValue: "You earned a new part: {{part}}!",
              part: partLabel(announceQueue[0]),
            })}
          </h3>
          <div className="text-5xl" aria-hidden>
            {PART_ICON[announceQueue[0]]}
          </div>
          <div className="flex flex-col gap-2 w-full">
            <button
              type="button"
              onClick={() => {
                setTool(announceQueue[0]);
                setAnnounceQueue((q) => q.slice(1));
              }}
              className="min-h-12 rounded-full bg-teal-600 text-white font-extrabold text-lg active:scale-95 touch-manipulation"
            >
              {t("waterworks.unlock.tryIt", { defaultValue: "Tap to try it!" })}
            </button>
            {HERITAGE_PARTS.includes(announceQueue[0]) && (
              <button
                type="button"
                onClick={() => setHeritagePart(announceQueue[0])}
                className="min-h-11 rounded-full bg-white border-2 border-[#e1d0a6] text-[#3a2e22] font-bold active:scale-95 touch-manipulation"
              >
                {t("waterworks.heritage.learnMore", {
                  defaultValue: "Learn more about it! 📜",
                })}
              </button>
            )}
          </div>
        </Overlay>
      )}

      {/* Reflect: Shíxī's ONE wondering question — no save-nag by design */}
      {wonder && announceQueue.length === 0 && (
        <Overlay>
          <div className="flex items-start gap-3 text-left w-full">
            <div className="text-5xl" aria-hidden>
              🦏
            </div>
            <div className="flex-1 bg-white rounded-2xl p-3 font-bold text-lg text-[#3a2e22] shadow">
              {t(wonder.key, {
                defaultValue: "What would you try next?",
                ...(wonder.params ?? {}),
              })}
            </div>
          </div>
          {targetJustMet && (
            <p className="text-green-700 font-bold" role="status">
              {t("waterworks.target.met", {
                defaultValue:
                  "You did it — that was one of the try-this ideas! ⭐",
              })}
            </p>
          )}
          <button
            type="button"
            onClick={() => setWonder(null)}
            className="min-h-12 px-8 rounded-full bg-orange-500 text-white font-extrabold text-lg active:scale-95 touch-manipulation"
          >
            {t("waterworks.reflect.keepBuilding", {
              defaultValue: "Keep building",
            })}
          </button>
        </Overlay>
      )}

      {/* Name card (Save/rename — a different beat from Reflect) */}
      {showNameCard && (
        <Overlay>
          <h3 className="text-xl font-extrabold text-[#3a2e22]">
            {t("waterworks.name.title", { defaultValue: "Name your river!" })}
          </h3>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={24}
            className="w-full min-h-12 text-lg font-bold rounded-2xl border-[3px] border-[#e1cfa6] px-4 text-[#3a2e22]"
            placeholder={t("waterworks.name.placeholder", {
              defaultValue: "New River",
            })}
            aria-label={t("waterworks.name.title", {
              defaultValue: "Name your river!",
            })}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmName}
              className="min-h-12 px-8 rounded-full bg-teal-600 text-white font-extrabold text-lg active:scale-95 touch-manipulation"
            >
              {t("waterworks.name.save", { defaultValue: "Save it!" })}
            </button>
            <button
              type="button"
              onClick={() => setShowNameCard(false)}
              className="min-h-11 px-5 rounded-full bg-white border-2 border-[#e1d0a6] text-[#3a2e22] font-bold active:scale-95 touch-manipulation"
            >
              {t("waterworks.name.later", { defaultValue: "Later" })}
            </button>
          </div>
        </Overlay>
      )}

      {/* Pattern book */}
      {showPatterns && (
        <Overlay wide>
          <h3 className="text-xl font-extrabold text-[#3a2e22]">
            {t("waterworks.patterns.title", { defaultValue: "River ideas 📖" })}
          </h3>
          <div className="flex flex-col gap-2 w-full">
            {PATTERN_BOOK.map((pattern) => {
              const available = patternIsAvailable(pattern, unlocked);
              return (
                <div
                  key={pattern.id}
                  className="ww-pattern-row items-center gap-3 rounded-2xl border-2 border-[#e1d0a6] bg-white p-2"
                >
                  <div
                    className="ww-pattern-thumb grid gap-px bg-[#d9c79f] p-0.5 rounded w-24 shrink-0"
                    style={{ gridTemplateColumns: "repeat(14, 1fr)" }}
                    aria-hidden
                  >
                    {snapshotCells(applyPattern("g68", pattern))
                      .flat()
                      .map((cell, i) => (
                        <i
                          key={i}
                          className="block aspect-square"
                          style={{ background: thumbColor(cell.t) }}
                        />
                      ))}
                  </div>
                  <span className="min-w-0 font-extrabold text-[#3a2e22] text-sm">
                    {t(`waterworks.pattern.${pattern.id}`, {
                      defaultValue: pattern.id,
                    })}
                  </span>
                  <button
                    type="button"
                    disabled={!available}
                    onClick={() =>
                      pendingPattern === pattern.id
                        ? applyPatternById(pattern)
                        : setPendingPattern(pattern.id)
                    }
                    className={`ww-pattern-use min-h-11 px-4 rounded-full font-bold text-white active:scale-95 touch-manipulation disabled:bg-slate-400 disabled:opacity-80 ${
                      pendingPattern === pattern.id
                        ? "bg-amber-500"
                        : "bg-teal-600"
                    }`}
                  >
                    {!available
                      ? t("waterworks.patterns.locked", {
                          defaultValue: "🔒 Unlock these parts first",
                        })
                      : pendingPattern === pattern.id
                        ? t("waterworks.patterns.confirm", {
                            defaultValue: "Replace my river?",
                          })
                        : t("waterworks.patterns.use", {
                            defaultValue: "Build from this",
                          })}
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowPatterns(false);
              setPendingPattern(null);
            }}
            className="min-h-11 px-6 rounded-full bg-white border-2 border-[#e1d0a6] text-[#3a2e22] font-bold active:scale-95 touch-manipulation"
          >
            {t("waterworks.patterns.close", { defaultValue: "Keep my river" })}
          </button>
        </Overlay>
      )}

      {/* How to play */}
      {showHelp && (
        <Overlay wide>
          <div className="text-5xl" aria-hidden>
            🦏
          </div>
          <h3 className="text-xl font-extrabold text-[#3a2e22]">
            {t("waterworks.help.title", { defaultValue: "How to play" })}
          </h3>
          <div className="flex flex-col gap-2 w-full text-left">
            {(["step1", "step2", "step3"] as const).map((step, i) => (
              <div
                key={step}
                className="flex items-center gap-3 bg-white rounded-2xl px-3 py-2 font-bold text-[#3a2e22] shadow"
              >
                <span className="text-2xl" aria-hidden>
                  {["🧰", "💧", "🌧️"][i]}
                </span>
                <span>
                  {t(`waterworks.help.${step}`, {
                    defaultValue:
                      i === 0
                        ? "Tap a part, then tap the land to build it."
                        : i === 1
                          ? 'Press the green "Let it flow!" to run the water.'
                          : 'Try "Rain" — does your river still work?',
                  })}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5 w-full text-left">
            <h4 className="font-extrabold text-[#3a2e22]">
              {t("waterworks.help.partsTitle", {
                defaultValue: "What the parts do",
              })}
            </h4>
            {(
              [
                "channel",
                "gate",
                "fishmouth",
                "sandweir",
                "bottleneck",
                "field",
              ] as PartType[]
            ).map((part) => (
              <div
                key={part}
                className="ww-help-part items-center gap-2 bg-white rounded-xl px-3 py-2 text-sm shadow"
              >
                <span className="text-xl w-7 text-center" aria-hidden>
                  {PART_ICON[part]}
                </span>
                <span className="ww-help-part-name min-w-0 font-extrabold text-[#3a2e22] leading-tight">
                  {partLabel(part)}
                </span>
                <span className="ww-help-part-description min-w-0 text-[#55483a] font-semibold">
                  {t(`waterworks.hint.${part}`, { defaultValue: "…" })}
                </span>
                {HERITAGE_PARTS.includes(part) && (
                  <button
                    type="button"
                    onClick={() => setHeritagePart(part)}
                    className="min-w-11 min-h-11 rounded-full text-lg active:scale-95 touch-manipulation"
                    aria-label={t("waterworks.heritage.learnMoreAria", {
                      defaultValue: "Learn about the real {{part}}",
                      part: partLabel(part),
                    })}
                  >
                    📜
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-[#8a795d] font-bold text-sm">
            {t("waterworks.help.note", {
              defaultValue: "There's no wrong way — just build and watch! 🌊",
            })}
          </p>
          <button
            type="button"
            onClick={() => {
              setShowHelp(false);
              markSeen({ help: true });
            }}
            className="min-h-12 px-8 rounded-full bg-orange-500 text-white font-extrabold text-lg active:scale-95 touch-manipulation"
          >
            {t("waterworks.help.go", { defaultValue: "Let's build!" })}
          </button>
        </Overlay>
      )}

      {/* Heritage card — the real Dujiangyan invention behind the part */}
      {heritagePart && (
        <Overlay>
          <div className="text-4xl" aria-hidden>
            {PART_ICON[heritagePart]}
          </div>
          <h3 className="text-xl font-extrabold text-[#3a2e22]">
            {partLabel(heritagePart)}
          </h3>
          <div className="flex flex-col gap-2 w-full text-left text-[#3a2e22]">
            <p className="bg-white rounded-2xl p-3 font-semibold shadow">
              <span className="font-extrabold">
                {t("waterworks.heritage.whatLabel", {
                  defaultValue: "The real thing: ",
                })}
              </span>
              {t(`waterworks.heritage.${heritagePart}.what`, {
                defaultValue: "…",
              })}
            </p>
            <p className="bg-white rounded-2xl p-3 font-semibold shadow">
              <span className="font-extrabold">
                {t("waterworks.heritage.builtLabel", {
                  defaultValue: "Li Bing's idea: ",
                })}
              </span>
              {t(`waterworks.heritage.${heritagePart}.built`, {
                defaultValue: "…",
              })}
            </p>
            <p className="bg-white rounded-2xl p-3 font-semibold shadow">
              <span className="font-extrabold">
                {t("waterworks.heritage.riverLabel", {
                  defaultValue: "In YOUR river: ",
                })}
              </span>
              {t(`waterworks.heritage.${heritagePart}.river`, {
                defaultValue: "…",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHeritagePart(null)}
            className="min-h-12 px-8 rounded-full bg-teal-600 text-white font-extrabold text-lg active:scale-95 touch-manipulation"
          >
            {t("waterworks.heritage.close", { defaultValue: "Cool!" })}
          </button>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="ww-overlay fixed inset-0 z-40 bg-slate-900/50 flex items-center justify-center overflow-y-auto">
      <div
        className={`ww-dialog ww-pop bg-[#fbf4e3] rounded-3xl p-5 w-full ${
          wide ? "max-w-lg" : "max-w-sm"
        } flex flex-col items-center gap-3 text-center shadow-2xl overflow-y-auto`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}
