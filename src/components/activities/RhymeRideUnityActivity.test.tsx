// src/components/activities/RhymeRideUnityActivity.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import RhymeRideUnityActivity from "./RhymeRideUnityActivity";

// Mock UnityWebGL component
vi.mock("../unity/UnityWebGL", () => ({
  default: ({ onInstanceReady }: { onInstanceReady?: (instance: any) => void }) => {
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

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock crypto.randomUUID
const mockSessionId = "test-session-123";
vi.stubGlobal("crypto", {
  randomUUID: () => mockSessionId,
});

describe("RhymeRideUnityActivity", () => {
  const mockConfig = {
    gameKey: "rhyme_ride_unity" as const,
    rounds: [
      {
        promptWord: "cat",
        correctWord: "hat",
        distractors: ["dog", "tree"],
      },
      {
        promptWord: "sun",
        correctWord: "run",
        distractors: ["moon", "star"],
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

  it("renders UnityWebGL component", () => {
    render(<RhymeRideUnityActivity config={mockConfig} onComplete={mockOnComplete} />);
    expect(screen.getByTestId("unity-webgl")).toBeInTheDocument();
  });

  it("calls onComplete when receiving valid completion event", async () => {
    render(<RhymeRideUnityActivity config={mockConfig} onComplete={mockOnComplete} />);

    // Dispatch completion event with matching sessionId
    const event = new CustomEvent("unityRhymeRideComplete", {
      detail: { sessionId: mockSessionId, score: 5, accuracy: 0.9 },
    });
    window.dispatchEvent(event);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("ignores completion event with mismatched sessionId", async () => {
    render(<RhymeRideUnityActivity config={mockConfig} onComplete={mockOnComplete} />);

    // Dispatch completion event with wrong sessionId
    const event = new CustomEvent("unityRhymeRideComplete", {
      detail: { sessionId: "wrong-session", score: 5, accuracy: 0.9 },
    });
    window.dispatchEvent(event);

    // Wait a bit and ensure onComplete was NOT called
    await new Promise((r) => setTimeout(r, 50));
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it("sends config to Unity on instance ready", async () => {
    const sendMessageMock = vi.fn();

    // Override mock to capture SendMessage calls
    vi.doMock("../unity/UnityWebGL", () => ({
      default: ({ onInstanceReady }: { onInstanceReady?: (instance: any) => void }) => {
        setTimeout(() => {
          if (onInstanceReady) {
            onInstanceReady({ SendMessage: sendMessageMock });
          }
        }, 0);
        return <div data-testid="unity-webgl">Unity WebGL Mock</div>;
      },
    }));

    // Re-import after mock update
    const { default: RhymeRideUnityActivityFresh } = await import("./RhymeRideUnityActivity");
    render(<RhymeRideUnityActivityFresh config={mockConfig} onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        "WebBridge",
        "InitRhymeRide",
        expect.stringContaining(mockSessionId)
      );
    });
  });
});
