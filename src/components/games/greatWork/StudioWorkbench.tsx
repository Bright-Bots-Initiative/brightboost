import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CircleHelp,
  Hand,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  SkipForward,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  studioLevel,
  studioLessonCopy,
  validateMachine,
} from "@shared/greatwork-engine";
import type {
  MachineSpec,
  RunResult,
  StudioDraft,
} from "@shared/greatwork-engine";
import { editTape } from "./greatWorkModel";
import { resolveBandConfig } from "./greatWorkBandConfig";
import type { InstructionKind } from "./greatWorkBandConfig";
import { useEnginePlayback } from "./transport/useEnginePlayback";
import { StudioStage } from "./StudioStage";
import { RunNote } from "./feedback/RunNote";

const choices = ["GRAB", "ROTATE_CW", "DROP"] as const;
const icons = { GRAB: Hand, ROTATE_CW: RotateCw, DROP: ArrowDownToLine };
const config = resolveBandConfig("k2");

export function StudioWorkbench({
  draft,
  onChange,
  onRun,
  editBoard,
  startLesson,
}: {
  draft: StudioDraft;
  onChange: (p: MachineSpec) => void;
  onRun: (result: RunResult) => void;
  editBoard: () => void;
  startLesson: () => void;
}) {
  const { t, i18n } = useTranslation();
  const s = (key: string, vars?: Record<string, unknown>) =>
    t(`games.greatWork.studio.${key}`, vars);
  const instr = (key: string) => t(`games.greatWork.instructions.${key}`);
  const level = studioLevel(draft);
  const { controller, snapshot } = useEnginePlayback(
    level,
    draft.program,
    onRun,
  );
  const running = snapshot.mode === "running";
  const invalid =
    !snapshot.state || validateMachine(level, draft.program).length > 0;
  const lesson = draft.levelKey !== null,
    copy = studioLessonCopy(i18n.language);
  const [selected, setSelected] = useState<{
    armId: number;
    index: number;
  } | null>(null);
  const target = level.targetProduct
    ? { molecule: level.targetProduct, count: level.targetCount ?? 1 }
    : null;
  const products =
    snapshot.state?.produced.reduce((sum, p) => sum + p.count, 0) ?? 0;
  const arms = draft.program.parts.filter((p) => p.kind === "arm");
  function play() {
    setSelected(null);
    if (running) controller.pause();
    else {
      if (snapshot.result) controller.reset();
      controller.run();
    }
  }
  function chooseInstruction(chip: InstructionKind) {
    if (!selected || running) return;
    const program = editTape(
      draft.program,
      selected.armId,
      { type: "put", index: selected.index, instruction: chip },
      config,
    );
    if (program) onChange(program);
    setSelected(null);
  }
  return (
    <div className="gws-workbench">
      <section className="gws-machine" aria-label={s("workbench")}>
        <div className="gws-machine-head">
          <span className="gws-machine-label">
            <span
              className={running ? "gws-lamp on" : "gws-lamp"}
              aria-hidden="true"
            />
            {s("workbench")}
          </span>
          <span className="gws-output">
            <span aria-hidden="true">◆</span>
            {s("made", { count: products })}
          </span>
        </div>
        <StudioStage
          program={draft.program}
          fixedParts={level.fixedParts}
          state={snapshot.state}
        />
        <div className="gws-controls">
          <button
            type="button"
            className="gws-run"
            disabled={invalid}
            onClick={play}
          >
            {running ? <Pause /> : <Play fill="currentColor" />}
            {t(
              `games.greatWork.transport.${running ? "pause" : snapshot.result ? "again" : "run"}`,
            )}
          </button>
          <button
            type="button"
            disabled={invalid || running || !!snapshot.result}
            onClick={() => controller.stepOnce()}
          >
            <SkipForward />
            {t("games.greatWork.transport.step")}
          </button>
          <button
            type="button"
            disabled={!snapshot.state}
            onClick={() => {
              controller.reset();
              setSelected(null);
            }}
          >
            <RotateCcw />
            {s("reset")}
          </button>
          {!lesson && (
            <button
              type="button"
              className="gws-edit-layout"
              onClick={editBoard}
            >
              <Wrench />
              {s("editLayout")}
            </button>
          )}
        </div>
      </section>
      <aside className="gws-instructions" aria-label={s("stepsTitle")}>
        <div className="gws-section-cap">
          <span className="gws-strip" aria-hidden="true" />
          <h2>{s("stepsTitle")}</h2>
        </div>
        <p className="gws-intro">{s("stepsHint")}</p>
        {arms.map((arm, armIndex) => {
          const chips =
            draft.program.tapes.find((a) => a.armId === arm.id)?.chips ?? [];
          return (
            <div className="gws-arm-tape" key={arm.id}>
              {arms.length > 1 && (
                <h3>
                  {t("games.greatWork.timeline.arm", { id: armIndex + 1 })}
                </h3>
              )}
              <div className="gws-slots">
                {Array.from({ length: 3 }, (_, i) => {
                  const chip = chips[i],
                    Icon =
                      chip && Object.prototype.hasOwnProperty.call(icons, chip)
                        ? icons[chip as keyof typeof icons]
                        : Plus;
                  const active =
                    snapshot.state &&
                    snapshot.state.tick > 0 &&
                    snapshot.lastPointers.get(arm.id) === i;
                  return (
                    <button
                      type="button"
                      className={`gws-slot ${chip ? "filled" : "empty"} ${selected?.armId === arm.id && selected.index === i ? "chosen" : ""} ${active ? "playing" : ""}`}
                      key={i}
                      disabled={running || i > chips.length}
                      onClick={() =>
                        setSelected(
                          selected?.armId === arm.id && selected.index === i
                            ? null
                            : { armId: arm.id, index: i },
                        )
                      }
                      aria-expanded={
                        selected?.armId === arm.id && selected.index === i
                      }
                      aria-label={t("games.greatWork.timeline.slotLabel", {
                        arm: armIndex + 1,
                        number: i + 1,
                        instruction: chip ? instr(chip) : s("add"),
                      })}
                    >
                      <span className="gws-number" aria-hidden="true">
                        {i + 1}
                      </span>
                      <Icon className="gws-slot-icon" />
                      <span>{chip ? instr(chip) : s("add")}</span>
                      {active ? (
                        <span className="gws-active-mark" aria-hidden="true">
                          ▸
                        </span>
                      ) : (
                        <ArrowRight className="gws-slot-arrow" />
                      )}
                    </button>
                  );
                })}
              </div>
              {selected?.armId === arm.id && !running && (
                <div
                  className="gws-pick"
                  role="group"
                  aria-label={s("chooseMove", { step: selected.index + 1 })}
                >
                  <p>{s("chooseMove", { step: selected.index + 1 })}</p>
                  {choices.map((c) => {
                    const Icon = icons[c];
                    return (
                      <button
                        type="button"
                        key={c}
                        onClick={() => chooseInstruction(c)}
                      >
                        <Icon />
                        {instr(c)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {!arms.length && <p>{s("noArms")}</p>}
        <div className="gws-lesson">
          <div className="gws-lesson-icon" aria-hidden="true">
            {snapshot.result?.solved ? <Check /> : <CircleHelp />}
          </div>
          <div>
            <strong>{lesson ? copy.title : s("tryTitle")}</strong>
            <p>
              {lesson
                ? snapshot.result?.solved
                  ? copy.reflection
                  : copy.hint
                : s("tryHint")}
            </p>
            {!lesson && (
              <button type="button" onClick={startLesson}>
                {s("firstLesson")} <ArrowRight />
              </button>
            )}
          </div>
        </div>
      </aside>
      {(snapshot.result || invalid) && (
        <div className="gws-result">
          <Sparkles aria-hidden="true" />
          <div>
            <RunNote
              result={snapshot.result}
              target={target}
              invalid={invalid}
              showMetrics={false}
            />
            {snapshot.result && !lesson && <p>{s("reflect")}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
