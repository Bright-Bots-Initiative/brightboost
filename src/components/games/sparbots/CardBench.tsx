import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SafeExplorationControls } from "../shared/safeExploration";
import {
  addCard,
  CLUES,
  decide,
  FLOORS,
  LIGHTS,
  MAX_CARDS,
  MOVES,
  POSES,
  practiceTell,
  type Draft,
  type Floor,
  type Move,
  type Signals,
} from "./model";

export default function CardBench({
  draft,
  round,
  reducedEffects,
  onKeep,
  onBusy,
  onExit,
}: {
  draft: Draft;
  round: number;
  reducedEffects: boolean;
  onKeep: (draft: Draft) => void;
  onBusy: (busy: boolean) => void;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const [candidate, setCandidate] = useState(draft);
  const [edited, setEdited] = useState(false);
  const [tried, setTried] = useState(false);
  const [pose, setPose] = useState<Signals["pose"]>("up");
  const [light, setLight] = useState<Signals["light"]>("triangle");
  const [move, setMove] = useState<Move>("tap");
  function edit(next: Draft) {
    setCandidate(next);
    setEdited(true);
    onBusy(true);
  }
  function restore() {
    setCandidate(draft);
    setEdited(false);
    setTried(false);
    onBusy(false);
  }
  return (
    <section className="sparbots-bench" aria-label={t("sparbots.bench")}>
      <h3>{t("sparbots.bench")}</h3>
      <p>{t("sparbots.oneChange")}</p>
      <fieldset disabled={edited}>
        <legend>{t("sparbots.watchClue")}</legend>
        <div className="sparbots-actions">
          {(draft.floor === 0 ? ["pose" as const] : CLUES).map((clue) => (
            <button
              key={clue}
              aria-pressed={candidate.clue === clue}
              onClick={() => {
                if (clue !== candidate.clue) edit({ ...candidate, clue });
              }}
            >
              {t(`sparbots.clues.${clue}`)}
            </button>
          ))}
        </div>
        <div className="sparbots-cards">
          {candidate.cards.map((card) => (
            <div className="sparbots-card" key={card.id}>
              <strong>{t("sparbots.cardNumber", { number: card.id })}</strong>
              <span>
                {t(`sparbots.poses.${card.pose}`)} ·{" "}
                {t(`sparbots.lights.${card.light}`)}
              </span>
              <label>
                {t("sparbots.cardMove", { number: card.id })}
                <select
                  value={card.move}
                  onChange={(e) =>
                    edit({
                      ...candidate,
                      cards: candidate.cards.map((c) =>
                        c.id === card.id
                          ? {
                              ...c,
                              move: e.target.value as Move,
                              sparked: false,
                            }
                          : c,
                      ),
                    })
                  }
                >
                  {MOVES.map((m) => (
                    <option key={m} value={m}>
                      {t(`sparbots.moves.${m}`)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() =>
                  edit({
                    ...candidate,
                    cards: candidate.cards.filter((c) => c.id !== card.id),
                  })
                }
              >
                {t("sparbots.tossCard", { number: card.id })}
              </button>
            </div>
          ))}
        </div>
        {candidate.cards.length < MAX_CARDS ? (
          <div className="sparbots-add-card">
            <h4>{t("sparbots.addCard")}</h4>
            <label>
              {t("sparbots.clues.pose")}
              <select
                value={pose}
                onChange={(e) => setPose(e.target.value as Signals["pose"])}
              >
                {POSES.map((p) => (
                  <option key={p} value={p}>
                    {t(`sparbots.poses.${p}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("sparbots.clues.light")}
              <select
                value={light}
                onChange={(e) => setLight(e.target.value as Signals["light"])}
              >
                {LIGHTS.map((l) => (
                  <option key={l} value={l}>
                    {t(`sparbots.lights.${l}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("sparbots.chooseMove")}
              <select
                value={move}
                onChange={(e) => setMove(e.target.value as Move)}
              >
                {MOVES.map((m) => (
                  <option key={m} value={m}>
                    {t(`sparbots.moves.${m}`)}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() =>
                edit({
                  ...candidate,
                  cards: addCard(
                    candidate.cards,
                    { pose, light, move },
                    move,
                    "practice",
                  ).map((c) =>
                    candidate.cards.some((old) => old.id === c.id)
                      ? c
                      : { ...c, sparked: false },
                  ),
                })
              }
            >
              {t("sparbots.addCard")}
            </button>
          </div>
        ) : (
          <p>{t("sparbots.deckFull")}</p>
        )}
      </fieldset>
      {edited && (
        <>
          {tried && (
            <ul
              className="sparbots-preview"
              aria-label={t("sparbots.previewCards")}
            >
              {[0, 1, 2].map((i) => {
                const signal = practiceTell(draft.floor as Floor, round, i);
                const decision = decide(
                  candidate.cards,
                  candidate.clue,
                  signal,
                  FLOORS[draft.floor].seed + i,
                );
                return (
                  <li key={i}>
                    {t(
                      `sparbots.${candidate.clue === "pose" ? "poses" : "lights"}.${signal[candidate.clue]}`,
                    )}{" "}
                    →{" "}
                    {decision.move
                      ? t(`sparbots.moves.${decision.move}`)
                      : t("sparbots.noMove")}
                  </li>
                );
              })}
            </ul>
          )}
          <SafeExplorationControls
            surfaceId="sparbots-bench"
            band="k2"
            baseline={{ id: "playbook", label: t("sparbots.playbook") }}
            reducedEffects={reducedEffects}
            onRun={() => {
              setTried(true);
              return { status: "ok", summary: t("sparbots.trialSummary") };
            }}
            onKeep={() => {
              onKeep({
                ...candidate,
                revisions: Math.min(10000, draft.revisions + 1),
              });
              onBusy(false);
            }}
            onRestore={restore}
            onTryAgain={restore}
            onExit={onExit}
          />
          {!tried && <button onClick={restore}>{t("sparbots.undo")}</button>}
        </>
      )}
    </section>
  );
}
