import { render, screen, fireEvent } from "@testing-library/react";
import SequenceDragDropGame from "./SequenceDragDropGame";
import { describe, it, expect, vi } from "vitest";

// Mocks
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' }
  }),
}));

// Mock dnd-kit to avoid JSDOM issues and focus on game logic
vi.mock("@dnd-kit/core", async () => {
  return {
    DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DragOverlay: () => null,
    useSensor: () => null,
    useSensors: () => null,
    PointerSensor: class {},
    KeyboardSensor: class {},
    defaultDropAnimationSideEffects: () => ({}),
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: (node: any) => {},
      transform: null,
      isDragging: false,
    }),
    useDroppable: () => ({
      setNodeRef: (node: any) => {},
      isOver: false,
    }),
  };
});

const mockConfig = {
  type: "minigame" as const,
  gameKey: "sequence_drag_drop" as const,
  levels: [
    {
      id: "1",
      cards: ["A", "B", "C"],
      answer: ["A", "B", "C"],
    },
  ],
};

describe("SequenceDragDropGame", () => {
  it("renders correct number of slots and available cards", () => {
    render(<SequenceDragDropGame config={mockConfig} onComplete={vi.fn()} />);

    // 3 Slots
    expect(screen.getByText("Slot 1")).toBeInTheDocument();
    expect(screen.getByText("Slot 2")).toBeInTheDocument();
    expect(screen.getByText("Slot 3")).toBeInTheDocument();

    // 3 Available cards
    // The mock makes them render normally
    const cardsA = screen.getAllByText("A");
    expect(cardsA.length).toBeGreaterThan(0);
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("tap fallback allows placing cards", async () => {
    render(<SequenceDragDropGame config={mockConfig} onComplete={vi.fn()} />);

    // Initial state: Slot 1 is empty
    expect(screen.getByText("Slot 1")).toBeInTheDocument();

    // Tap card "A"
    const cardA = screen.getByText("A");
    fireEvent.click(cardA);

    // Now Slot 1 should be filled. "Slot 1" text (the placeholder) should be gone.
    expect(screen.queryByText("Slot 1")).not.toBeInTheDocument();

    // And "Slot 2" should still be there
    expect(screen.getByText("Slot 2")).toBeInTheDocument();
  });

  it("enables Check Order only when full", () => {
    render(<SequenceDragDropGame config={mockConfig} onComplete={vi.fn()} />);

    const checkBtn = screen.getByText("Check Order");
    expect(checkBtn).toBeDisabled();

    fireEvent.click(screen.getByText("A"));
    fireEvent.click(screen.getByText("B"));
    fireEvent.click(screen.getByText("C"));

    expect(checkBtn).not.toBeDisabled();
  });

  it("calls onComplete when correct", () => {
    const onComplete = vi.fn();
    render(<SequenceDragDropGame config={mockConfig} onComplete={onComplete} />);

    // Place in correct order: A, B, C
    fireEvent.click(screen.getByText("A"));
    fireEvent.click(screen.getByText("B"));
    fireEvent.click(screen.getByText("C"));

    fireEvent.click(screen.getByText("Check Order"));

    expect(onComplete).toHaveBeenCalled();
  });

  it("does not call onComplete when incorrect", () => {
     const onComplete = vi.fn();
    render(<SequenceDragDropGame config={mockConfig} onComplete={onComplete} />);

    // Place in wrong order: B, A, C
    // Note: click fills first empty slot.
    fireEvent.click(screen.getByText("B"));
    fireEvent.click(screen.getByText("A"));
    fireEvent.click(screen.getByText("C"));

    fireEvent.click(screen.getByText("Check Order"));

    expect(onComplete).not.toHaveBeenCalled();
  });
});
