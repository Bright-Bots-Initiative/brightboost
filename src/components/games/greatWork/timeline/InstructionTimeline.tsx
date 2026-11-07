import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  closestCenter,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import { useDragAnnouncements } from "../useDragAnnouncements";
import type { MachineSpec, Instruction } from "@shared/greatwork-engine";
import type {
  GreatWorkBandConfig,
  PartAllowList,
  InstructionKind,
} from "../greatWorkBandConfig";
import { availableInstructions } from "../greatWorkBandConfig";
import type { TapeEdit } from "../greatWorkModel";
import {
  INSTRUCTION_SYMBOLS,
  tapeSlotId,
  parseTapeSlot,
} from "./instructionCatalog";
function CatalogChip({
  instruction,
  selected,
  disabled,
  onClick,
}: {
  instruction: InstructionKind;
  selected: boolean;
  disabled: boolean;
  onClick(): void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `instruction:${instruction}`,
    data: { kind: "instruction", instruction },
    attributes: { roleDescription: t("games.greatWork.drag.instructionRole") },
    disabled,
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...attributes}
      onPointerDown={(event) => listeners?.onPointerDown?.(event)}
      disabled={disabled}
      className={`gw-instruction${selected ? " is-selected" : ""}`}
      aria-pressed={selected}
      title={t(`games.greatWork.instructionHints.${instruction}`)}
      onClick={onClick}
    >
      <span aria-hidden="true">{INSTRUCTION_SYMBOLS[instruction]}</span>
      {t(`games.greatWork.instructions.${instruction}`)}
    </button>
  );
}
function TapeSlot({
  armId,
  index,
  instruction,
  emptyReady,
  disabled,
  active,
  selected,
  onClick,
}: {
  armId: number;
  index: number;
  instruction?: Instruction;
  emptyReady: boolean;
  disabled: boolean;
  active: boolean;
  selected: boolean;
  onClick(): void;
}) {
  const { t } = useTranslation();
  const id = tapeSlotId(armId, index);
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id,
      disabled: {
        draggable: disabled || !instruction,
        droppable: disabled || (!instruction && !emptyReady),
      },
      data: { kind: "tape", armId, index, instruction },
      attributes: { roleDescription: t("games.greatWork.drag.stepRole") },
    });
  const label = instruction
    ? t(`games.greatWork.instructions.${instruction}`)
    : t("games.greatWork.timeline.empty");
  return (
    <button
      type="button"
      id={`gw-${id}`}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      disabled={disabled || (!instruction && !emptyReady)}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`gw-tape-slot${!instruction ? " is-empty" : ""}${active ? " is-active" : ""}${selected ? " is-selected" : ""}`}
      aria-label={t("games.greatWork.timeline.slotLabel", {
        arm: armId,
        number: index + 1,
        instruction: label,
      })}
      aria-pressed={selected}
    >
      <span className="gw-slot-number">{index + 1}</span>
      <span aria-hidden="true">
        {instruction
          ? (INSTRUCTION_SYMBOLS[instruction as InstructionKind] ?? "·")
          : "+"}
      </span>
      <span>{label}</span>
    </button>
  );
}
export interface InstructionTimelineProps {
  program: MachineSpec;
  config: GreatWorkBandConfig;
  allowList?: PartAllowList;
  disabled?: boolean;
  pointers?: ReadonlyMap<number, number>;
  onEdit(armId: number, action: TapeEdit): void;
}
export function InstructionTimeline({
  program,
  config,
  allowList,
  disabled = false,
  pointers = new Map(),
  onEdit,
}: InstructionTimelineProps) {
  const { t } = useTranslation();
  const announcements = useDragAnnouncements();
  const k = (s: string, vars?: object) =>
    t(`games.greatWork.${s}`, { ...vars });
  const instructions = availableInstructions(config, allowList);
  const [choice, setChoice] = useState<InstructionKind | null>(null);
  const [selected, setSelected] = useState<{
    armId: number;
    index: number;
  } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const send = (armId: number, action: TapeEdit) => {
    if (!disabled) onEdit(armId, action);
  };
  const focusFrame = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    },
    [],
  );
  const focusSlot = (armId: number, index: number) => {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      document.getElementById(`gw-${tapeSlotId(armId, index)}`)?.focus();
    });
  };
  function onDragEnd(e: DragEndEvent) {
    if (disabled || !e.over) return;
    const to = parseTapeSlot(e.over.id);
    if (!to) return;
    const data = e.active.data.current;
    if (
      data?.kind === "instruction" &&
      instructions.includes(data.instruction)
    ) {
      send(to.armId, {
        type: "put",
        index: to.index,
        instruction: data.instruction,
      });
      setChoice(null);
      setSelected(to);
      focusSlot(to.armId, to.index);
    } else {
      const from = parseTapeSlot(e.active.id);
      const count =
        program.tapes.find((tape) => tape.armId === to.armId)?.chips.length ??
        0;
      if (from && from.armId === to.armId && to.index < count) {
        send(to.armId, { type: "reorder", from: from.index, to: to.index });
        setSelected(to);
        focusSlot(to.armId, to.index);
      }
    }
  }
  const arms = program.parts.filter((p) => p.kind === "arm");
  const selectedTape = program.tapes.find(
    (tape) => tape.armId === selected?.armId,
  );
  const selectedExists =
    !!selected && selected.index < (selectedTape?.chips.length ?? 0);
  return (
    <section className="gw-timeline" aria-labelledby="gw-timeline-title">
      <div className="gw-section-heading">
        <span className="gw-step-dot" aria-hidden="true">
          2
        </span>
        <h2 id="gw-timeline-title">{k("timeline.title")}</h2>
      </div>
      <p>{k("timeline.help")}</p>
      <DndContext
        sensors={sensors}
        onDragEnd={onDragEnd}
        collisionDetection={closestCenter}
        autoScroll={false}
        accessibility={{
          screenReaderInstructions: { draggable: k("timeline.dragHelp") },
          announcements,
        }}
      >
        <div
          className="gw-instruction-catalog"
          role="group"
          aria-label={k("timeline.catalog")}
        >
          {instructions.map((instruction) => (
            <CatalogChip
              key={instruction}
              instruction={instruction}
              selected={choice === instruction}
              disabled={disabled}
              onClick={() =>
                setChoice(choice === instruction ? null : instruction)
              }
            />
          ))}
        </div>
        {choice && (
          <p className="gw-selected-instruction" role="status">
            {k("timeline.placeChoice", {
              instruction: k(`instructions.${choice}`),
            })}{" "}
            {k(`instructionHints.${choice}`)}
          </p>
        )}
        {!arms.length && (
          <p className="gw-empty-tapes">{k("timeline.addArm")}</p>
        )}
        {arms.map((arm) => {
          const chips =
            program.tapes.find((tape) => tape.armId === arm.id)?.chips ?? [];
          const count = config.maxTapeSlots ?? Math.min(256, chips.length + 1);
          return (
            <div className="gw-tape-row" key={arm.id}>
              <h3>
                <span className="gw-arm-badge" aria-hidden="true">
                  {arm.id}
                </span>
                {k("timeline.arm", { id: arm.id })}
              </h3>
              <SortableContext
                items={Array.from({ length: count }, (_, index) =>
                  tapeSlotId(arm.id, index),
                )}
              >
                <div
                  className="gw-tape-slots"
                  role="group"
                  aria-label={k("timeline.arm", { id: arm.id })}
                >
                  {Array.from({ length: count }, (_, index) => (
                    <TapeSlot
                      key={index}
                      armId={arm.id}
                      index={index}
                      instruction={chips[index]}
                      emptyReady={index === chips.length}
                      disabled={disabled}
                      active={pointers.get(arm.id) === index}
                      selected={
                        selected?.armId === arm.id && selected.index === index
                      }
                      onClick={() => {
                        setSelected({ armId: arm.id, index });
                        if (choice) {
                          send(arm.id, {
                            type: "put",
                            index,
                            instruction: choice,
                          });
                          setChoice(null);
                        }
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </DndContext>
      {selectedExists && selected && (
        <div
          className="gw-tape-actions"
          role="group"
          aria-label={k("timeline.editStep")}
        >
          <button
            type="button"
            disabled={disabled || selected.index === 0}
            onClick={() => {
              send(selected.armId, {
                type: "reorder",
                from: selected.index,
                to: selected.index - 1,
              });
              setSelected({ ...selected, index: selected.index - 1 });
              focusSlot(selected.armId, selected.index - 1);
            }}
          >
            {k("timeline.earlier")}
          </button>
          <button
            type="button"
            disabled={
              disabled ||
              selected.index >= (selectedTape?.chips.length ?? 0) - 1
            }
            onClick={() => {
              send(selected.armId, {
                type: "reorder",
                from: selected.index,
                to: selected.index + 1,
              });
              setSelected({ ...selected, index: selected.index + 1 });
              focusSlot(selected.armId, selected.index + 1);
            }}
          >
            {k("timeline.later")}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              send(selected.armId, { type: "remove", index: selected.index });
              setSelected(null);
              focusSlot(selected.armId, Math.max(0, selected.index - 1));
            }}
          >
            {k("timeline.remove")}
          </button>
        </div>
      )}
    </section>
  );
}
