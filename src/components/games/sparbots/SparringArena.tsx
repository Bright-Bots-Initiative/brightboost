import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  Copy,
  Hand,
  Layers,
  RotateCcw,
  Sparkle,
} from "lucide-react";
import { Bot, ClueMark, MoveMark } from "./Bot";
import type { Beat, Clue, Draft, Round, Signals } from "./model";

/** The meter and filled sockets describe the score even during an animation. */
function SparkScore({
  count,
  target,
  label,
  arrival,
}: {
  count: number;
  target: number;
  label: string;
  arrival?: string;
}) {
  const { t } = useTranslation();
  const description = t("sparbots.sparks", { count, target });
  return (
    <div className="sparbots-score">
      <meter
        className="sr-only"
        min={0}
        max={target}
        value={count}
        aria-label={label}
        aria-valuetext={description}
      />
      <div className="sparbots-sockets" aria-hidden="true">
        {Array.from({ length: target }, (_, index) => (
          <span
            key={index}
            className="sparbots-socket"
            data-filled={index < count}
          >
            <Sparkle />
            {arrival !== undefined && index === count - 1 && (
              <Sparkle key={arrival} className="sparbots-spark-flight" />
            )}
          </span>
        ))}
      </div>
      <p aria-hidden="true">{description}</p>
    </div>
  );
}

function DecisionStrip({ beat, clue }: { beat: Beat; clue: Clue }) {
  const { t } = useTranslation();
  const votes = beat.decision.voters;
  const source = beat.coached
    ? t("sparbots.coachPick")
    : !beat.move
      ? t("sparbots.noCards")
      : !beat.decision.matching.length
        ? t("sparbots.otherCards")
        : votes.length === 1
          ? t("sparbots.cardNumber", { number: votes[0] })
          : t("sparbots.votingCards", { count: votes.length });
  return (
    <ol className="sparbots-decision" aria-label={t("sparbots.decisionPath")}>
      <li>
        <ClueMark clue={clue} signal={beat.signal} />
        {t(
          clue === "pose"
            ? `sparbots.poses.${beat.signal.pose}`
            : `sparbots.lights.${beat.signal.light}`,
        )}
      </li>
      <li>
        <ChevronRight className="sparbots-link" aria-hidden="true" />
        {beat.coached ? (
          <Hand aria-hidden="true" />
        ) : (
          <Copy aria-hidden="true" />
        )}
        {source}
      </li>
      <li>
        <ChevronRight className="sparbots-link" aria-hidden="true" />
        <MoveMark move={beat.move} />
        {beat.move ? t(`sparbots.moves.${beat.move}`) : t("sparbots.noMove")}
      </li>
    </ol>
  );
}

/** Replays read the resolved beat. This component cannot step or save the game. */
export default function SparringArena({
  draft,
  round,
  target,
  botName,
  partnerName,
  nextSignal,
}: {
  draft: Draft;
  round: Round;
  target: number;
  botName: string;
  partnerName: string;
  nextSignal: Signals;
}) {
  const { t } = useTranslation();
  const last = round.beats.at(-1);
  const number = round.beats.length;
  const [replay, setReplay] = useState({ beat: 0, take: 0 });
  const take = replay.beat === number ? replay.take : 0;
  const clip = `${number}:${take}`;
  const caption = last
    ? t(take ? "sparbots.replayBeat" : "sparbots.lastBeat", { number })
    : t("sparbots.readyBeat");
  return (
    <div className="sparbots-arena">
      <div className="sparbots-arena-caption">
        <div className="sparbots-beat-title">
          <strong>
            {!take && caption}
            <span aria-live="polite" aria-atomic="true">
              {take > 0 && <span key={take}>{caption}</span>}
            </span>
          </strong>
          {last && (
            <small>
              {last.outcome === "bump"
                ? t("sparbots.bumpLabel")
                : t("sparbots.sparkFor", {
                    name: last.outcome === "bot" ? botName : partnerName,
                  })}
            </small>
          )}
        </div>
        <button
          type="button"
          disabled={!last}
          onClick={() =>
            setReplay((previous) => ({
              beat: number,
              take: (previous.beat === number ? previous.take : 0) + 1,
            }))
          }
        >
          <RotateCcw size={17} aria-hidden="true" />
          {t("sparbots.watchAgain")}
        </button>
      </div>
      <div className="sparbots-duel">
        {(["bot", "partner"] as const).map((side) => {
          const partner = side === "partner";
          const move = (partner ? last?.signal.move : last?.move) ?? null;
          return (
            <div key={side} className="sparbots-fighter" data-side={side}>
              <div className="sparbots-avatar">
                <Bot
                  key={clip}
                  partner={partner}
                  pose={partner ? (last?.signal ?? nextSignal).pose : undefined}
                  motion={last ? (move ?? "still") : partner ? "idle" : "train"}
                />
                {!partner && !last && (
                  <div className="sparbots-training" aria-hidden="true">
                    {draft.cards.slice(0, 3).map((card) => (
                      <span key={card.id}>
                        <ClueMark clue={draft.clue} signal={card} />
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <h3>{partner ? partnerName : botName}</h3>
              {last && (
                <p className="sparbots-move-label">
                  <MoveMark move={move} />{" "}
                  {move ? t(`sparbots.moves.${move}`) : t("sparbots.noMove")}
                </p>
              )}
              <SparkScore
                count={round[side]}
                target={target}
                label={t(
                  partner ? "sparbots.partnerSparks" : "sparbots.yourSparks",
                )}
                arrival={last?.outcome === side ? clip : undefined}
              />
            </div>
          );
        })}
        <div className="sparbots-meeting" aria-hidden="true">
          {last?.outcome === "bump" ? (
            <svg key={clip} viewBox="0 0 36 26" className="sparbots-bump">
              <circle
                className="sparbots-bump-left"
                cx="9"
                cy="13"
                r="6"
                fill="#ee7962"
              />
              <circle
                className="sparbots-bump-right"
                cx="27"
                cy="13"
                r="6"
                fill="#77c6c1"
              />
            </svg>
          ) : (
            <Sparkle />
          )}
        </div>
      </div>
      {last ? (
        <DecisionStrip key={clip} beat={last} clue={draft.clue} />
      ) : (
        <p className="sparbots-watching">
          <Layers size={17} aria-hidden="true" />
          {t("sparbots.watching", { clue: t(`sparbots.clues.${draft.clue}`) })}
        </p>
      )}
    </div>
  );
}
