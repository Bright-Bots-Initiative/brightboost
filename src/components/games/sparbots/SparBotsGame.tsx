import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  Check,
  Layers,
  LockKeyhole,
  Printer,
  Sparkles,
} from "lucide-react";
import type { GameResult } from "../shared/GameShell";
import { useReducedGameEffects } from "../shared/useReducedGameEffects";
import CardBench from "./CardBench";
import { Bot, Light } from "./Bot";
import {
  addCard,
  FINISHES,
  FLOORS,
  MAX_CARDS,
  MOVES,
  POSES,
  LIGHTS,
  NAMES,
  newDraft,
  newRound,
  nextDecision,
  outcome,
  parseDraft,
  practiceTell,
  REFLECTIONS,
  referenceCards,
  serializeDraft,
  starterCards,
  step,
  storageKey,
  STYLES,
  tell,
  type Beat,
  type Draft,
  type Floor,
  type Move,
  type Round,
  type Signals,
} from "./model";
import "./sparbots.css";

type Screen =
  | "tower"
  | "meet"
  | "show"
  | "corner"
  | "spar"
  | "reflect"
  | "card";
type Props = {
  config?: { gradeBand?: string };
  storageScope: string;
  onComplete?: (result: GameResult) => void | boolean | Promise<void | boolean>;
};

// The keyed inner game also isolates drafts when a preview/test changes students.
export default function SparBotsGame(props: Props) {
  return <Game key={props.storageScope} {...props} />;
}
function Game({ config, storageScope, onComplete }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      return (
        parseDraft(localStorage.getItem(storageKey(storageScope))) ?? newDraft()
      );
    } catch {
      return newDraft();
    }
  });
  const [saved, setSaved] = useState(draft);
  const [screen, setScreen] = useState<Screen>("tower");
  const heading = useRef<HTMLHeadingElement>(null);
  const [practice, setPractice] = useState(0);
  const [chosenMove, setChosenMove] = useState<Move | null>(null);
  const [round, setRound] = useState<Round>(newRound);
  const [wins, setWins] = useState<[number, number]>([0, 0]);
  const [last, setLast] = useState<Beat | null>(null);
  const [coachCard, setCoachCard] = useState(false);
  const [why, setWhy] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveState, setSaveState] = useState<"" | "saved" | "saveError">("");
  const [benchKey, setBenchKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finishError, setFinishError] = useState(false);
  const finishLatch = useRef(false);
  const effects = useReducedGameEffects();
  const target = config?.gradeBand === "g3_5" ? 5 : 3;
  const floor = draft.floor as Floor;
  const partner = t(`sparbots.partners.${FLOORS[floor].partner}`);
  const name = t("sparbots.botName", {
    style: t(`sparbots.styles.${draft.style}`),
    name: t(`sparbots.names.${draft.name}`),
  });
  useEffect(() => {
    heading.current?.focus();
  }, [screen]);
  function go(next: Screen) {
    setScreen(next);
    setNotice("");
    setEditing(false);
  }
  function update(next: Draft) {
    setDraft(next);
    setSaveState("");
  }
  function keep(next = draft): boolean {
    try {
      localStorage.setItem(storageKey(storageScope), serializeDraft(next));
      setSaved(next);
      setSaveState("saved");
      return true;
    } catch {
      setSaveState("saveError");
      return false;
    }
  }
  function visit(id: Floor) {
    if (id > draft.cleared) return;
    if (id !== floor)
      update({ ...draft, floor: id, clue: "pose", cards: starterCards(id) });
    setRound(newRound());
    setWins([0, 0]);
    setLast(null);
    setWhy(false);
    go("meet");
  }
  function startPractice() {
    setPractice(0);
    setChosenMove(null);
    go("show");
  }
  function finishPractice(retain: boolean) {
    if (chosenMove === null) return;
    if (retain)
      update({
        ...draft,
        cards: addCard(
          draft.cards,
          practiceTell(floor, round.index, practice),
          chosenMove,
          "practice",
        ),
        revisions: Math.min(10000, draft.revisions + 1),
      });
    setChosenMove(null);
    if (practice === 5) {
      setBenchKey((k) => k + 1);
      go("corner");
    } else setPractice((p) => p + 1);
  }
  function playBeat(coach?: Move) {
    if (round.result || coachCard) return;
    const next = step(draft, round, target, coach);
    setRound(next);
    setLast(next.beats.at(-1)!);
    setCoachCard(next.beats.at(-1)!.coached);
  }
  function endRound() {
    if (!round.result || coachCard) return;
    const nextWins: [number, number] = [
      wins[0] + Number(round.result === "bot"),
      wins[1] + Number(round.result === "partner"),
    ];
    setWins(nextWins);
    if (nextWins[0] === 2) {
      setWhy(false);
      go("reflect");
    } else {
      const rematch = nextWins[1] === 2;
      setRound(
        newRound(rematch ? 0 : round.index + Number(round.result !== "draw")),
      );
      if (rematch) setWins([0, 0]);
      setBenchKey((k) => k + 1);
      go("corner");
    }
  }
  function reflect() {
    if (!why || !draft.reflection) return;
    const next = { ...draft, cleared: Math.max(draft.cleared, floor + 1) };
    update(next);
    keep(next);
    go("card");
  }
  async function finish() {
    if (finishLatch.current || draft.cleared !== 4 || !draft.reflection) return;
    if (!keep()) return;
    finishLatch.current = true;
    setFinishing(true);
    setFinishError(false);
    try {
      const result = await onComplete?.({
        gameKey: "sparbots",
        score: 1,
        total: 1,
        streakMax: 0,
        roundsCompleted: 4,
        gameSpecific: {
          cardsKept: draft.cards.length,
          revisions: draft.revisions,
          reflection: draft.reflection,
        },
      });
      if (result === false) throw new Error("Completion save failed");
      setFinished(true);
    } catch {
      setFinishError(true);
      finishLatch.current = false;
    } finally {
      setFinishing(false);
    }
  }
  const moveButtons = (onMove: (move: Move) => void, coach = false) => (
    <div className="sparbots-moves">
      {MOVES.map((move, i) => (
        <button key={move} onClick={() => onMove(move)}>
          <span aria-hidden="true">{["◎", "↻", "⬡"][i]}</span>
          {t(coach ? `sparbots.coachMoves.${move}` : `sparbots.moves.${move}`)}
        </button>
      ))}
    </div>
  );
  const signals = (signal: Signals) => (
    <div className="sparbots-signals">
      <span>{t(`sparbots.poses.${signal.pose}`)}</span>
      {floor > 0 && (
        <span>
          <Light shape={signal.light} />
          {t(`sparbots.lights.${signal.light}`)}
        </span>
      )}
    </div>
  );
  const beatDescription = (beat: Beat) =>
    t("sparbots.beatResult", {
      bot: beat.move ? t(`sparbots.moves.${beat.move}`) : t("sparbots.noMove"),
      partner: t(`sparbots.moves.${beat.signal.move}`),
      result: t(`sparbots.outcomes.${beat.outcome}`),
    });
  const trace = (beat: Beat) => (
    <div className="sparbots-explain">
      <strong>
        {t(
          beat.coached
            ? "sparbots.coachUsed"
            : `sparbots.confidence.${beat.decision.confidence}`,
        )}
      </strong>
      <p>{beatDescription(beat)}</p>
      {!beat.coached && (
        <p>
          {t("sparbots.usedCards", {
            cards: beat.decision.voters.join(", ") || t("sparbots.none"),
          })}
        </p>
      )}
      {beat.decision.tied && <p>{t("sparbots.tie")}</p>}
    </div>
  );

  return (
    <article
      className="sparbots"
      data-reduced-effects={effects.reducedEffects}
      data-specialty="AI"
    >
      <header className="sparbots-header">
        <div>
          <p className="sparbots-kicker">
            <Sparkles size={16} />
            {t("sparbots.kicker")}
          </p>
          <h1>{t("sparbots.title")}</h1>
        </div>
        <div className="sparbots-actions">
          <label className="sparbots-reduced">
            <input
              type="checkbox"
              checked={effects.reducedEffects}
              onChange={(e) => effects.setReducedEffects(e.target.checked)}
            />
            {t("sparbots.reduced")}
          </label>
          {screen !== "tower" && (
            <button onClick={() => go("tower")}>
              <Layers size={18} />
              {t("sparbots.tower")}
            </button>
          )}
        </div>
      </header>
      <nav className="sparbots-steps" aria-label={t("sparbots.stepsLabel")}>
        {["meet", "show", "corner", "spar", "reflect", "card"].map((s, i) => (
          <span key={s} aria-current={screen === s ? "step" : undefined}>
            <b>{i + 1}</b>
            {t(`sparbots.steps.${s}`)}
          </span>
        ))}
      </nav>
      <h2 ref={heading} tabIndex={-1} className="sparbots-screen-title">
        {t(`sparbots.screens.${screen}`)}
      </h2>
      {saveState && (
        <p role={saveState === "saveError" ? "alert" : "status"}>
          {t(`sparbots.${saveState}`)}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}

      {screen === "tower" && (
        <>
          <div className="sparbots-welcome">
            <div>
              <p className="sparbots-kicker">{t("sparbots.world")}</p>
              <h3>{t("sparbots.tagline")}</h3>
              <p>{t("sparbots.intro")}</p>
              <button
                className="sparbots-primary"
                onClick={() => visit(Math.min(draft.cleared, 3) as Floor)}
              >
                {t("sparbots.start")}
                <ArrowRight size={20} />
              </button>
            </div>
            <Bot />
          </div>
          <div className="sparbots-floors">
            {FLOORS.map((f, i) => (
              <button
                key={f.partner}
                disabled={i > draft.cleared}
                onClick={() => visit(i as Floor)}
              >
                <span className="sparbots-floor-number">
                  {i < draft.cleared ? (
                    <Check />
                  ) : i > draft.cleared ? (
                    <LockKeyhole />
                  ) : (
                    i + 1
                  )}
                </span>
                <span>
                  <small>{t("sparbots.floorNumber", { number: i + 1 })}</small>
                  <strong>{t(`sparbots.partners.${f.partner}`)}</strong>
                  <span>{t(`sparbots.floorIdeas.${f.partner}`)}</span>
                  <small>
                    {t(
                      i < draft.cleared
                        ? "sparbots.revisit"
                        : i > draft.cleared
                          ? "sparbots.floorLocked"
                          : "sparbots.floorOpen",
                    )}
                  </small>
                </span>
              </button>
            ))}
          </div>
          <div className="sparbots-actions">
            <button onClick={() => go("card")}>
              <BookOpen size={18} />
              {t("sparbots.myCard")}
            </button>
          </div>
          <details className="sparbots-teacher">
            <summary>{t("sparbots.teacher")}</summary>
            <p>{t("sparbots.teacherGuide")}</p>
            <p>{t("sparbots.unplugged")}</p>
          </details>
        </>
      )}

      {screen === "meet" && (
        <>
          <div className="sparbots-stage">
            <Bot partner />
            <div>
              <p className="sparbots-kicker">
                {t("sparbots.floorNumber", { number: floor + 1 })}
              </p>
              <h3>{partner}</h3>
              <p>{t(`sparbots.floorHints.${FLOORS[floor].partner}`)}</p>
              <p>{t("sparbots.rules")}</p>
            </div>
          </div>
          <fieldset>
            <legend>{t("sparbots.imagine")}</legend>
            <div className="sparbots-actions">
              {STYLES.map((style) => (
                <button
                  key={style}
                  aria-pressed={draft.style === style}
                  onClick={() => update({ ...draft, style })}
                >
                  {t(`sparbots.styles.${style}`)}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="sparbots-tells">
            {referenceCards(floor, round.index).map((card, i) => {
              const signal = practiceTell(floor, round.index, i);
              return (
                <div key={card.id}>
                  {signals(signal)}
                  <span>
                    {t("sparbots.partnerShows", {
                      move: t(`sparbots.moves.${signal.move}`),
                    })}
                  </span>
                </div>
              );
            })}
          </div>
          <button className="sparbots-primary" onClick={startPractice}>
            {t("sparbots.showExamples")}
            <ArrowRight size={20} />
          </button>
        </>
      )}

      {screen === "show" && (
        <>
          <p>{t("sparbots.practiceBeat", { number: practice + 1 })}</p>
          <div className="sparbots-stage">
            <Bot
              partner
              pose={practiceTell(floor, round.index, practice).pose}
            />
            <div>
              <h3>{partner}</h3>
              {signals(practiceTell(floor, round.index, practice))}
              <p>
                {t("sparbots.partnerShows", {
                  move: t(
                    `sparbots.moves.${practiceTell(floor, round.index, practice).move}`,
                  ),
                })}
              </p>
            </div>
          </div>
          <p>{t("sparbots.rules")}</p>
          {chosenMove === null ? (
            <>
              <h3>{t("sparbots.chooseMove")}</h3>
              {moveButtons(setChosenMove)}
            </>
          ) : (
            <div role="status">
              <p>
                {t("sparbots.practiceResult", {
                  move: t(`sparbots.moves.${chosenMove}`),
                  result: t(
                    `sparbots.outcomes.${outcome(chosenMove, practiceTell(floor, round.index, practice).move)}`,
                  ),
                })}
              </p>
              <div className="sparbots-actions">
                <button
                  className="sparbots-primary"
                  disabled={draft.cards.length >= MAX_CARDS}
                  onClick={() => finishPractice(true)}
                >
                  {t("sparbots.keepCard")}
                </button>
                <button onClick={() => finishPractice(false)}>
                  {t("sparbots.toss")}
                </button>
              </div>
              {draft.cards.length >= MAX_CARDS && (
                <p>{t("sparbots.deckFull")}</p>
              )}
            </div>
          )}
        </>
      )}

      {screen === "corner" && (
        <>
          <p>{t("sparbots.cornerIntro")}</p>
          {floor === 3 && round.index > 0 && (
            <p className="sparbots-callout">{t("sparbots.shift")}</p>
          )}
          {last && (
            <details open>
              <summary>{t("sparbots.noticeBeat")}</summary>
              {signals(last.signal)}
              {trace(last)}
            </details>
          )}
          <div className="sparbots-actions">
            <button
              className="sparbots-primary"
              disabled={editing}
              onClick={() => {
                setRound(newRound(round.index));
                setCoachCard(false);
                setLast(null);
                go("spar");
              }}
            >
              {t("sparbots.train")}
              <Sparkles size={18} />
            </button>
            <button disabled={editing} onClick={startPractice}>
              {t("sparbots.practiceAgain")}
            </button>
            <button disabled={editing} onClick={() => keep()}>
              {t("sparbots.saveVersion")}
            </button>
            <button
              disabled={editing}
              onClick={() => {
                update({
                  ...saved,
                  cleared: Math.max(saved.cleared, draft.cleared),
                });
                setRound(newRound());
                setWins([0, 0]);
                setBenchKey((k) => k + 1);
                setNotice(t("sparbots.restored"));
              }}
            >
              {t("sparbots.restore")}
            </button>
          </div>
          {editing && <p>{t("sparbots.finishEdit")}</p>}
          <CardBench
            key={benchKey}
            draft={draft}
            round={round.index}
            reducedEffects={effects.reducedEffects}
            onKeep={(next) => {
              update(next);
              setBenchKey((k) => k + 1);
            }}
            onBusy={setEditing}
            onExit={() => go("tower")}
          />
        </>
      )}

      {screen === "spar" && (
        <>
          <p>{t("sparbots.botPlays")}</p>
          <p>{t("sparbots.rounds", { bot: wins[0], partner: wins[1] })}</p>
          <div className="sparbots-arena">
            <div>
              <Bot />
              <h3>{name}</h3>
              <meter
                min={0}
                max={target}
                value={round.bot}
                aria-label={t("sparbots.yourSparks")}
              />
              <p>{t("sparbots.sparks", { count: round.bot, target })}</p>
            </div>
            <span className="sparbots-arena-spark" aria-hidden="true">
              ✧
            </span>
            <div>
              <Bot
                partner
                pose={
                  (round.result
                    ? last?.signal
                    : tell(floor, round.index, round.beats.length)
                  )?.pose
                }
              />
              <h3>{partner}</h3>
              <meter
                min={0}
                max={target}
                value={round.partner}
                aria-label={t("sparbots.partnerSparks")}
              />
              <p>{t("sparbots.sparks", { count: round.partner, target })}</p>
            </div>
          </div>
          {last && (
            <div role="status" key={round.beats.length}>
              {trace(last)}
            </div>
          )}
          {coachCard && last?.move && (
            <div className="sparbots-callout">
              <p>{t("sparbots.keepCoach")}</p>
              <div className="sparbots-actions">
                <button
                  disabled={draft.cards.length >= MAX_CARDS}
                  onClick={() => {
                    update({
                      ...draft,
                      cards: addCard(
                        draft.cards,
                        last.signal,
                        last.move!,
                        "coach",
                      ),
                      revisions: Math.min(10000, draft.revisions + 1),
                    });
                    setCoachCard(false);
                  }}
                >
                  {t("sparbots.keepCard")}
                </button>
                <button onClick={() => setCoachCard(false)}>
                  {t("sparbots.toss")}
                </button>
              </div>
              {draft.cards.length >= MAX_CARDS && (
                <p>{t("sparbots.deckFull")}</p>
              )}
            </div>
          )}
          {!round.result ? (
            <>
              <h3>{t("sparbots.nextClue")}</h3>
              {signals(tell(floor, round.index, round.beats.length))}
              {nextDecision(draft, round).confidence === "new" &&
                !round.coachUsed &&
                !coachCard && (
                  <div className="sparbots-callout">
                    <p>{t("sparbots.coachCall")}</p>
                    {moveButtons(playBeat, true)}
                  </div>
                )}
              <div className="sparbots-actions">
                <button
                  className="sparbots-primary"
                  disabled={coachCard}
                  onClick={() => playBeat()}
                >
                  {t("sparbots.nextBeat")}
                  <ArrowRight size={18} />
                </button>
                <button
                  disabled={coachCard}
                  onClick={() => {
                    setBenchKey((k) => k + 1);
                    go("corner");
                  }}
                >
                  {t("sparbots.pause")}
                </button>
              </div>
            </>
          ) : (
            <div className="sparbots-round-end">
              <h3>{t(`sparbots.roundEnd.${round.result}`)}</h3>
              <p>{t("sparbots.tryAgainKindly")}</p>
              <button
                className="sparbots-primary"
                disabled={coachCard}
                onClick={endRound}
              >
                {t(
                  wins[0] === 1 && round.result === "bot"
                    ? "sparbots.showWhy"
                    : "sparbots.toCorner",
                )}
              </button>
            </div>
          )}
        </>
      )}

      {screen === "reflect" && last && (
        <>
          <div className="sparbots-stage">
            <Bot />
            <div>
              <h3>{t("sparbots.replay")}</h3>
              {signals(last.signal)}
              {trace(last)}
            </div>
          </div>
          <h3>{t(last.coached ? "sparbots.whoHelped" : "sparbots.pickWhy")}</h3>
          {last.coached ? (
            <button aria-pressed={why} onClick={() => setWhy(true)}>
              {t("sparbots.coachUsed")}
            </button>
          ) : (
            <div className="sparbots-actions">
              {draft.cards.map((card) => (
                <button
                  key={card.id}
                  aria-pressed={why && last.decision.voters.includes(card.id)}
                  onClick={() => {
                    if (last.decision.voters.includes(card.id)) {
                      setWhy(true);
                      setNotice(t("sparbots.whyFound"));
                    } else setNotice(t("sparbots.whyTry"));
                  }}
                >
                  {t("sparbots.cardNumber", { number: card.id })} ·{" "}
                  {t(`sparbots.moves.${card.move}`)}
                </button>
              ))}
            </div>
          )}
          <fieldset>
            <legend>{t("sparbots.wonder")}</legend>
            {REFLECTIONS.map((reflection) => (
              <label className="sparbots-radio" key={reflection}>
                <input
                  type="radio"
                  name="reflection"
                  checked={draft.reflection === reflection}
                  onChange={() => update({ ...draft, reflection })}
                />
                {t(`sparbots.reflections.${reflection}`)}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>{t("sparbots.friendlyFinish")}</legend>
            <div className="sparbots-actions">
              {FINISHES.map((finish) => (
                <button
                  aria-pressed={draft.finish === finish}
                  key={finish}
                  onClick={() => update({ ...draft, finish })}
                >
                  {t(`sparbots.finishes.${finish}`)}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            className="sparbots-primary"
            disabled={!why || !draft.reflection}
            onClick={reflect}
          >
            {t("sparbots.keepDiscovery")}
          </button>
        </>
      )}

      {screen === "card" && (
        <>
          <div className="sparbots-name-kit">
            <label>
              {t("sparbots.nameStyle")}
              <select
                value={draft.style}
                onChange={(e) =>
                  update({ ...draft, style: e.target.value as Draft["style"] })
                }
              >
                {STYLES.map((style) => (
                  <option key={style} value={style}>
                    {t(`sparbots.styles.${style}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("sparbots.nameBot")}
              <select
                value={draft.name}
                onChange={(e) =>
                  update({ ...draft, name: e.target.value as Draft["name"] })
                }
              >
                {NAMES.map((n) => (
                  <option key={n} value={n}>
                    {t(`sparbots.names.${n}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <section className="sparbots-bot-card">
            <div>
              <p className="sparbots-kicker">{t("sparbots.myCard")}</p>
              <h3>{name}</h3>
              <p>
                {t("sparbots.cardSummary", {
                  cards: draft.cards.length,
                  revisions: draft.revisions,
                })}
              </p>
              <p>
                {t("sparbots.watching", {
                  clue: t(`sparbots.clues.${draft.clue}`),
                })}
              </p>
              <p>{t("sparbots.floorsVisited", { count: draft.cleared })}</p>
              <p>{t(`sparbots.finishes.${draft.finish}`)} ✧</p>
            </div>
            <Bot />
            <ul>
              {(draft.clue === "pose" ? POSES : LIGHTS).map((value) => (
                <li key={value}>
                  {t(
                    `sparbots.${draft.clue === "pose" ? "poses" : "lights"}.${value}`,
                  )}
                  :{" "}
                  {t(
                    draft.cards.some((c) => c[draft.clue] === value)
                      ? "sparbots.trained"
                      : "sparbots.unknown",
                  )}
                </li>
              ))}
            </ul>
            {draft.reflection && (
              <p>{t(`sparbots.reflections.${draft.reflection}`)}</p>
            )}
          </section>
          <p>{t("sparbots.localOnly")}</p>
          <div className="sparbots-actions">
            <button onClick={() => keep()}>{t("sparbots.saveVersion")}</button>
            <button onClick={() => window.print()}>
              <Printer size={18} />
              {t("sparbots.print")}
            </button>
            <button onClick={() => go("tower")}>
              {t("sparbots.nextFloor")}
              <ArrowRight size={18} />
            </button>
          </div>
          {draft.cleared === 4 && (
            <button
              className="sparbots-primary"
              disabled={finishing || finished || !draft.reflection}
              onClick={finish}
            >
              {t(
                finished
                  ? "sparbots.finished"
                  : finishing
                    ? "sparbots.finishing"
                    : "sparbots.finish",
              )}
            </button>
          )}
          {finishError && <p role="alert">{t("sparbots.finishError")}</p>}
        </>
      )}
    </article>
  );
}
