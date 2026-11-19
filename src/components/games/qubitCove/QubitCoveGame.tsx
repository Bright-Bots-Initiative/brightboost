import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Atom,
  Check,
  ChevronRight,
  ChevronsUp,
  CircleHelp,
  Compass,
  Flag,
  FlaskConical,
  Gem,
  Keyboard,
  Map,
  Mountain,
  RadioTower,
  RotateCcw,
  ScanLine,
  Sparkles,
  Sprout,
  Telescope,
  Waves,
  X,
} from "lucide-react";
import type { GameResult } from "../shared/GameShell";
import { useReducedGameEffects } from "../shared/useReducedGameEffects";
import { createGame, guideToBeacon, lightBeacon } from "./engine";
import { beacons, type BeaconId } from "./world";
import { useCovePlay, type Control } from "./useCovePlay";
import ReadAloud from "./ReadAloud";
import "./qubitCove.css";

type Props = {
  storageScope: string;
  embedded?: boolean;
  onReplay?: () => void;
  onComplete?: (result: GameResult) => void | boolean | Promise<boolean | void>;
};
type Panel = "map" | "help" | BeaconId | null;
type Bit = 0 | 1;
type Readings = Record<BeaconId, Bit[]>;
const freshReadings = (): Readings => ({ zero: [], one: [], mix: [] });
const directionIcons = {
  left: ArrowLeft,
  up: ArrowUp,
  down: ArrowDown,
  right: ArrowRight,
  jump: ChevronsUp,
};
const places = { zero: Sprout, one: Mountain, mix: Waves };
const symbols = { zero: "0", one: "1", mix: "0/1" };

function ReadingsStrip({ samples, count }: { samples: Bit[]; count: number }) {
  const { t } = useTranslation();
  return (
    <div className="qc-readings">
      <span>{t("qubitCove.readings")}</span>
      <ol>
        {Array.from({ length: count }, (_, i) => (
          <li key={i} data-full={samples[i] !== undefined}>
            {samples[i] ?? <span aria-hidden="true">·</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function BeaconLab({
  id,
  language,
  samples,
  lit,
  onSample,
  onLight,
  onClose,
}: {
  id: BeaconId;
  language?: string;
  samples: Bit[];
  lit: boolean;
  onSample: (value: Bit) => void;
  onLight: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [prepared, setPrepared] = useState(false);
  const [incorrect, setIncorrect] = useState(false);
  const target = id === "mix" ? 3 : 1;
  const enough = samples.length >= target;
  const last = samples.at(-1);
  const name = t(`qubitCove.names.${id}`);
  const setup = t(`qubitCove.setup.${id}`);
  const insight = t(`qubitCove.insight.${id}`);
  const status = prepared
    ? t("qubitCove.ready")
    : last === undefined
      ? ""
      : t("qubitCove.reading", { value: last });
  const question = t("qubitCove.prediction");
  const speech = lit
    ? `${t("qubitCove.beaconLit", { name })} ${insight}`
    : enough
      ? [
          status,
          question,
          ...beacons.map((b) => t(`qubitCove.choices.${b.id}`)),
        ].join(" ")
      : [
          setup,
          status,
          t(prepared ? "qubitCove.measure" : "qubitCove.prepare"),
        ].join(" ");
  const Icon = places[id];

  function sample() {
    if (enough || !prepared) return;
    onSample(
      id === "mix" ? (Math.random() < 0.5 ? 0 : 1) : id === "one" ? 1 : 0,
    );
    setPrepared(false);
  }
  function choose(choice: BeaconId) {
    if (choice !== id) setIncorrect(true);
    else {
      setIncorrect(false);
      onLight();
    }
  }

  return (
    <div className="qc-lab" data-beacon={id}>
      <div className="qc-dialog-title">
        <span className="qc-place-icon">
          <Icon aria-hidden="true" />
        </span>
        <Dialog.Title>{name}</Dialog.Title>
      </div>
      <div className="qc-instrument" data-ready={prepared} data-lit={lit}>
        <span className="qc-instrument-rim" aria-hidden="true">
          <i />
          <i />
          <i />
          <b>
            {lit ? <RadioTower /> : prepared ? <Atom /> : (last ?? symbols[id])}
          </b>
        </span>
        <div className="qc-lab-copy">
          <Dialog.Description>{lit ? insight : setup}</Dialog.Description>
          <ReadAloud text={speech} language={language} />
        </div>
      </div>
      <ReadingsStrip samples={samples} count={target} />
      <p className="qc-lab-status" role="status">
        {lit ? t("qubitCove.beaconLit", { name }) : status}
      </p>
      {lit ? (
        <button className="qc-primary" onClick={onClose}>
          <Check aria-hidden="true" />
          {t("qubitCove.explore")}
        </button>
      ) : enough ? (
        <div className="qc-question">
          <h3>{question}</h3>
          <div className="qc-choices">
            {beacons.map(({ id: choice }) => (
              <button key={choice} onClick={() => choose(choice)}>
                {t(`qubitCove.choices.${choice}`)}
              </button>
            ))}
          </div>
          {incorrect && <p role="status">{t("qubitCove.retry")}</p>}
        </div>
      ) : (
        <button
          className="qc-primary"
          onClick={prepared ? sample : () => setPrepared(true)}
        >
          {prepared ? (
            <ScanLine aria-hidden="true" />
          ) : (
            <FlaskConical aria-hidden="true" />
          )}
          {t(
            prepared
              ? "qubitCove.measure"
              : samples.length
                ? "qubitCove.prepareAgain"
                : "qubitCove.prepare",
          )}
        </button>
      )}
    </div>
  );
}

export default function QubitCoveGame({ storageScope, ...props }: Props) {
  return <CoveAdventure key={storageScope} {...props} />;
}

function CoveAdventure({
  embedded = false,
  onReplay,
  onComplete,
}: Omit<Props, "storageScope">) {
  const { t, i18n } = useTranslation();
  // A previously saved vi/zh-CN preference can load after i18next resolved
  // the page's fallback language. Ask which locale supplied the game title.
  const gameLanguage =
    t("qubitCove.title", { returnDetails: true }).usedLng ||
    i18n?.resolvedLanguage ||
    i18n?.language;
  const [panel, setPanel] = useState<Panel>(null);
  const [readings, setReadings] = useState(freshReadings);
  const [submission, setSubmission] = useState<
    "idle" | "busy" | "saved" | "error"
  >("idle");
  const latched = useRef(false);
  const introId = useId();
  const victory = useRef<HTMLHeadingElement>(null);
  const { reducedEffects, setReducedEffects } = useReducedGameEffects();
  const { canvas, region, world, hud, update, press, release, pulse } =
    useCovePlay(panel !== null, reducedEffects, setPanel, embedded);
  const won = hud.lit.length === 3;
  const activeBeacon =
    panel && panel !== "map" && panel !== "help" ? panel : null;

  function ride(id: BeaconId) {
    update(guideToBeacon(world.current, id));
    setPanel(null);
  }
  function replay() {
    if (submission === "busy") return;
    update(createGame());
    setReadings(freshReadings());
    setSubmission("idle");
    latched.current = false;
    canvas.current?.focus({ preventScroll: true });
    onReplay?.();
  }
  async function finish() {
    if (latched.current || world.current.lit.length !== 3) return;
    latched.current = true;
    setSubmission("busy");
    try {
      const ok = await onComplete?.({
        gameKey: "qubit_cove",
        score: 3,
        total: 3,
        roundsCompleted: 3,
        streakMax: 0,
        starsEarned: 3,
      });
      if (ok === false) throw new Error("Completion failed");
      setSubmission("saved");
    } catch {
      latched.current = false;
      setSubmission("error");
    }
  }

  function controlButton(control: Control) {
    const Icon = directionIcons[control];
    return (
      <button
        key={control}
        className={`qc-control qc-${control}`}
        type="button"
        aria-label={t(`qubitCove.${control}`)}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          if (embedded) canvas.current?.focus({ preventScroll: true });
          event.currentTarget.setPointerCapture(event.pointerId);
          press(event.pointerId, control);
        }}
        onLostPointerCapture={(event) => release(event.pointerId)}
        onPointerUp={(event) => release(event.pointerId)}
        onPointerCancel={(event) => release(event.pointerId)}
        onContextMenu={(event) => event.preventDefault()}
        onClick={(event) => {
          if (event.detail === 0) pulse(control);
        }}
      >
        <Icon aria-hidden="true" />
        {control === "jump" && <span>{t("qubitCove.jump")}</span>}
      </button>
    );
  }

  return (
    <section
      className="qc-game"
      lang={gameLanguage}
      aria-label={t("qubitCove.title")}
      ref={region}
      data-reduced={reducedEffects}
    >
      <header className="qc-header">
        <div className="qc-wordmark">
          <span className="qc-emblem">
            <Compass aria-hidden="true" />
          </span>
          <div>
            <h2>{t("qubitCove.title")}</h2>
            <p id={introId}>{t("qubitCove.goal")}</p>
          </div>
        </div>
        <div className="qc-tools">
          <button
            className="qc-help-button"
            type="button"
            aria-label={t("qubitCove.help")}
            title={t("qubitCove.help")}
            onClick={() => setPanel("help")}
          >
            <CircleHelp aria-hidden="true" />
          </button>
          <button
            className="qc-map-button"
            type="button"
            onClick={() => setPanel("map")}
          >
            <Map aria-hidden="true" />
            {t("qubitCove.map")}
          </button>
        </div>
      </header>
      <div className="qc-stage">
        <canvas
          ref={canvas}
          role="img"
          tabIndex={0}
          aria-label={t("qubitCove.canvas")}
          aria-describedby={introId}
          onPointerDown={() => canvas.current?.focus({ preventScroll: true })}
        />
        <div className="qc-hud" aria-live="polite" aria-atomic="true">
          <span
            className="qc-counter"
            role="img"
            aria-label={t("qubitCove.lights", { count: hud.lit.length })}
            title={t("qubitCove.lights", { count: hud.lit.length })}
          >
            <RadioTower aria-hidden="true" />
            <b aria-hidden="true">
              {hud.lit.length}
              <small>/3</small>
            </b>
          </span>
          <span
            className="qc-counter qc-crystals"
            role="img"
            aria-label={t("qubitCove.sparks", { count: hud.sparks })}
            title={t("qubitCove.sparks", { count: hud.sparks })}
          >
            <Gem
              aria-hidden="true"
              key={hud.sparks}
              className={hud.sparks ? "qc-spark-gain" : undefined}
            />
            <b aria-hidden="true">{hud.sparks}</b>
          </span>
        </div>
        {hud.near && (
          <button className="qc-interact" onClick={() => setPanel(hud.near)}>
            <RadioTower aria-hidden="true" />
            {t("qubitCove.use")}
            <kbd aria-hidden="true">E</kbd>
          </button>
        )}
      </div>
      {won && (
        <section className="qc-victory">
          <div className="qc-victory-title">
            <span>
              <Telescope aria-hidden="true" />
            </span>
            <h3 ref={victory} tabIndex={-1}>
              {t("qubitCove.won")}
            </h3>
          </div>
          <div className="qc-victory-actions">
            <button
              className="qc-replay"
              onClick={replay}
              disabled={submission === "busy"}
            >
              <RotateCcw aria-hidden="true" />
              {t("qubitCove.replay")}
            </button>
            <button
              className="qc-primary"
              onClick={finish}
              disabled={submission === "busy" || submission === "saved"}
            >
              <Flag aria-hidden="true" />
              {t(
                submission === "saved" ? "qubitCove.saved" : "qubitCove.finish",
              )}
            </button>
          </div>
          {submission === "error" && (
            <p role="alert">{t("qubitCove.saveError")}</p>
          )}
        </section>
      )}
      <div
        className="qc-controls"
        role="group"
        aria-label={t("qubitCove.controls")}
      >
        <div className="qc-pad">
          {(["up", "left", "down", "right"] as const).map(controlButton)}
        </div>
        <p className="qc-key-hint">
          <Keyboard aria-hidden="true" />
          {t("qubitCove.keyboard")}
        </p>
        {controlButton("jump")}
      </div>
      <Dialog.Root
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="qc-scrim" />
          <Dialog.Content
            className="qc-dialog"
            lang={gameLanguage}
            data-reduced={reducedEffects}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const target = won ? victory.current : canvas.current;
              target?.focus({ preventScroll: true });
            }}
          >
            <Dialog.Close className="qc-x" aria-label={t("qubitCove.close")}>
              <X aria-hidden="true" />
            </Dialog.Close>
            {panel === "map" && (
              <>
                <div className="qc-dialog-title">
                  <span className="qc-place-icon">
                    <Compass aria-hidden="true" />
                  </span>
                  <Dialog.Title>{t("qubitCove.map")}</Dialog.Title>
                </div>
                <Dialog.Description>
                  {t("qubitCove.mapHint")}
                </Dialog.Description>
                <div className="qc-itinerary">
                  {beacons.map(({ id }) => {
                    const Icon = places[id];
                    const name = t(`qubitCove.names.${id}`);
                    const lit = hud.lit.includes(id);
                    return (
                      <button
                        key={id}
                        data-beacon={id}
                        onClick={() => ride(id)}
                        aria-label={`${t("qubitCove.visit", { name })}. ${t(lit ? "qubitCove.lit" : "qubitCove.unlit")}`}
                      >
                        <span className="qc-map-token">
                          <Icon aria-hidden="true" />
                        </span>
                        <strong>{name}</strong>
                        <span className="qc-map-mark" aria-hidden="true">
                          {lit ? <Check /> : symbols[id]}
                        </span>
                        <ChevronRight aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {panel === "help" && (
              <>
                <div className="qc-dialog-title">
                  <span className="qc-place-icon">
                    <Sparkles aria-hidden="true" />
                  </span>
                  <Dialog.Title>{t("qubitCove.help")}</Dialog.Title>
                </div>
                <Dialog.Description>{t("qubitCove.goal")}</Dialog.Description>
                <div className="qc-help-body">
                  <p>
                    <Atom aria-hidden="true" />
                    {t("qubitCove.aboutQubits")}
                  </p>
                  <p>
                    <Compass aria-hidden="true" />
                    {t("qubitCove.touch")}
                  </p>
                  <p>
                    <Keyboard aria-hidden="true" />
                    {t("qubitCove.keyboard")}
                  </p>
                  <p>
                    <ChevronsUp aria-hidden="true" />
                    {t("qubitCove.cometJump")}
                  </p>
                  <ReadAloud
                    language={gameLanguage}
                    text={[
                      "goal",
                      "aboutQubits",
                      "touch",
                      "keyboard",
                      "cometJump",
                    ]
                      .map((key) => t(`qubitCove.${key}`))
                      .join(" ")}
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={reducedEffects}
                      onChange={(e) => setReducedEffects(e.target.checked)}
                    />
                    {t("qubitCove.reduced")}
                  </label>
                </div>
              </>
            )}
            {activeBeacon && (
              <BeaconLab
                key={activeBeacon}
                id={activeBeacon}
                language={gameLanguage}
                samples={readings[activeBeacon]}
                lit={hud.lit.includes(activeBeacon)}
                onSample={(value) =>
                  setReadings((old) => ({
                    ...old,
                    [activeBeacon]: [...old[activeBeacon], value],
                  }))
                }
                onLight={() => update(lightBeacon(world.current, activeBeacon))}
                onClose={() => setPanel(null)}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
