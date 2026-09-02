/**
 * Biome Buddy — the five-screen loop (design §2):
 *   Choose (Imagine) → Create → Test & Learn (Play) → Name & Save (Share)
 *   → Revise (Reflect), and back around.
 *
 * ISOLATION CONTRACT (Waterworks precedent): no auth, no API calls, no
 * backend anywhere. All persistence is device-local (./biomeBuddyStorage.ts).
 * Deliberately NOT wired into GameShell / modules / Creations — v2 platform
 * graduation is a later, separate decision (docs/games/biome-buddy-design.md
 * §11).
 *
 * Feedback, never failure: stat changes are information about fit; the only
 * progression signal is iteration (tests run in Guided), never a score.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./biomeBuddy.css";
import { useReducedGameEffects } from "@/components/games/shared/useReducedGameEffects";
import {
  CATEGORY_EMOJI,
  PATTERN_EMOJI,
  TRAITS,
  cloneRecipe,
  computeStats,
  diffBuilds,
  nextUnlock,
  recipeKey,
  starterRecipe,
  unlockedPickers,
  type Band,
  type Biome,
  type BuddyRecipe,
  type NameAdjective,
  type NameNoun,
  type Pattern,
  type Picker,
  type TestSummary,
  type TraitOption,
} from "./biomeBuddyModel";
import {
  CATEGORY_LABEL,
  WONDER_POOL,
  renderBuddyName,
} from "./biomeBuddyContent";
import {
  clearDraft,
  deleteBuddy,
  loadDraft,
  loadGallery,
  loadProgress,
  newBuddyId,
  saveBuddy,
  saveDraft,
  saveProgress,
  type ProgressState,
  type SavedBuddy,
} from "./biomeBuddyStorage";
import Overlay from "./Overlay";
import ScienceCard from "./ScienceCard";
import { useBuddyLocale } from "./useBuddyLocale";
import ChooseScreen from "./screens/ChooseScreen";
import CreateScreen from "./screens/CreateScreen";
import NameScreen, { type SaveNote } from "./screens/NameScreen";
import TestLearnScreen from "./screens/TestLearnScreen";
import TitleScreen from "./screens/TitleScreen";

type Screen = "title" | "choose" | "create" | "name";

export interface BiomeBuddyGameProps {
  /** A validated recipe to start a NEW build from ("Make my own version").
   *  The game copies it — the shared snapshot is never touched. */
  remixRecipe?: BuddyRecipe | null;
}

function upsert(list: SavedBuddy[], buddy: SavedBuddy): SavedBuddy[] {
  const next = list.slice();
  const index = next.findIndex((entry) => entry.id === buddy.id);
  if (index >= 0) next[index] = buddy;
  else next.push(buddy);
  return next;
}

export default function BiomeBuddyGame({
  remixRecipe = null,
}: BiomeBuddyGameProps) {
  const { t, lang, L } = useBuddyLocale();
  const { reducedEffects } = useReducedGameEffects();

  // ---- persistent-ish state, restored from the on-device draft ----
  const initialDraft = useMemo(loadDraft, []);
  const initialProgress = useMemo(loadProgress, []);
  const [progress, setProgress] = useState<ProgressState>(initialProgress);
  const progressRef = useRef(initialProgress);
  const [band, setBand] = useState<Band>(
    initialDraft?.band ?? initialProgress.band ?? "k2",
  );
  const [recipe, setRecipe] = useState<BuddyRecipe>(
    initialDraft?.recipe ?? starterRecipe(),
  );
  const [currentId, setCurrentId] = useState<string | null>(
    initialDraft?.id ?? null,
  );
  const [named, setNamed] = useState<boolean>(initialDraft?.named ?? false);
  const [lastTested, setLastTested] = useState<Pick<
    BuddyRecipe,
    "biome" | "traits"
  > | null>(initialDraft?.lastTested ?? null);
  const [lastTest, setLastTest] = useState<TestSummary | null>(
    initialDraft?.lastTest ?? null,
  );
  const [hasActiveBuild, setHasActiveBuild] = useState(!!initialDraft);
  const [screen, setScreen] = useState<Screen>(
    initialDraft ? "create" : "title",
  );
  const [gallery, setGallery] = useState<SavedBuddy[]>(() => loadGallery());

  // ---- session state ----
  const [science, setScience] = useState<{
    picker: Picker;
    option: string;
    opener: HTMLElement | null;
  } | null>(null);
  /** The open Test & Learn: fresh (just tested → has side effects on Got it)
   *  or reopened from the Revise chip (read-only, no side effects). */
  const [walkthrough, setWalkthrough] = useState<{
    summary: TestSummary;
    fresh: boolean;
  } | null>(null);
  const [wonderIndex, setWonderIndex] = useState(0);
  const [pendingUnlock, setPendingUnlock] = useState<Picker | null>(null);
  const [unlockAnnounce, setUnlockAnnounce] = useState<Picker | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SavedBuddy | null>(null);
  const [saveNote, setSaveNote] = useState<SaveNote>(null);
  const volatileGalleryRef = useRef<SavedBuddy[]>([]);
  const hasActiveBuildRef = useRef(!!initialDraft);
  const remixKeyRef = useRef<string | null>(null);

  const stats = useMemo(() => computeStats(recipe), [recipe]);
  const unlocked = useMemo(
    () => unlockedPickers(band, progress.guidedTestsCompleted),
    [band, progress.guidedTestsCompleted],
  );
  const name = renderBuddyName(recipe.name, lang);
  const wonder = WONDER_POOL[wonderIndex % WONDER_POOL.length];

  // ---- draft autosave: on every meaningful change + on unmount ----
  const latestRef = useRef({
    recipe,
    currentId,
    named,
    lastTested,
    lastTest,
    band,
  });
  latestRef.current = { recipe, currentId, named, lastTested, lastTest, band };
  const persistDraft = useCallback(() => {
    const s = latestRef.current;
    return saveDraft({
      id: s.currentId,
      band: s.band,
      recipe: s.recipe,
      lastTested: s.lastTested,
      lastTest: s.lastTest,
      named: s.named,
    });
  }, []);
  useEffect(() => {
    if (hasActiveBuild) persistDraft();
  }, [
    recipe,
    currentId,
    named,
    lastTested,
    lastTest,
    band,
    hasActiveBuild,
    persistDraft,
  ]);
  useEffect(
    () => () => {
      if (hasActiveBuildRef.current) persistDraft();
    },
    [persistDraft],
  );
  useEffect(() => {
    if (!saveNote) return;
    const id = setTimeout(() => setSaveNote(null), 3000);
    return () => clearTimeout(id);
  }, [saveNote]);

  const commitProgress = useCallback((next: ProgressState) => {
    progressRef.current = next;
    setProgress(next);
    saveProgress(next);
  }, []);

  // ---- gallery ----
  const refreshGallery = useCallback(() => {
    setGallery(volatileGalleryRef.current.reduce(upsert, loadGallery()));
  }, []);

  const persistBuddy = useCallback((): string => {
    const s = latestRef.current;
    const id = s.currentId ?? newBuddyId();
    const saved: SavedBuddy = {
      id,
      recipe: cloneRecipe(s.recipe),
      savedAt: Date.now(),
      lastTest: s.lastTest,
    };
    const ok = saveBuddy(saved);
    if (ok) {
      volatileGalleryRef.current = volatileGalleryRef.current.filter(
        (b) => b.id !== id,
      );
    } else {
      volatileGalleryRef.current = upsert(volatileGalleryRef.current, saved);
    }
    latestRef.current = { ...s, currentId: id };
    setCurrentId(id);
    refreshGallery();
    setSaveNote(ok ? "saved" : "local");
    return id;
  }, [refreshGallery]);

  const activate = useCallback(() => {
    hasActiveBuildRef.current = true;
    setHasActiveBuild(true);
  }, []);

  const replaceBuild = useCallback(
    (
      next: BuddyRecipe,
      opts: {
        id: string | null;
        named: boolean;
        lastTest: TestSummary | null;
        tested: boolean;
      },
    ) => {
      // Nothing is lost: a build that already lives in the gallery is saved
      // in place before anything replaces it.
      if (latestRef.current.currentId) persistBuddy();
      setRecipe(next);
      setCurrentId(opts.id);
      setNamed(opts.named);
      setLastTested(
        opts.tested ? { biome: next.biome, traits: { ...next.traits } } : null,
      );
      setLastTest(opts.lastTest);
      setWalkthrough(null);
      setScience(null);
      activate();
    },
    [activate, persistBuddy],
  );

  // ---- remix: "Make my own version" hands us a validated COPY ----
  // The remixer keeps their own band (a Guided child keeps the ladder; locked
  // pickers simply hold the shared choice) — design §14 Q5.
  useEffect(() => {
    if (!remixRecipe) return;
    const key = recipeKey(remixRecipe);
    if (remixKeyRef.current === key) return;
    remixKeyRef.current = key;
    replaceBuild(cloneRecipe(remixRecipe), {
      id: null,
      named: false,
      lastTest: null,
      tested: false,
    });
    setScreen("create");
  }, [remixRecipe, replaceBuild]);

  // ---- navigation / actions ----
  const startBand = useCallback(
    (nextBand: Band) => {
      setBand(nextBand);
      commitProgress({ ...progressRef.current, band: nextBand });
      replaceBuild(starterRecipe("earth"), {
        id: null,
        named: false,
        lastTest: null,
        tested: false,
      });
      setScreen("choose");
    },
    [commitProgress, replaceBuild],
  );

  const goTitle = useCallback(() => {
    if (hasActiveBuildRef.current) persistDraft();
    refreshGallery();
    setScreen("title");
  }, [persistDraft, refreshGallery]);

  const openBuddy = useCallback(
    (buddy: SavedBuddy) => {
      replaceBuild(cloneRecipe(buddy.recipe), {
        id: buddy.id,
        named: true,
        lastTest: buddy.lastTest ?? null,
        tested: true,
      });
      setScreen("create");
    },
    [replaceBuild],
  );

  const onPick = useCallback(
    (picker: Picker, option: string, opener: HTMLElement | null = null) => {
      setRecipe((r) =>
        picker === "pattern"
          ? { ...r, pattern: option as Pattern }
          : { ...r, traits: { ...r.traits, [picker]: option } },
      );
      setScience({ picker, option, opener });
    },
    [],
  );

  const onTest = useCallback(() => {
    const s = latestRef.current;
    const summary = diffBuilds(s.lastTested, s.recipe);
    setWalkthrough({ summary, fresh: true });
    setLastTest(summary);
    setLastTested({ biome: s.recipe.biome, traits: { ...s.recipe.traits } });
    setWonderIndex((i) => i + 1);
    // Guided ladder: a TESTED CHANGE opens the next picker — iteration, never
    // a stat value. (An unchanged re-test is not a change.)
    if (s.band === "k2" && !summary.unchanged) {
      const p = progressRef.current;
      const unlock = nextUnlock("k2", p.guidedTestsCompleted);
      commitProgress({
        ...p,
        guidedTestsCompleted: p.guidedTestsCompleted + 1,
      });
      if (unlock) setPendingUnlock(unlock);
    }
  }, [commitProgress]);

  const onGotIt = useCallback(() => {
    const fresh = walkthrough?.fresh === true;
    setWalkthrough(null);
    if (!fresh) return; // reopened from the Revise chip — no side effects
    if (latestRef.current.currentId) persistBuddy();
    if (pendingUnlock) {
      setUnlockAnnounce(pendingUnlock);
      setPendingUnlock(null);
    }
    setScreen(latestRef.current.named ? "create" : "name");
  }, [walkthrough, pendingUnlock, persistBuddy]);

  const onSaveFromName = useCallback(() => {
    persistBuddy();
    setNamed(true);
  }, [persistBuddy]);

  const onConfirmDelete = useCallback(() => {
    if (!confirmDelete) return;
    deleteBuddy(confirmDelete.id);
    volatileGalleryRef.current = volatileGalleryRef.current.filter(
      (b) => b.id !== confirmDelete.id,
    );
    if (latestRef.current.currentId === confirmDelete.id) {
      hasActiveBuildRef.current = false;
      setHasActiveBuild(false);
      setCurrentId(null);
      setNamed(false);
      clearDraft();
    }
    setConfirmDelete(null);
    refreshGallery();
  }, [confirmDelete, refreshGallery]);

  const scienceEmoji = (picker: Picker, option: string) =>
    picker === "pattern"
      ? PATTERN_EMOJI[option as Pattern]
      : (TRAITS[picker] as Record<string, TraitOption>)[option].emoji;

  const unlockLabel = (picker: Picker) => L(CATEGORY_LABEL[picker]);
  const unlockEmoji = (picker: Picker) =>
    picker === "pattern" ? "🎨" : CATEGORY_EMOJI[picker];

  return (
    <div className={`bb-game w-full ${reducedEffects ? "bb-reduced" : ""}`}>
      {screen === "title" && (
        <TitleScreen
          gallery={gallery}
          resumeName={hasActiveBuild ? name : null}
          onResume={() => setScreen(named || lastTested ? "create" : "choose")}
          onStart={startBand}
          onOpen={openBuddy}
          onDelete={setConfirmDelete}
          reduced={reducedEffects}
        />
      )}

      {screen === "choose" && (
        <ChooseScreen
          biome={recipe.biome}
          onBiome={(biome: Biome) => setRecipe((r) => ({ ...r, biome }))}
          onSelect={() => setScreen("create")}
          onBack={goTitle}
        />
      )}

      {screen === "create" && (
        <CreateScreen
          recipe={recipe}
          band={band}
          unlocked={unlocked}
          stats={stats}
          name={name}
          saved={currentId !== null}
          onPick={onPick}
          onTest={onTest}
          onName={() => setScreen("name")}
          onSave={persistBuddy}
          onTitle={goTitle}
          onChangeHome={() => setScreen("choose")}
          lastTest={lastTest}
          onReopenTest={() =>
            lastTest && setWalkthrough({ summary: lastTest, fresh: false })
          }
          reduced={reducedEffects}
        />
      )}

      {screen === "name" && (
        <NameScreen
          recipe={recipe}
          name={name}
          onAdjective={(id: NameAdjective) =>
            setRecipe((r) => ({ ...r, name: { ...r.name, adjective: id } }))
          }
          onNoun={(id: NameNoun) =>
            setRecipe((r) => ({ ...r, name: { ...r.name, noun: id } }))
          }
          onSave={onSaveFromName}
          saved={currentId !== null}
          saveNote={saveNote}
          onKeepBuilding={() => setScreen("create")}
          onTitle={goTitle}
          reduced={reducedEffects}
        />
      )}

      {saveNote && screen !== "name" && (
        <p role="status" aria-live="polite" className="sr-only">
          {saveNote === "saved"
            ? t("biomeBuddy.name.saved", {
                defaultValue: "Saved on this device! ✓",
              })
            : t("biomeBuddy.name.savedLocal", {
                defaultValue:
                  "Saved for now — this device is out of room, so it may not stick.",
              })}
        </p>
      )}

      {/* ── Overlays ── */}
      {science && (
        <ScienceCard
          category={science.picker}
          option={science.option as never}
          biome={recipe.biome}
          emoji={scienceEmoji(science.picker, science.option)}
          onClose={() => setScience(null)}
          returnFocusTo={science.opener}
        />
      )}

      {walkthrough && (
        <TestLearnScreen
          recipe={recipe}
          name={name}
          summary={walkthrough.summary}
          wonder={wonder}
          onGotIt={onGotIt}
          reduced={reducedEffects}
        />
      )}

      {unlockAnnounce && !walkthrough && (
        <Overlay
          labelledBy="bb-unlock-title"
          onClose={() => setUnlockAnnounce(null)}
        >
          <div className="text-5xl" aria-hidden>
            🎉
          </div>
          <h3
            id="bb-unlock-title"
            className="text-xl font-extrabold text-[#3a2e22]"
            role="status"
          >
            {t("biomeBuddy.create.unlockTitle", {
              defaultValue: "New part to change: {{category}}!",
              category: unlockLabel(unlockAnnounce),
            })}
          </h3>
          <div className="text-5xl" aria-hidden>
            {unlockEmoji(unlockAnnounce)}
          </div>
          <button
            type="button"
            onClick={() => {
              setUnlockAnnounce(null);
              setScreen("create");
            }}
            className="bb-primary min-h-14 px-8 rounded-full bg-teal-600 text-white font-extrabold text-lg active:scale-95"
            data-autofocus
          >
            {t("biomeBuddy.create.unlockTry", { defaultValue: "Try it!" })}
          </button>
        </Overlay>
      )}

      {confirmDelete && (
        <Overlay
          labelledBy="bb-delete-title"
          onClose={() => setConfirmDelete(null)}
        >
          <h3
            id="bb-delete-title"
            className="text-xl font-extrabold text-[#3a2e22]"
          >
            {t("biomeBuddy.delete.title", {
              defaultValue: "Let {{name}} go?",
              name: renderBuddyName(confirmDelete.recipe.name, lang),
            })}
          </h3>
          <p className="font-bold text-[#6f6048]">
            {t("biomeBuddy.delete.body", {
              defaultValue:
                "It will leave this device. You can always build a new one.",
            })}
          </p>
          <div className="flex flex-col gap-2 w-full">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="bb-primary min-h-14 rounded-full bg-teal-600 text-white font-extrabold text-lg active:scale-95"
              data-autofocus
            >
              {t("biomeBuddy.delete.no", { defaultValue: "Keep it" })}
            </button>
            <button
              type="button"
              onClick={onConfirmDelete}
              className="min-h-11 rounded-full bg-white border-2 border-[#e1d0a6] text-[#3a2e22] font-bold active:scale-95"
            >
              {t("biomeBuddy.delete.yes", { defaultValue: "Yes, let it go" })}
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
