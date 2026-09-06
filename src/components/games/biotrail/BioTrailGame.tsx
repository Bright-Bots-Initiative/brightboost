import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flag,
  Leaf,
  LockKeyhole,
  Map,
  Printer,
  Save,
  Sparkles,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameResult } from "../shared/GameShell";
import { useReducedGameEffects } from "../shared/useReducedGameEffects";
import {
  STARTER,
  ISLAND_IDS,
  LEVELS,
  isIslandOpen,
  parseBuild,
  type Build,
  type IslandId,
  type Tool,
} from "./model";
import { Field } from "./Field";
import "./biotrail.css";
type Props = {
  config?: { gradeBand?: string };
  storageScope: string;
  onComplete?: (result: GameResult) => void | boolean | Promise<void | boolean>;
};
export default function BioTrailGame({
  config,
  storageScope,
  onComplete,
}: Props) {
  const { t } = useTranslation();
  const key = `brightboost:biotrail:v1:${storageScope}`;
  const [build, setBuild] = useState<Build>(() => {
    try {
      return parseBuild(localStorage.getItem(key)) ?? { ...STARTER };
    } catch {
      return { ...STARTER };
    }
  });
  const [screen, setScreen] = useState<
    "map" | "workshop" | "field" | "observations" | "result" | "keep"
  >("map");
  const [island, setIsland] = useState<IslandId>("meadow");
  const [assisted, setAssisted] = useState(false);
  const [observation, setObservation] = useState(0);
  const [prediction, setPrediction] = useState("");
  const [saveStatus, setSaveStatus] = useState<"" | "saved" | "error">("");
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState(false);
  const [finished, setFinished] = useState(false);
  const effects = useReducedGameEffects();
  const level = LEVELS[island];
  const older = config?.gradeBand === "g3_5";
  function keep(next: Build = build) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }
  function change(patch: Partial<Build>) {
    setBuild((b) => ({ ...b, ...patch }));
    setSaveStatus("");
  }
  function visit(id: IslandId) {
    if (!isIslandOpen(id, build.completed)) return;
    setIsland(id);
    setPrediction("");
    setScreen("workshop");
    setSaveStatus("");
  }
  function fieldComplete() {
    const next = {
      ...build,
      completed: [...new Set([...build.completed, island])],
    };
    setBuild(next);
    keep(next);
    setScreen("result");
  }
  async function finish() {
    if (
      finishing ||
      finished ||
      !build.completed.includes("lab") ||
      !build.reflection
    )
      return;
    setFinishing(true);
    setFinishError(false);
    keep();
    try {
      const saved = await onComplete?.({
        gameKey: "biotrail",
        score: 1,
        total: 1,
        streakMax: 0,
        roundsCompleted: build.completed.length,
      });
      if (saved === false) throw new Error("Save failed");
      setFinished(true);
    } catch {
      setFinishError(true);
    } finally {
      setFinishing(false);
    }
  }
  const toolButton = (tool: Tool) => (
    <button
      key={tool}
      className="biotrail-tool"
      aria-pressed={build.tool === tool}
      onClick={() => change({ tool })}
    >
      {tool === "spring" ? <Leaf size={32} /> : <Wind size={32} />}
      <strong>{t(`biotrail.tools.${tool}.name`)}</strong>
      <span>{t(`biotrail.tools.${tool}.description`)}</span>
      <small>{t(`biotrail.tools.${tool}.effect`)}</small>
      {build.tool === tool && <Check size={20} />}
    </button>
  );
  return (
    <article className="biotrail" data-specialty="BIOTECH">
      <header className="biotrail-header">
        <div>
          <p className="specialty-eyebrow">
            <Leaf size={16} />
            {t("biotrail.kicker")}
          </p>
          <h1>{t("biotrail.title")}</h1>
        </div>
        <div className="biotrail-header-actions">
          <label>
            <input
              type="checkbox"
              checked={effects.reducedEffects}
              onChange={(e) => effects.setReducedEffects(e.target.checked)}
            />
            {t("biotrail.reduced")}
          </label>
          {screen !== "map" && (
            <Button variant="outline" onClick={() => setScreen("map")}>
              <Map size={17} />
              {t("biotrail.map")}
            </Button>
          )}
        </div>
      </header>
      <nav className="biotrail-spiral" aria-label={t("biotrail.stepsLabel")}>
        {["imagine", "create", "play", "share", "reflect"].map((step, i) => (
          <span key={step}>
            <b>{i + 1}</b>
            {t(`biotrail.steps.${step}`)}
          </span>
        ))}
      </nav>
      {screen === "map" && (
        <>
          <div className="biotrail-welcome">
            <div>
              <p className="specialty-eyebrow">{t("biotrail.world")}</p>
              <h2>{t("biotrail.mapTitle")}</h2>
              <p>{t("biotrail.tagline")}</p>
            </div>
            <span className="biotrail-passport">
              <Flag size={23} />
              {t("biotrail.visited", {
                count: build.completed.length,
                total: 4,
              })}
            </span>
          </div>
          <div className="biotrail-map" aria-label={t("biotrail.mapTitle")}>
            <svg
              className="biotrail-map-paths"
              viewBox="0 0 900 270"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M135 135 C250 135 270 65 450 65 S660 135 765 135 M135 135 C260 135 280 220 450 220 S640 135 765 135" />
            </svg>
            {ISLAND_IDS.map((id, i) => {
              const open = isIslandOpen(id, build.completed),
                done = build.completed.includes(id);
              return (
                <button
                  key={id}
                  className={`biotrail-island biotrail-island-${id}`}
                  disabled={!open}
                  onClick={() => visit(id)}
                >
                  <span className="biotrail-island-orb">
                    {done ? (
                      <Check size={32} />
                    ) : open ? (
                      id === "canopy" ? (
                        <Wind size={32} />
                      ) : id === "lab" ? (
                        <Sparkles size={32} />
                      ) : (
                        <Leaf size={32} />
                      )
                    ) : (
                      <LockKeyhole size={29} />
                    )}
                  </span>
                  <small>{t("biotrail.islandNumber", { number: i + 1 })}</small>
                  <strong>{t(`biotrail.islands.${id}.name`)}</strong>
                  <span>
                    {t(
                      done
                        ? "biotrail.revisit"
                        : open
                          ? "biotrail.explore"
                          : "biotrail.lockedIsland",
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="biotrail-bottom-notes">
            <p>
              <strong>{t("biotrail.pathTitle")}</strong>{" "}
              {t("biotrail.pathDescription")}
            </p>
            <Button variant="outline" onClick={() => setScreen("keep")}>
              <Save size={17} />
              {t("biotrail.myBuild")}
            </Button>
          </div>
          <p className="biotrail-science">{t("biotrail.science")}</p>
        </>
      )}
      {screen === "workshop" && (
        <div className="biotrail-workshop">
          <section>
            <p className="specialty-eyebrow">{t("biotrail.workshop")}</p>
            <h2>{t(`biotrail.islands.${island}.name`)}</h2>
            <p>{t(`biotrail.islands.${island}.challenge`)}</p>
            <div className="biotrail-tool-grid">
              {(["spring", "glide"] as Tool[]).map(toolButton)}
            </div>
            <p className="biotrail-hint">
              {t("biotrail.suggested", {
                tool: t(`biotrail.tools.${level.suggested}.name`),
              })}
            </p>
            {older && (
              <fieldset className="biotrail-prediction">
                <legend>{t("biotrail.predict")}</legend>
                {["higher", "slower"].map((p) => (
                  <label key={p}>
                    <input
                      type="radio"
                      name="biotrail-prediction"
                      checked={prediction === p}
                      onChange={() => setPrediction(p)}
                    />
                    {t(`biotrail.reflections.${p}`)}
                  </label>
                ))}
              </fieldset>
            )}
            <label className="biotrail-assist">
              <input
                type="checkbox"
                checked={assisted}
                onChange={(e) => setAssisted(e.target.checked)}
              />
              <span>
                <strong>{t("biotrail.assist")}</strong>
                <small>{t("biotrail.assistDescription")}</small>
              </span>
            </label>
            <Button
              className="specialty-primary"
              disabled={older && !prediction}
              onClick={() => {
                setObservation(0);
                setScreen(assisted ? "observations" : "field");
              }}
            >
              {t("biotrail.test")}
              <ArrowRight size={18} />
            </Button>
          </section>
          <aside className="biotrail-suit-card">
            <div className="biotrail-suit-icon">
              {build.tool === "spring" ? (
                <Leaf size={65} />
              ) : (
                <Wind size={65} />
              )}
            </div>
            <h3>{t("biotrail.yourSuit")}</h3>
            <p>{t(`biotrail.tools.${build.tool}.nature`)}</p>
            <label htmlFor="biotrail-name">{t("biotrail.name")}</label>
            <input
              id="biotrail-name"
              maxLength={32}
              value={build.name}
              placeholder={t("biotrail.defaultName")}
              onChange={(e) => change({ name: e.target.value })}
            />
            <p className="biotrail-science">{t("biotrail.toolNote")}</p>
          </aside>
        </div>
      )}
      {screen === "field" && (
        <Field
          key={island}
          level={level}
          tool={build.tool}
          reduced={effects.reducedEffects}
          onFinish={fieldComplete}
          onEdit={() => setScreen("workshop")}
        />
      )}
      {screen === "observations" && (
        <section className="biotrail-observation">
          <p className="specialty-eyebrow">
            {t("biotrail.observationCount", {
              count: observation + 1,
              total: level.observations.length,
            })}
          </p>
          <div className="biotrail-suit-icon">
            {build.tool === "spring" ? <Leaf size={65} /> : <Wind size={65} />}
          </div>
          <h2>
            {t(
              `biotrail.observations.${level.observations[observation]}.title`,
            )}
          </h2>
          <p>
            {t(`biotrail.observations.${level.observations[observation]}.text`)}
          </p>
          <p className="biotrail-hint">
            {t(`biotrail.tools.${build.tool}.effect`)}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button variant="outline" onClick={() => setScreen("workshop")}>
              {t("biotrail.edit")}
            </Button>
            <Button
              className="specialty-primary"
              onClick={() =>
                observation < level.observations.length - 1
                  ? setObservation(observation + 1)
                  : fieldComplete()
              }
            >
              {t(
                observation < level.observations.length - 1
                  ? "biotrail.nextObservation"
                  : "biotrail.keepDiscovery",
              )}
              <ArrowRight size={18} />
            </Button>
          </div>
        </section>
      )}
      {screen === "result" && (
        <section className="biotrail-result">
          <div className="biotrail-result-icon">
            <Check size={40} />
          </div>
          <p className="specialty-eyebrow">{t("biotrail.discovery")}</p>
          <h2>{t("biotrail.resultTitle")}</h2>
          <p>{t(`biotrail.tools.${build.tool}.nature`)}</p>
          <p>{t("biotrail.resultQuestion")}</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Button variant="outline" onClick={() => setScreen("workshop")}>
              {t("biotrail.tryOther")}
            </Button>
            <Button
              className="specialty-primary"
              onClick={() => setScreen(island === "lab" ? "keep" : "map")}
            >
              {t(island === "lab" ? "biotrail.myBuild" : "biotrail.nextIsland")}
              <ArrowRight size={18} />
            </Button>
          </div>
        </section>
      )}
      {screen === "keep" && (
        <section className="biotrail-keepsake">
          <p className="specialty-eyebrow">
            <Sparkles size={17} />
            {t("biotrail.creationCard")}
          </p>
          <h2>{build.name.trim() || t("biotrail.defaultName")}</h2>
          <p>
            {t(`biotrail.tools.${build.tool}.name`)} ·{" "}
            {t("biotrail.visited", { count: build.completed.length, total: 4 })}
          </p>
          <p>{t(`biotrail.tools.${build.tool}.nature`)}</p>
          <fieldset>
            <legend>{t("biotrail.reflect")}</legend>
            {["higher", "slower", "changed"].map((r) => (
              <label className="biotrail-reflection" key={r}>
                <input
                  type="radio"
                  name="biotrail-reflection"
                  checked={build.reflection === r}
                  onChange={() => change({ reflection: r })}
                />
                {t(`biotrail.reflections.${r}`)}
              </label>
            ))}
          </fieldset>
          <p className="biotrail-unplugged">{t("biotrail.unplugged")}</p>
          <div className="biotrail-keep-actions">
            <Button variant="outline" onClick={() => keep()}>
              <Save size={17} />
              {t("biotrail.save")}
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer size={17} />
              {t("biotrail.print")}
            </Button>
            <Button variant="outline" onClick={() => setScreen("workshop")}>
              <ArrowLeft size={17} />
              {t("biotrail.edit")}
            </Button>
            {build.completed.includes("lab") && (
              <Button
                className="specialty-primary"
                disabled={!build.reflection || finishing || finished}
                onClick={finish}
              >
                {t(
                  finished
                    ? "biotrail.finished"
                    : finishing
                      ? "biotrail.finishing"
                      : "biotrail.finish",
                )}
              </Button>
            )}
          </div>
          <p className="biotrail-local-note">{t("biotrail.localNote")}</p>
          {finishError && <p role="alert">{t("biotrail.finishError")}</p>}
        </section>
      )}
      {saveStatus && (
        <p
          className="biotrail-save-status"
          role={saveStatus === "error" ? "alert" : "status"}
        >
          {t(`biotrail.storage.${saveStatus}`)}
        </p>
      )}
    </article>
  );
}
