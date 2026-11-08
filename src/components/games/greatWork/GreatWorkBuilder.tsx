import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  DragStartEvent,
  DragMoveEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import { validateMachine, key } from "@shared/greatwork-engine";
import type {
  Axial,
  HexDir,
  LevelSpec,
  MachineSpec,
  Molecule,
  Part,
  RunResult,
} from "@shared/greatwork-engine";
import type { GradeBand } from "@/hooks/useGradeBand";
import { useReducedGameEffects } from "../shared/useReducedGameEffects";
import { effectiveBandConfig } from "./greatWorkBandConfig";
import type { GreatWorkBandConfig, PartAllowList } from "./greatWorkBandConfig";
import {
  BUILDER_BOUNDS,
  makePart,
  placePart,
  movePart,
  turnPart,
  removePart,
  editTape,
  partAnchor,
  programKey,
  programFitsConfig,
  selectableAt,
} from "./greatWorkModel";
import type { EditorTool, PartChoice, TapeEdit } from "./greatWorkModel";
import { PartsTray } from "./tray/PartsTray";
import { InstructionTimeline } from "./timeline/InstructionTimeline";
import { HexBoardCanvas } from "./board/HexBoardCanvas";
import type { BoardHandle } from "./board/HexBoardCanvas";
import { RunBar } from "./transport/RunBar";
import { useEnginePlayback } from "./transport/useEnginePlayback";
import type { PlaybackState } from "./transport/playback";
import { RunNote } from "./feedback/RunNote";
import { useDragAnnouncements } from "./useDragAnnouncements";
import "./greatWork.css";

export interface GreatWorkBuilderProps {
  band: GradeBand;
  bandConfig: GreatWorkBandConfig;
  program: MachineSpec;
  onProgramChange(next: MachineSpec): void;
  target: { molecule: Molecule; count: number } | null;
  allowList?: PartAllowList;
  readOnly?: boolean;
  headerSlot?: React.ReactNode;
  onRunResult(result: RunResult): void;
  onPlaybackStateChange?(state: PlaybackState): void;
  /** Optional lesson constraints; #723/#724 own the lessons and targets. */
  levelOptions?: Pick<
    LevelSpec,
    "fixedParts" | "bounds" | "walls" | "maxTicks"
  >;
}
export function GreatWorkBuilder({
  band,
  bandConfig,
  program,
  onProgramChange,
  target,
  allowList,
  readOnly = false,
  headerSlot,
  onRunResult,
  onPlaybackStateChange,
  levelOptions,
}: GreatWorkBuilderProps) {
  const { t, i18n } = useTranslation();
  const announcements = useDragAnnouncements();
  const k = (s: string, vars?: object) =>
    t(`games.greatWork.${s}`, { ...vars });
  const config = useMemo(
    () => effectiveBandConfig(band, bandConfig),
    [band, bandConfig],
  );
  const configKey = JSON.stringify(config);
  const level = useMemo<LevelSpec>(
    () => ({
      key: "great-work-builder",
      mode: target ? "target" : "open",
      ...(target
        ? { targetProduct: target.molecule, targetCount: target.count }
        : {}),
      fixedParts: levelOptions?.fixedParts ?? [],
      bounds: levelOptions?.bounds ?? BUILDER_BOUNDS,
      maxTicks: levelOptions?.maxTicks ?? 240,
      ...(levelOptions?.walls ? { walls: levelOptions.walls } : {}),
      ...(allowList?.glyphs ? { allowedGlyphs: [...allowList.glyphs] } : {}),
    }),
    [target, levelOptions, allowList?.glyphs],
  );
  const { controller, snapshot } = useEnginePlayback(
    level,
    program,
    onRunResult,
    onPlaybackStateChange,
  );
  const effects = useReducedGameEffects();
  const [area, setArea] = useState(false),
    [cursor, setCursor] = useState<Axial>({ q: 0, r: 0 });
  const [tool, setTool] = useState<EditorTool>({ kind: "select" }),
    [selected, setSelected] = useState<number | null>(null);
  const [undo, setUndo] = useState<MachineSpec[]>([]);
  const programRef = useRef(program);
  programRef.current = program;
  const expected = useRef(programKey(program));
  const board = useRef<BoardHandle>(null),
    dragChoice = useRef<PartChoice | null>(null),
    dragging = useRef(false);
  const lastConfig = useRef(configKey);
  const dragBinding = useRef<string | null>(null);
  const signature = programKey(program);
  useEffect(() => {
    if (signature !== expected.current) {
      setUndo([]);
      expected.current = signature;
      setSelected(null);
      setTool({ kind: "select" });
    }
    if (lastConfig.current !== configKey) {
      controller.pause();
      setTool({ kind: "select" });
      lastConfig.current = configKey;
    }
  }, [signature, configKey, controller]);
  const fits = programFitsConfig(program, config, allowList);
  const invalid = validateMachine(level, program).length > 0;
  // A lesson may narrow its tools without changing the program or engine level.
  // Stop before the next timer can advance or publish a now-disallowed run.
  useLayoutEffect(() => {
    if (!fits || invalid) controller.pause();
  }, [controller, fits, invalid]);
  const running = snapshot.mode === "running";
  const locked = readOnly || running || !fits;
  const commit = (next: MachineSpec | null, record = true) => {
    if (locked || !next || programKey(next) === programKey(programRef.current))
      return;
    const old = programRef.current;
    controller.reset(); // A paused edit starts a fresh simulation; never patch a running state.
    if (record) setUndo((history) => [...history.slice(-39), old]);
    expected.current = programKey(next);
    programRef.current = next;
    onProgramChange(next);
  };
  function choosePart(choice: PartChoice) {
    if (locked) return;
    setTool({ kind: "place", choice, facing: 0 });
    setSelected(null);
  }
  function activate(at: Axial) {
    if (locked) return;
    if (tool.kind === "place") {
      const next = placePart(
        level,
        programRef.current,
        tool.choice,
        at,
        tool.facing,
        config,
        allowList,
      );
      if (next) {
        commit(next);
        setSelected(next.parts[next.parts.length - 1].id);
        setTool({ kind: "select" });
      }
    } else if (tool.kind === "move") {
      const next = movePart(level, programRef.current, tool.partId, at);
      if (next) {
        commit(next);
        setSelected(tool.partId);
        setTool({ kind: "select" });
      }
    } else {
      const candidates = selectableAt(
        [...program.parts, ...level.fixedParts],
        at,
      );
      const index = candidates.findIndex((p) => p.id === selected);
      setSelected(
        candidates.length
          ? candidates[(index + 1) % candidates.length].id
          : null,
      );
    }
  }
  const preview = useMemo(() => {
    if (locked || tool.kind === "select") return null;
    if (tool.kind === "place") {
      const id =
        Math.max(
          0,
          ...program.parts.map((p) => p.id),
          ...level.fixedParts.map((p) => p.id),
        ) + 1;
      return {
        part: makePart(tool.choice, id, cursor, tool.facing),
        legal: !!placePart(
          level,
          program,
          tool.choice,
          cursor,
          tool.facing,
          config,
          allowList,
        ),
      };
    }
    const next = movePart(level, program, tool.partId, cursor),
      old = program.parts.find((p) => p.id === tool.partId);
    if (!old || old.kind === "track") return null;
    const ghost =
      old.kind === "arm"
        ? { ...old, anchor: cursor }
        : old.kind === "glyph"
          ? { ...old, glyph: { ...old.glyph, anchor: cursor } }
          : { ...old, at: cursor };
    return { part: ghost as Part, legal: !!next };
  }, [program, tool, cursor, locked, level, config, allowList]);
  const scene = useMemo(
    () => ({
      program,
      fixedParts: level.fixedParts,
      state: snapshot.state,
      bounds: level.bounds!,
      walls: level.walls,
      cursor,
      selected,
      area,
      preview,
    }),
    [program, level, snapshot.state, cursor, selected, area, preview],
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  function dragPoint(event: DragMoveEvent | DragEndEvent): Axial | null {
    const e = event.activatorEvent as PointerEvent;
    return Number.isFinite(e.clientX) && Number.isFinite(e.clientY)
      ? (board.current?.hit(
          e.clientX + event.delta.x,
          e.clientY + event.delta.y,
        ) ?? null)
      : null;
  }
  function dragStart(event: DragStartEvent) {
    if (locked || event.active.data.current?.kind !== "part") return;
    dragging.current = true;
    dragBinding.current = programKey(programRef.current);
    dragChoice.current = event.active.data.current.choice;
    choosePart(dragChoice.current!);
  }
  function dragMove(event: DragMoveEvent) {
    if (dragging.current) {
      const at = dragPoint(event);
      if (at) setCursor(at);
    }
  }
  function dragEnd(event: DragEndEvent) {
    const choice = dragChoice.current,
      at = dragPoint(event);
    if (
      !locked &&
      choice &&
      at &&
      event.over?.id === "gw-board" &&
      dragBinding.current === programKey(programRef.current)
    ) {
      const next = placePart(
        level,
        programRef.current,
        choice,
        at,
        0,
        config,
        allowList,
      );
      if (next) {
        commit(next);
        setSelected(next.parts[next.parts.length - 1].id);
        setTool({ kind: "select" });
        setCursor(at);
      }
    }
    dragging.current = false;
    dragChoice.current = null;
    dragBinding.current = null;
  }
  const activePart = [...program.parts, ...level.fixedParts].find(
    (p) => p.id === selected,
  );
  const fixed = !!activePart && level.fixedParts.some((p) => p.id === selected);
  const partName = (part: Part) =>
    part.kind === "glyph"
      ? k(`glyph.${part.glyph.kind}`)
      : k(`parts.${part.kind}`);
  function applyTape(armId: number, action: TapeEdit) {
    commit(editTape(programRef.current, armId, action, config, allowList));
  }
  return (
    <section
      className={`gw-builder${effects.reducedEffects ? " gw-calm" : ""}`}
      aria-label={k("title")}
      lang={i18n.resolvedLanguage?.startsWith("es") ? "es" : "en"}
    >
      <div className="gw-builder-heading">
        <div>
          <p className="gw-eyebrow">{k("kicker")}</p>
          <h1>{k("title")}</h1>
          <p>{k("intro")}</p>
        </div>
        {headerSlot}
      </div>
      <details
        className="gw-quick-start"
        onToggle={(e) => {
          if (e.currentTarget.open) controller.pause();
        }}
      >
        <summary>{k("help.title")}</summary>
        <ol>
          <li>{k("help.place")}</li>
          <li>{k("help.tape")}</li>
          <li>{k("help.run")}</li>
        </ol>
        <dl>
          <dt>{k("words.glyph")}</dt>
          <dd>{k("words.glyphMeaning")}</dd>
          <dt>{k("words.tape")}</dt>
          <dd>{k("words.tapeMeaning")}</dd>
          <dt>{k("words.element")}</dt>
          <dd>{k("words.elementMeaning")}</dd>
        </dl>
      </details>
      {!fits && (
        <p className="gw-context-note" role="status">
          {k("context.tools")}
        </p>
      )}
      <RunBar
        controller={controller}
        snapshot={snapshot}
        blocked={!fits || invalid}
        area={area}
        onArea={setArea}
        reduced={effects.reducedEffects}
        onReduced={effects.setReducedEffects}
      />
      <DndContext
        sensors={sensors}
        onDragStart={dragStart}
        onDragMove={dragMove}
        onDragEnd={dragEnd}
        onDragCancel={() => {
          dragging.current = false;
          dragChoice.current = null;
          dragBinding.current = null;
        }}
        autoScroll={false}
        accessibility={{
          screenReaderInstructions: { draggable: k("tray.dragHelp") },
          announcements,
        }}
      >
        <div className="gw-workbench">
          {!readOnly && (
            <PartsTray
              config={config}
              allowList={allowList}
              selected={tool.kind === "place" ? tool.choice : null}
              disabled={locked}
              onChoose={choosePart}
            />
          )}
          <div className="gw-building-area">
            <div className="gw-edit-bar">
              <button
                type="button"
                aria-pressed={tool.kind === "select"}
                onClick={() => setTool({ kind: "select" })}
              >
                {k("edit.select")}
              </button>
              <button
                type="button"
                disabled={locked || !undo.length}
                onClick={() => {
                  const next = undo[undo.length - 1];
                  if (next) {
                    setUndo((h) => h.slice(0, -1));
                    commit(next, false);
                    setSelected(null);
                    setTool({ kind: "select" });
                  }
                }}
              >
                {k("edit.undo")}
              </button>
              {tool.kind !== "select" && (
                <>
                  <p role="status">
                    {k(
                      tool.kind === "move" ? "edit.moveHint" : "edit.placeHint",
                    )}
                  </p>
                  {tool.kind === "place" &&
                    (tool.choice.kind === "glyph" ||
                      tool.choice.kind === "arm") && (
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() =>
                          setTool({
                            ...tool,
                            facing: ((tool.facing + 1) % 6) as HexDir,
                          })
                        }
                      >
                        {k("edit.turnPreview")}
                      </button>
                    )}
                  <button
                    type="button"
                    onClick={() => setTool({ kind: "select" })}
                  >
                    {k("edit.cancel")}
                  </button>
                </>
              )}
            </div>
            <HexBoardCanvas
              ref={board}
              scene={scene}
              disabled={running}
              onCursor={(at) =>
                setCursor((old) => (key(old) === key(at) ? old : at))
              }
              onActivate={(at) => {
                if (!dragging.current) activate(at);
              }}
            />
            {activePart && (
              <section className="gw-inspector" aria-label={k("edit.selected")}>
                <div>
                  <strong>{partName(activePart)}</strong>
                  <p>{k("board.cursor", partAnchor(activePart))}</p>
                </div>
                {fixed ? (
                  <p>{k("edit.fixed")}</p>
                ) : (
                  <div className="gw-inspector-actions">
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() =>
                        setTool({ kind: "move", partId: activePart.id })
                      }
                    >
                      {k("edit.move")}
                    </button>
                    {(activePart.kind === "arm" ||
                      activePart.kind === "glyph") && (
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() =>
                          commit(
                            turnPart(
                              level,
                              programRef.current,
                              activePart.id,
                              1,
                            ),
                          )
                        }
                      >
                        {k("edit.turn")}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        commit(removePart(programRef.current, activePart.id));
                        setSelected(null);
                        setTool({ kind: "select" });
                      }}
                    >
                      {k("edit.remove")}
                    </button>
                  </div>
                )}
              </section>
            )}
            <details className="gw-parts-list">
              <summary>{k("edit.partsList")}</summary>
              <ul>
                {[...program.parts, ...level.fixedParts].map((part) => (
                  <li key={part.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(part.id);
                        setCursor(partAnchor(part));
                        setTool({ kind: "select" });
                        board.current?.focus();
                      }}
                    >
                      {partName(part)} · {k("board.cursor", partAnchor(part))}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </DndContext>
      {fits && (
        <InstructionTimeline
          program={program}
          config={config}
          allowList={allowList}
          disabled={locked}
          pointers={snapshot.lastPointers}
          onEdit={applyTape}
        />
      )}
      <RunNote
        result={snapshot.result}
        target={target}
        invalid={invalid}
        showMetrics={config.showMetrics}
      />
    </section>
  );
}
export default GreatWorkBuilder;
