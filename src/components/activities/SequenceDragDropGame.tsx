// src/components/activities/SequenceDragDropGame.tsx
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragStartEvent,
  DragEndEvent,
  useDraggable,
  useDroppable,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { LocalizedField, resolveChoiceList } from "@/utils/localizedContent";

type Level = {
  id: string;
  cards: LocalizedField[];
  answer: LocalizedField[];
};

type Config = {
  type: "minigame";
  gameKey: "sequence_drag_drop";
  levels: Level[];
};

type GameCard = {
  id: string;
  text: string;
  matchValue: string;
};

// --- Sub-components for DND ---

function DraggableItem({
  id,
  text,
  onClick,
  disabled,
}: {
  id: string;
  text: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: id,
      disabled,
      data: { text },
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1, // Hide original when dragging (we use overlay)
    touchAction: "none",
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Button
        variant="secondary"
        className="h-12 cursor-grab active:cursor-grabbing w-full"
        onClick={onClick}
      >
        {text}
      </Button>
    </div>
  );
}

function DroppableSlot({
  id,
  index,
  content,
  onSlotClick,
}: {
  id: string;
  index: number;
  content: GameCard | null;
  onSlotClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: { index, type: "slot" },
  });

  return (
    <div ref={setNodeRef} className="relative">
      {content ? (
        <DraggableItem
          id={content.id}
          text={content.text}
          onClick={onSlotClick}
        />
      ) : (
        <Button
          variant="outline"
          className={`h-16 w-full justify-center ${
            isOver ? "ring-2 ring-primary" : ""
          }`}
          onClick={onSlotClick}
          aria-label={`Slot ${index + 1} empty`}
        >
          <span className="opacity-40">Slot {index + 1}</span>
        </Button>
      )}
    </div>
  );
}

// --- Main Component ---

export default function SequenceDragDropGame({
  config,
  onComplete,
}: {
  config: Config;
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const levels = Array.isArray(config?.levels) ? config.levels : [];
  const [levelIndex, setLevelIndex] = useState(0);

  const level = levels[levelIndex];

  // Resolve localized strings
  const resolvedLevel = useMemo(() => {
    if (!level) return null;
    return {
      // We don't resolve cards here because they might be objects
      answer: resolveChoiceList(t, level.answer),
    };
  }, [level, t]);

  const slotCount = resolvedLevel?.answer?.length ?? 0;

  // State: Slots (array of Card or null)
  const [slots, setSlots] = useState<Array<GameCard | null>>([]);
  // State: Available pool (array of Cards)
  const [available, setAvailable] = useState<GameCard[]>([]);
  // State: Active drag item (for overlay)
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);

  // Initialize level
  useEffect(() => {
    if (!level) return;

    // Generate stable IDs for cards and resolve content
    const cardsWithIds: GameCard[] = level.cards.map((c: any, i: number) => {
      let text = "";
      let matchValue = "";

      if (typeof c === "string") {
        const resolved = resolveText(t, c);
        text = resolved;
        matchValue = resolved;
      } else if (c && typeof c === "object") {
        if ("i18nKey" in c) {
          const resolved = resolveText(t, c);
          text = resolved;
          matchValue = resolved;
        } else {
          // { text, icon } object
          const rawText = c.text;
          const icon = c.icon || "";
          const resolvedText = resolveText(t, rawText);
          text = icon ? `${icon} ${resolvedText}` : resolvedText;
          matchValue = resolvedText;
        }
      }

      return {
        id: `card-${levelIndex}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        text,
        matchValue,
      };
    });

    // Shuffle
    const shuffled = [...cardsWithIds].sort(() => Math.random() - 0.5);

    setSlots(Array.from({ length: slotCount }, () => null));
    setAvailable(shuffled);
    setHintText(null);
  }, [level, levelIndex, slotCount, t]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require movement to start drag, allowing clicks
      },
    }),
    useSensor(KeyboardSensor),
  );

  // Helper to find the active card object for the overlay
  const activeCard = useMemo(() => {
    if (!activeId) return null;
    return (
      available.find((c) => c.id === activeId) ||
      slots.find((c) => c?.id === activeId)
    );
  }, [activeId, available, slots]);

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: "0.5",
        },
      },
    }),
  };

  if (!level || !resolvedLevel) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="font-semibold">Game config missing levels.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Logic ---

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Find source of the dragged card
    const sourceSlotIndex = slots.findIndex((s) => s?.id === activeId);
    const sourceIsSlot = sourceSlotIndex !== -1;
    const sourceCard = sourceIsSlot
      ? slots[sourceSlotIndex]
      : available.find((c) => c.id === activeId);

    if (!sourceCard) return;

    // Identify target
    // Target could be a slot ID ("slot-0") or "available-area" (if we made one)
    // Or target could be a card in a slot (swapping)

    // Check if dropping onto a slot directly
    let targetSlotIndex = -1;
    if (overId.startsWith("slot-")) {
      targetSlotIndex = parseInt(overId.replace("slot-", ""), 10);
    } else {
      // Did we drop onto a card that is inside a slot?
      // If the droppable is the slot container, this is handled.
      // But if we drop onto the card *inside* the slot, the over.id might be the card ID?
      // Wait, the card inside the slot is a Draggable, does it act as a Droppable?
      // No, unless we wrap it.
      // In my `DroppableSlot`, the `useDroppable` is on the container div.
      // The `DraggableItem` is inside.
      // Usually `dnd-kit` detects the droppable container even if dropping on children if pointer-events allow.
      // However, if the draggable captures events, it might obscure the droppable.
      // But `DraggableItem` shouldn't obscure the `DroppableSlot` it is in, strictly speaking,
      // but often it's safer to make sure the slot is the drop target.
      // Actually, if we drop on a card in a slot, we want to swap.
      // Let's assume the slot captures the drop.
    }

    // If dropped into the available area (or outside slots but inside the game area? We need an "available" droppable area to drag BACK to)
    const droppedInAvailable = overId === "available-area";

    if (droppedInAvailable) {
      if (sourceIsSlot) {
        // Move from slot to available
        const newSlots = [...slots];
        newSlots[sourceSlotIndex] = null;
        setSlots(newSlots);
        setAvailable([...available, sourceCard]);
      }
      // If already in available, do nothing (reorder?)
      return;
    }

    if (targetSlotIndex !== -1) {
      // Dropping into a slot
      const targetCard = slots[targetSlotIndex];

      if (sourceIsSlot) {
        // Move from Slot A to Slot B
        if (sourceSlotIndex === targetSlotIndex) return;

        const newSlots = [...slots];
        // Swap or Move?
        // Requirement: "Option A: swap cards"
        newSlots[targetSlotIndex] = sourceCard;
        newSlots[sourceSlotIndex] = targetCard; // targetCard might be null
        setSlots(newSlots);
      } else {
        // Move from Available to Slot
        const newSlots = [...slots];
        const newAvailable = available.filter((c) => c.id !== activeId);

        if (targetCard) {
          // Swap: Target card goes back to available
          newAvailable.push(targetCard);
        }

        newSlots[targetSlotIndex] = sourceCard;
        setSlots(newSlots);
        setAvailable(newAvailable);
      }
    }
  };

  // --- Fallback Tap Logic ---

  const fillFirstEmpty = (card: GameCard) => {
    const idx = slots.findIndex((s) => s === null);
    if (idx < 0) return;
    const next = [...slots];
    next[idx] = card;
    setSlots(next);
    setAvailable((prev) => prev.filter((c) => c.id !== card.id));
  };

  const removeFromSlot = (slotIdx: number) => {
    const card = slots[slotIdx];
    if (!card) return;
    const next = [...slots];
    next[slotIdx] = null;
    setSlots(next);
    setAvailable((prev) => [...prev, card]);
  };

  const resetLevel = () => {
    // Re-create from scratch or just empty slots
    // To properly reset, we need to gather all cards back to available.
    // Ideally we re-trigger the init effect or just manually move all.
    // The init effect depends on `levelIndex`, so we can just clear slots and combine.
    const allCards = [
      ...available,
      ...slots.filter((c): c is GameCard => c !== null),
    ];
    // Ideally restore original shuffle order? Or just shuffle again?
    // Let's just shuffle again to be simple
    allCards.sort(() => Math.random() - 0.5);
    setSlots(Array.from({ length: slotCount }, () => null));
    setAvailable(allCards);
    setHintText(null);
  };

  const getHint = (levelId: string, index: number): string | null => {
    if (levelId === "k") {
      if (index === 0) return "Hint: What do you do first to start cooking? 🥣";
      if (index === 1) return "Hint: The oven 🔥 comes before frosting 🧁.";
      if (index === 2) return "Hint: Frosting goes on AFTER baking.";
      if (index === 3) return "Hint: Eating 😋 comes last!";
    }
    if (levelId === "g1") {
      if (index === 0) return "Hint: Turn the water on first! 🚰";
      if (index === 4) return "Hint: Dry your hands last! 🧻";
      return "Hint: Think about what you do with soap and water.";
    }
    if (levelId === "g2") {
      if (index === 0) return "Hint: Always make a plan first! 📝";
      if (index === 4) return "Hint: Share your work when it's done! 📤";
      return "Hint: Build, test, then fix!";
    }
    return null;
  };

  const check = () => {
    const isComplete = slots.every((s) => s !== null);
    if (!isComplete) return;

    // Find first wrong index
    const firstWrongIndex = slots.findIndex(
      (s, i) => s?.matchValue !== resolvedLevel!.answer[i],
    );

    if (firstWrongIndex !== -1) {
      // Choose hint
      const hint =
        getHint(level.id, firstWrongIndex) ||
        "Hint: Try asking 'What happens first?'";
      setHintText(hint);

      toast({
        title: "Almost!",
        description: "Check the hint for help!",
        // Friendly toast, not destructive/red
      });
      // DO NOT reset automatically
      return;
    }

    // Correct
    setHintText(null);

    if (levelIndex < levels.length - 1) {
      toast({ title: "Great job!", description: "Next level unlocked." });
      setLevelIndex((i) => i + 1);
      return;
    }
    toast({ title: "You did it!", description: "All levels complete." });
    onComplete();
  };

  const filledAll = slots.length > 0 && slots.every((s) => s !== null);

  const getMissionTitle = (id: string) => {
    if (id === "k") return "Mission: Bake a Cake 🎂";
    if (id === "g1") return "Mission: Wash Your Hands 🧼";
    return "Mission: Fix the Order";
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-brightboost-navy">
          {getMissionTitle(level.id)}
        </div>
        <div className="text-sm text-gray-500">
          Level {levelIndex + 1}/{levels.length}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1">
              <div className="font-semibold text-lg text-brightboost-navy">
                Goal: Put the steps in order (First → Next → Last)
              </div>
              <div className="text-sm text-gray-500">
                Tip: Ask "What has to happen before…?"
              </div>
              {hintText && (
                <div className="mt-2 p-3 bg-blue-50 text-blue-800 rounded-md text-sm font-medium border border-blue-100 animate-in fade-in slide-in-from-top-1">
                  {hintText}
                </div>
              )}
            </div>

            {/* SLOTS AREA */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {slots.map((s, i) => (
                <DroppableSlot
                  key={`slot-${i}`}
                  id={`slot-${i}`}
                  index={i}
                  content={s}
                  onSlotClick={() => removeFromSlot(i)}
                />
              ))}
            </div>

            <div className="pt-4">
              <div className="text-sm text-gray-600 mb-2">Available cards</div>

              {/* AVAILABLE AREA */}
              {/* We make this a droppable so we can drag cards back here */}
              <AvailableArea id="available-area">
                <div className="flex flex-wrap gap-2 min-h-[60px] p-2 bg-slate-50 rounded-md border border-dashed border-gray-200">
                  {available.map((c) => (
                    <DraggableItem
                      key={c.id}
                      id={c.id}
                      text={c.text}
                      onClick={() => fillFirstEmpty(c)}
                    />
                  ))}
                  {available.length === 0 && (
                    <div className="text-gray-400 text-sm italic w-full text-center py-2">
                      (Empty)
                    </div>
                  )}
                </div>
              </AvailableArea>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={resetLevel}>
                Reset
              </Button>
              <Button onClick={check} disabled={!filledAll}>
                Check Order
              </Button>
            </div>
          </CardContent>
        </Card>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeCard ? (
            <Button
              variant="secondary"
              className="h-12 w-40 cursor-grabbing shadow-xl"
            >
              {activeCard.text}
            </Button>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function AvailableArea({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-colors rounded-md ${isOver ? "bg-slate-100 ring-2 ring-slate-200" : ""}`}
    >
      {children}
    </div>
  );
}
