// src/components/activities/SequenceDragDropGame.tsx
import { useEffect, useMemo, useState, memo, useCallback } from "react";
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
import { LocalizedField, resolveChoiceList, resolveText } from "@/utils/localizedContent";
import ActivityHeader from "@/components/activities/ActivityHeader";
import { VisualKey } from "@/theme/activityVisualTokens";
import { ActivityThumb } from "@/components/shared/ActivityThumb";
import { ImageKey } from "@/theme/activityIllustrations";

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
  imageKey?: ImageKey;
};

// --- Sub-components for DND ---

const DraggableItem = memo(function DraggableItem({
  id,
  text,
  imageKey,
  onItemClick,
  disabled,
}: {
  id: string;
  text: string;
  imageKey?: ImageKey;
  onItemClick?: (id: string) => void;
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

  const handleClick = useCallback(() => {
    if (onItemClick) onItemClick(id);
  }, [id, onItemClick]);

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Button
        variant="secondary"
        className="h-auto py-2 px-3 flex flex-col items-center justify-center gap-2 cursor-grab active:cursor-grabbing w-full min-h-[80px]"
        onClick={handleClick}
      >
        {imageKey && (
          <ActivityThumb
            imageKey={imageKey}
            variant="game"
            className="h-10 w-10 shrink-0"
          />
        )}
        <span className="text-sm leading-tight text-center">{text}</span>
      </Button>
    </div>
  );
});

const DroppableSlot = memo(function DroppableSlot({
  id,
  index,
  content,
  onSlotClick,
}: {
  id: string;
  index: number;
  content: GameCard | null;
  onSlotClick: (index: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: { index, type: "slot" },
  });

  const handleClick = useCallback(() => {
    onSlotClick(index);
  }, [index, onSlotClick]);

  return (
    <div ref={setNodeRef} className="relative">
      {content ? (
        <DraggableItem
          id={content.id}
          text={content.text}
          imageKey={content.imageKey}
          onItemClick={() => onSlotClick(index)}
        />
      ) : (
        <Button
          variant="outline"
          className={`h-24 w-full justify-center ${
            isOver ? "ring-2 ring-primary" : ""
          }`}
          onClick={handleClick}
          aria-label={`Slot ${index + 1} empty`}
        >
          <span className="opacity-40">Slot {index + 1}</span>
        </Button>
      )}
    </div>
  );
});

const AvailableArea = memo(function AvailableArea({
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
});

// --- Main Component ---

const FALLBACK_IMAGES: Record<string, ImageKey> = {
  Pour: "step_pour",
  Bake: "step_bake",
  Frost: "step_frost",
  Eat: "step_eat",
  "Turn water on": "step_water_on",
  Wash: "step_wash",
  Soap: "step_soap",
  Rinse: "step_rinse",
  Dry: "step_dry",
};

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
      let imageKey: ImageKey | undefined;

      if (typeof c === "string") {
        const resolved = resolveText(t, c);
        text = resolved;
        matchValue = resolved;
        if (FALLBACK_IMAGES[c]) imageKey = FALLBACK_IMAGES[c];
      } else if (c && typeof c === "object") {
        if (c.imageKey) {
          imageKey = c.imageKey as ImageKey;
        }

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

          // Try fallback if not set
          if (!imageKey && FALLBACK_IMAGES[rawText]) {
            imageKey = FALLBACK_IMAGES[rawText];
          }
        }
      }

      return {
        id: `card-${levelIndex}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        text,
        matchValue,
        imageKey,
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
    const droppedInAvailable = overId === "available-area";
    let targetSlotIndex = -1;
    if (overId.startsWith("slot-")) {
      targetSlotIndex = parseInt(overId.replace("slot-", ""), 10);
    }

    if (droppedInAvailable) {
      if (sourceIsSlot) {
        // Move from slot to available
        const newSlots = [...slots];
        newSlots[sourceSlotIndex] = null;
        setSlots(newSlots);
        setAvailable([...available, sourceCard]);
      }
      return;
    }

    if (targetSlotIndex !== -1) {
      // Dropping into a slot
      const targetCard = slots[targetSlotIndex];

      if (sourceIsSlot) {
        // Move from Slot A to Slot B
        if (sourceSlotIndex === targetSlotIndex) return;

        const newSlots = [...slots];
        // Swap
        newSlots[targetSlotIndex] = sourceCard;
        newSlots[sourceSlotIndex] = targetCard;
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
  // Memoized handlers moved UP before any conditional return

  const handleSlotClick = useCallback((index: number) => {
    // If the slot has content, remove it.
    // Logic from removeFromSlot:
    const card = slots[index];
    if (!card) return;

    const next = [...slots];
    next[index] = null;
    setSlots(next);
    setAvailable((prev) => [...prev, card]);
  }, [slots]);

  const handleAvailableItemClick = useCallback((id: string) => {
    const card = available.find(c => c.id === id);
    if (!card) return;

    // Logic from fillFirstEmpty
    const idx = slots.findIndex((s) => s === null);
    if (idx < 0) return;

    const next = [...slots];
    next[idx] = card;
    setSlots(next);
    setAvailable((prev) => prev.filter((c) => c.id !== card.id));
  }, [available, slots]);

  const resetLevel = () => {
    const allCards = [
      ...available,
      ...slots.filter((c): c is GameCard => c !== null),
    ];
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
    if (!level || !resolvedLevel) return; // Guard for check function as well

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
      });
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

  // Now we can do the early return
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

  const filledAll = slots.length > 0 && slots.every((s) => s !== null);

  const getVisualKey = (id: string): VisualKey => {
    if (id === "k") return "mission_cake";
    if (id === "g1") return "mission_hands";
    if (id === "g2") return "mission_plan";
    return "game";
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <ActivityHeader
        title="Sequence Game"
        visualKey="game"
        missionKey={getVisualKey(level.id)}
        subtitle={`Level ${levelIndex + 1}/${levels.length}`}
      />

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
                  onSlotClick={handleSlotClick}
                />
              ))}
            </div>

            <div className="pt-4">
              <div className="text-sm text-gray-600 mb-2">Available cards</div>

              {/* AVAILABLE AREA */}
              <AvailableArea id="available-area">
                <div className="flex flex-wrap gap-2 min-h-[60px] p-2 bg-slate-50 rounded-md border border-dashed border-gray-200">
                  {available.map((c) => (
                    <DraggableItem
                      key={c.id}
                      id={c.id}
                      text={c.text}
                      imageKey={c.imageKey}
                      onItemClick={handleAvailableItemClick}
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
              className="h-auto py-2 px-3 flex flex-col items-center justify-center gap-2 cursor-grabbing shadow-xl w-40"
            >
              {activeCard.imageKey && (
                <ActivityThumb
                  imageKey={activeCard.imageKey}
                  variant="game"
                  className="h-10 w-10 shrink-0"
                />
              )}
              <span className="text-sm leading-tight text-center">
                {activeCard.text}
              </span>
            </Button>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
