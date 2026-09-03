/**
 * Guided choice — the four navigation actions on the Modules page (#842).
 *
 * ## The hierarchy
 *
 * 1. **Continue** — one visually dominant action, pointing at the canonical
 *    scan's target. It is the only element marked `data-guided-action="primary"`,
 *    which is what the "exactly one dominant action" test counts.
 * 2. **Try a different game** — a collapsed disclosure over the eligible
 *    alternatives. Collapsed by default so it cannot obscure Continue; the
 *    same modules are also visible as ordinary cards below this panel, so
 *    nothing is discoverable *only* here (accessibility contract §7).
 * 3. **Play one again** — rendered only when finished, still-allowed modules
 *    exist. It replays; it does not remix. Creation remix is #673/#841's, and
 *    this copy must never advertise it (issue: "Revisit and remix never
 *    advertises an unsupported action").
 * 4. **Surprise me** — seeded, disclosed, reversible. Never navigates on press.
 *
 * ## Why the surprise cannot go wrong
 *
 * The pool is `result.eligible`, which `resolveGuidedChoice` produced by
 * running every candidate through `resolveModuleAccess`. This component does
 * not filter, widen or second-guess it, and `pickSeeded` cannot return
 * anything outside the array it is handed. So "registered, visible, unlocked,
 * grade-appropriate, completion-appropriate" (principle 9) holds here by
 * construction rather than by a check that could be forgotten.
 *
 * The pick is a pure function of `(userId, dateBucket, rerollCount, pool)` —
 * all injected. No `Math.random`, no `Date` in this file. That is what lets
 * accessibility tests pin a seed and assert exact announcement strings
 * (accessibility contract §5).
 *
 * ## Motion
 *
 * There is deliberately no animation or transition on any state change here,
 * so `prefers-reduced-motion` has nothing to suppress and the cause-and-effect
 * feedback is carried entirely by text and focus (contract §4).
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowRight, Shuffle, RotateCcw } from "lucide-react";
import { track } from "@/lib/analytics";
import { translateContentName } from "@/utils/localizedContent";
import { pickSeeded } from "@/lib/seededRng";
import {
  continueHref,
  destinationHref,
  type GuidedChoiceDestination,
  type GuidedChoiceResult,
  type GuidedContinueTarget,
} from "@/lib/guidedChoice";

export interface GuidedChoicePanelProps {
  result: GuidedChoiceResult;
  /** Passed in the way `ModuleCard` already takes it on this page. */
  navigate: (path: string) => void;
  /** Stable per-learner seed part. */
  seedUserId: string;
  /** Coarse date bucket, so a pick survives a re-render and a refresh. */
  seedDateBucket: string;
}

/** Tap-target floor for K-2 (contract §8). */
const TAP = "min-h-[44px]";

/**
 * Which sentence Continue says.
 *
 * Three states, because two of them would have to lie. Resuming an activity is
 * "keep going"; opening a module for the first time is "start playing"; and
 * opening a module the learner has already finished — where a learner who has
 * completed everything available lands — is a replay, and saying "start
 * playing" there would tell a child something they can see is untrue.
 */
function continueCopyKey(target: NonNullable<GuidedContinueTarget>): string {
  if (target.kind === "activity") return "modules.guidedChoice.continueNext";
  if (target.isReplay) return "modules.guidedChoice.continueReplay";
  return "modules.guidedChoice.continueStart";
}

export function GuidedChoicePanel({
  result,
  navigate,
  seedUserId,
  seedDateBucket,
}: GuidedChoicePanelProps) {
  const { t } = useTranslation();
  const { continueTarget, eligible, revisit } = result;

  const [openList, setOpenList] = useState<null | "alternatives" | "revisit">(
    null,
  );
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  const [rerollCount, setRerollCount] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  const surpriseButtonRef = useRef<HTMLButtonElement | null>(null);
  const disclosureRef = useRef<HTMLDivElement | null>(null);

  /**
   * Teacher-assigned destinations come first (principle 9: assignments outrank
   * surprise and delight; contract §7: they stay visible in ordinary page
   * structure). A stable sort, so the order — and therefore the seeded pick —
   * stays deterministic.
   */
  const pool = useMemo(() => {
    const assigned = eligible.filter(
      (d) => d.whyAvailable === "teacher_assignment",
    );
    const rest = eligible.filter(
      (d) => d.whyAvailable !== "teacher_assignment",
    );
    return [...assigned, ...rest];
  }, [eligible]);

  const seedFor = useCallback(
    (reroll: number) => ({
      userId: seedUserId,
      dateBucket: seedDateBucket,
      rerollCount: reroll,
    }),
    [seedUserId, seedDateBucket],
  );

  const pick = useMemo(
    () => pickSeeded(pool, seedFor(rerollCount)),
    [pool, seedFor, rerollCount],
  );

  const objectiveOf = useCallback(
    (destination: GuidedChoiceDestination) =>
      destination.objective
        ? translateContentName(destination.objective)
        : t("modules.guidedChoice.objectiveMissing"),
    [t],
  );

  const announceFor = useCallback(
    (destination: GuidedChoiceDestination) =>
      t("modules.guidedChoice.announceSurprise", {
        name: translateContentName(destination.title),
        objective: objectiveOf(destination),
      }),
    [t, objectiveOf],
  );

  // Focus moves onto the disclosure when it opens (contract §1, the "surprise
  // destination" row: focus lands on the disclosure BEFORE any navigation).
  useEffect(() => {
    if (surpriseOpen) disclosureRef.current?.focus();
  }, [surpriseOpen]);

  /**
   * The "Surprise me" control is a **toggle**, like the other two disclosure
   * triggers on this panel. Pressing it while the disclosure is open closes it
   * — it does not re-offer. Re-offering would re-fire `guided_surprise_offered`
   * and re-announce a destination that has not changed, and would leave
   * `aria-expanded` stuck at `true` with no way back from that control, which
   * is exactly the sort of dead end the "safe way back" rule exists to
   * prevent.
   */
  const toggleSurprise = () => {
    if (surpriseOpen) {
      closeSurprise();
      return;
    }
    setSurpriseOpen(true);
    if (pick) {
      setAnnouncement(announceFor(pick));
      track({
        kind: "guided_surprise_offered",
        module_slug: pick.moduleSlug,
        why_available: pick.whyAvailable,
        pool_size: pool.length,
        reroll_count: rerollCount,
        date_bucket: seedDateBucket,
      });
    } else {
      // An empty pool is a safe, legitimate state — never an error (§1).
      setAnnouncement(t("modules.guidedChoice.announceEmpty"));
      track({ kind: "guided_surprise_empty" });
    }
  };

  const closeSurprise = () => {
    setSurpriseOpen(false);
    setAnnouncement("");
    track({ kind: "guided_surprise_cancelled", pool_size: pool.length });
    // Focus returns to the invoking control, having navigated nowhere (§1).
    surpriseButtonRef.current?.focus();
  };

  const acceptSurprise = () => {
    if (!pick) return;
    track({
      kind: "guided_surprise_accepted",
      module_slug: pick.moduleSlug,
      why_available: pick.whyAvailable,
      pool_size: pool.length,
      reroll_count: rerollCount,
      date_bucket: seedDateBucket,
    });
    navigate(destinationHref(pick));
  };

  const rerollSurprise = () => {
    const next = rerollCount + 1;
    // Compute the replacement from the same pure function the render uses, so
    // what is announced is exactly what will be shown.
    const nextPick = pickSeeded(pool, seedFor(next));
    setRerollCount(next);
    setAnnouncement(
      nextPick
        ? announceFor(nextPick)
        : t("modules.guidedChoice.announceEmpty"),
    );
    if (nextPick) {
      track({
        kind: "guided_surprise_rerolled",
        module_slug: nextPick.moduleSlug,
        why_available: nextPick.whyAvailable,
        pool_size: pool.length,
        reroll_count: next,
        date_bucket: seedDateBucket,
      });
    }
  };

  const toggleList = (which: "alternatives" | "revisit") => {
    const next = openList === which ? null : which;
    setOpenList(next);
    if (next === "alternatives") {
      track({
        kind: "guided_alternatives_opened",
        pool_size: eligible.length,
      });
    } else if (next === "revisit") {
      track({ kind: "guided_revisit_opened", pool_size: revisit.length });
    }
  };

  // Nothing to offer at all — render nothing rather than an empty shell.
  if (!continueTarget && eligible.length === 0 && revisit.length === 0) {
    return null;
  }

  const continueName = translateContentName(continueTarget?.moduleTitle ?? "");

  return (
    <section
      aria-labelledby="guided-choice-heading"
      data-testid="guided-choice"
      className="rounded-2xl border-2 border-brightboost-blue/20 bg-white p-4 mb-6"
    >
      <h2
        id="guided-choice-heading"
        className="text-lg font-bold text-brightboost-navy mb-3"
      >
        {t("modules.guidedChoice.heading")}
      </h2>

      {/* One live-region announcement per meaningful state change (§3). */}
      <p
        aria-live="polite"
        data-testid="guided-announcement"
        className="sr-only"
      >
        {announcement}
      </p>

      {/* ── 1. Continue — the only dominant action ── */}
      {continueTarget && (
        <button
          type="button"
          data-guided-action="primary"
          data-testid="guided-continue"
          onClick={() => navigate(continueHref(continueTarget))}
          className={`w-full ${TAP} flex items-center justify-between gap-3 rounded-xl bg-brightboost-blue px-5 py-4 text-left text-lg font-extrabold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brightboost-blue/40`}
        >
          <span>
            {t(continueCopyKey(continueTarget), { name: continueName })}
          </span>
          <ArrowRight className="h-6 w-6 shrink-0" aria-hidden="true" />
        </button>
      )}

      {/* ── 2-4. Secondary choices — never above or louder than Continue ── */}
      <div className="mt-3 flex flex-wrap gap-2">
        {eligible.length > 0 && (
          <SecondaryButton
            testId="guided-try-another"
            expanded={openList === "alternatives"}
            controls="guided-alternatives"
            onClick={() => toggleList("alternatives")}
            icon={<Shuffle className="h-4 w-4" aria-hidden="true" />}
            label={t("modules.guidedChoice.tryAnother")}
          />
        )}
        {revisit.length > 0 && (
          <SecondaryButton
            testId="guided-revisit"
            expanded={openList === "revisit"}
            controls="guided-revisit-list"
            onClick={() => toggleList("revisit")}
            icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
            label={t("modules.guidedChoice.revisit")}
          />
        )}
        <SecondaryButton
          testId="guided-surprise"
          buttonRef={surpriseButtonRef}
          expanded={surpriseOpen}
          controls="guided-surprise-disclosure"
          onClick={toggleSurprise}
          icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
          label={t("modules.guidedChoice.surprise")}
        />
      </div>

      {openList === "alternatives" && (
        <DestinationList
          id="guided-alternatives"
          testId="guided-alternatives"
          intro={t("modules.guidedChoice.tryAnotherIntro")}
          destinations={pool}
          navigate={navigate}
          objectiveOf={objectiveOf}
          t={t}
        />
      )}

      {openList === "revisit" && (
        <DestinationList
          id="guided-revisit-list"
          testId="guided-revisit-list"
          intro={t("modules.guidedChoice.revisitIntro")}
          destinations={revisit}
          navigate={navigate}
          objectiveOf={objectiveOf}
          t={t}
        />
      )}

      {/* ── The surprise disclosure — ordinary page structure, not a toast ── */}
      {surpriseOpen && (
        <div
          id="guided-surprise-disclosure"
          data-testid="guided-surprise-disclosure"
          ref={disclosureRef}
          tabIndex={-1}
          role="group"
          aria-labelledby="guided-surprise-heading"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              closeSurprise();
            }
          }}
          className="mt-4 rounded-xl border-2 border-brightboost-blue/30 bg-blue-50/60 p-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brightboost-blue/40"
        >
          <h3
            id="guided-surprise-heading"
            className="font-bold text-brightboost-navy"
          >
            {pick
              ? t("modules.guidedChoice.surpriseHeading")
              : t("modules.guidedChoice.emptyHeading")}
          </h3>

          {pick ? (
            <>
              <p
                data-testid="guided-surprise-name"
                className="mt-1 text-lg font-extrabold text-brightboost-navy"
              >
                {translateContentName(pick.title)}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                <span className="font-semibold">
                  {t("modules.guidedChoice.objectiveLabel")}
                </span>{" "}
                {objectiveOf(pick)}
              </p>
              <p
                data-testid="guided-surprise-why"
                className="mt-1 text-sm text-slate-600"
              >
                {pick.whyAvailable === "teacher_assignment"
                  ? t("modules.guidedChoice.whyTeacher")
                  : t("modules.guidedChoice.whyProgression")}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-guided-action="secondary"
                  data-testid="guided-surprise-accept"
                  onClick={acceptSurprise}
                  className={`${TAP} rounded-lg bg-brightboost-navy px-4 py-2 font-bold text-white`}
                >
                  {t("modules.guidedChoice.accept")}
                </button>
                <button
                  type="button"
                  data-guided-action="secondary"
                  data-testid="guided-surprise-reroll"
                  onClick={rerollSurprise}
                  className={`${TAP} rounded-lg border-2 border-brightboost-navy/30 px-4 py-2 font-bold text-brightboost-navy`}
                >
                  {t("modules.guidedChoice.chooseAnother")}
                </button>
                <button
                  type="button"
                  data-guided-action="secondary"
                  data-testid="guided-surprise-cancel"
                  onClick={closeSurprise}
                  className={`${TAP} rounded-lg px-4 py-2 font-bold text-slate-600 underline`}
                >
                  {t("modules.guidedChoice.cancel")}
                </button>
              </div>
            </>
          ) : (
            <>
              <p
                data-testid="guided-surprise-empty"
                className="mt-1 text-sm text-slate-700"
              >
                {t("modules.guidedChoice.emptyBody")}
              </p>
              <button
                type="button"
                data-guided-action="secondary"
                data-testid="guided-surprise-cancel"
                onClick={closeSurprise}
                className={`${TAP} mt-3 rounded-lg px-4 py-2 font-bold text-slate-600 underline`}
              >
                {t("modules.guidedChoice.cancel")}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────────

function SecondaryButton({
  testId,
  label,
  icon,
  onClick,
  expanded,
  controls,
  buttonRef,
}: {
  testId: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  expanded: boolean;
  controls: string;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      ref={buttonRef}
      data-guided-action="secondary"
      data-testid={testId}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      className={`${TAP} inline-flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-4 py-2 text-sm font-bold text-brightboost-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brightboost-blue/40`}
    >
      {icon}
      {label}
    </button>
  );
}

function DestinationList({
  id,
  testId,
  intro,
  destinations,
  navigate,
  objectiveOf,
  t,
}: {
  id: string;
  testId: string;
  intro: string;
  destinations: GuidedChoiceDestination[];
  navigate: (path: string) => void;
  objectiveOf: (d: GuidedChoiceDestination) => string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <div className="mt-3">
      <p className="text-sm text-slate-600">{intro}</p>
      <ul id={id} data-testid={testId} className="mt-2 space-y-2">
        {destinations.map((d) => (
          <li
            key={d.moduleSlug}
            className="rounded-lg border border-slate-200 p-3"
          >
            <p className="font-bold text-brightboost-navy">
              {translateContentName(d.title)}
              {d.setNumber ? (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {t("modules.guidedChoice.setLabel", { number: d.setNumber })}
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-sm text-slate-600">{objectiveOf(d)}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {d.whyAvailable === "teacher_assignment"
                ? t("modules.guidedChoice.whyTeacher")
                : t("modules.guidedChoice.whyProgression")}
            </p>
            <button
              type="button"
              data-guided-action="secondary"
              onClick={() => navigate(destinationHref(d))}
              // Same accessible-name convention as this page's module cards,
              // and the visible label is contained in it (WCAG 2.5.3).
              aria-label={`${t("modules.startLearning")} ${translateContentName(d.title)}`}
              className={`${TAP} mt-2 rounded-lg border-2 border-brightboost-navy/30 px-4 py-2 text-sm font-bold text-brightboost-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brightboost-blue/40`}
            >
              {t("modules.startLearning")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default GuidedChoicePanel;
