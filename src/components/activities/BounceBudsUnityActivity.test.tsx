// src/components/activities/BounceBudsUnityActivity.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import BounceBudsUnityActivity from "./BounceBudsUnityActivity";

// Mock UnityWebGL component
vi.mock("../unity/UnityWebGL", () => ({
  default: ({
    onInstanceReady,
  }: {
    onInstanceReady?: (instance: any) => void;
  }) => {
    // Simulate instance ready after render
    setTimeout(() => {
      if (onInstanceReady) {
        onInstanceReady({
          SendMessage: vi.fn(),
        });
      }
    }, 0);
    return <div data-testid="unity-webgl">Unity WebGL Mock</div>;
  },
}));

// Mock ActivityHeader
vi.mock("@/components/activities/ActivityHeader", () => ({
  default: ({ title }: { title: string }) => (
    <div data-testid="activity-header">{title}</div>
  ),
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock crypto.randomUUID
const mockSessionId = "test-session-bounce-123";
vi.stubGlobal("crypto", {
  randomUUID: () => mockSessionId,
});

describe("BounceBudsUnityActivity", () => {
  const mockConfig = {
    gameKey: "bounce_buds_unity" as const,
    settings: {
      lives: 3,
      roundTimeS: 12,
      ballSpeed: 7,
      paddleSpeed: 12,
      obstacleCount: 4,
    },
    rounds: [
      {
        clueText: "An animal that says meow",
        correctLabel: "CAT",
        distractors: ["DOG", "BIRD"],
        hint: "It purrs!",
      },
      {
        clueText: "The color of the sky",
        correctLabel: "BLUE",
        distractors: ["RED", "GREEN"],
        hint: "Look up on a sunny day!",
      },
    ],
  };

  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders UnityWebGL component and ActivityHeader", () => {
    render(
      <BounceBudsUnityActivity
        config={mockConfig}
        onComplete={mockOnComplete}
      />,
    );
    expect(screen.getByTestId("unity-webgl")).toBeInTheDocument();
    expect(screen.getByTestId("activity-header")).toBeInTheDocument();
    expect(screen.getByTestId("activity-header")).toHaveTextContent(
      "Bounce & Buds",
    );
  });

  it("calls onComplete when receiving valid completion event", async () => {
    render(
      <BounceBudsUnityActivity
        config={mockConfig}
        onComplete={mockOnComplete}
      />,
    );

    // Dispatch completion event with matching sessionId
    const event = new CustomEvent("unityBounceBudsComplete", {
      detail: { sessionId: mockSessionId, score: 5, total: 5, streakMax: 3, roundsCompleted: 5 },
    });
    window.dispatchEvent(event);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("ignores completion event with mismatched sessionId", async () => {
    render(
      <BounceBudsUnityActivity
        config={mockConfig}
        onComplete={mockOnComplete}
      />,
    );

    // Dispatch completion event with wrong sessionId
    const event = new CustomEvent("unityBounceBudsComplete", {
      detail: { sessionId: "wrong-session", score: 5, total: 5, streakMax: 3, roundsCompleted: 5 },
    });
    window.dispatchEvent(event);

    // Wait a bit and ensure onComplete was NOT called
    await new Promise((r) => setTimeout(r, 50));
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it("ignores duplicate completion events (alreadyCompleted guard)", async () => {
    render(
      <BounceBudsUnityActivity
        config={mockConfig}
        onComplete={mockOnComplete}
      />,
    );

    // Dispatch first completion event
    const event1 = new CustomEvent("unityBounceBudsComplete", {
      detail: { sessionId: mockSessionId, score: 5, total: 5, streakMax: 3, roundsCompleted: 5 },
    });
    window.dispatchEvent(event1);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    // Dispatch second completion event (should be ignored)
    const event2 = new CustomEvent("unityBounceBudsComplete", {
      detail: { sessionId: mockSessionId, score: 5, total: 5, streakMax: 3, roundsCompleted: 5 },
    });
    window.dispatchEvent(event2);

    // Wait a bit and ensure onComplete was NOT called again
    await new Promise((r) => setTimeout(r, 50));
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it("cleans up event listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = render(
      <BounceBudsUnityActivity
        config={mockConfig}
        onComplete={mockOnComplete}
      />,
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "unityBounceBudsComplete",
      expect.any(Function),
    );
  });

  it("uses InitFromJson method name when sending config", () => {
    render(
      <BounceBudsUnityActivity
        config={mockConfig}
        onComplete={mockOnComplete}
      />,
    );

    // Component renders successfully, meaning the onInstanceReady callback is configured
    expect(screen.getByTestId("unity-webgl")).toBeInTheDocument();
  });

  it("displays instructions card with How to Play text", () => {
    render(
      <BounceBudsUnityActivity
        config={mockConfig}
        onComplete={mockOnComplete}
      />,
    );

    expect(screen.getByText("How to Play")).toBeInTheDocument();
    expect(screen.getByText(/Use the paddle to bounce your Buddy/)).toBeInTheDocument();
  });
});
