import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GotchaGearsGame from "../GotchaGearsGame";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});
vi.mock("@/hooks/usePersonalBest", () => ({ usePersonalBest: () => null }));

const rounds = Array.from({ length: 7 }, (_, i) => ({
  clueText: `Clue ${i + 1}`,
  correctLabel: `Answer ${i + 1}`,
  distractors: ["Wrong A", "Wrong B", "Wrong C"],
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function start(settings = {}) {
  const complete = vi.fn();
  render(
    <GotchaGearsGame config={{ rounds, settings }} onComplete={complete} />,
  );
  fireEvent.click(screen.getByRole("button", { name: /let.s go|start/i }));
  return complete;
}

async function catchRound(index: number) {
  fireEvent.click(screen.getByRole("button", { name: `⚙️ Answer ${index}` }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(810);
  });
}

async function endWithWrongPicks() {
  for (const label of ["Wrong A", "Wrong B", "Wrong C"]) {
    fireEvent.click(screen.getByRole("button", { name: `⚙️ ${label}` }));
  }
  fireEvent.click(screen.getByRole("button", { name: "Finish" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1600);
  });
}

describe("Gotcha Gears learning results (#895, #896)", () => {
  it("uses the same visual treatment for every unanswered option and explains a wrong pick", () => {
    start();
    const correct = screen.getByRole("button", { name: "⚙️ Answer 1" });
    const wrong = screen.getByRole("button", { name: "⚙️ Wrong A" });
    expect(correct.className).toBe(wrong.className);
    fireEvent.click(wrong);
    expect(screen.getByText("Not that one!")).toBeInTheDocument();
  });

  it.each([0, 1, 3])(
    "reports %i correct rounds honestly after an early finish",
    async (correctCount) => {
      const complete = start();
      for (let i = 1; i <= correctCount; i++) await catchRound(i);
      await endWithWrongPicks();
      const accuracy = Math.round((correctCount / 7) * 100);
      expect(screen.getByText(`${accuracy}%`)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Finish" }));
      expect(complete).toHaveBeenCalledWith(
        expect.objectContaining({
          score: correctCount * (correctCount + 1) * 5,
          total: 7,
          accuracy,
          starsEarned: correctCount === 3 ? 1 : 0,
          roundsCompleted: correctCount + 1,
          gameSpecific: {
            correctCount,
            attempts: correctCount + 3,
            requiredRounds: 7,
          },
        }),
      );
    },
  );

  it("includes the final catch and its streak points in a perfect run", async () => {
    const complete = start();
    for (let i = 1; i <= 7; i++) await catchRound(i);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(screen.getByText("100%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(complete).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 280,
        accuracy: 100,
        starsEarned: 3,
        streakMax: 7,
        roundsCompleted: 7,
        gameSpecific: { correctCount: 7, attempts: 7, requiredRounds: 7 },
      }),
    );
  });

  it("counts wrong choices as attempts even if every round is eventually caught", async () => {
    const complete = start();
    fireEvent.click(screen.getByRole("button", { name: "⚙️ Wrong A" }));
    for (let i = 1; i <= 7; i++) await catchRound(i);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({
        accuracy: 88,
        starsEarned: 2,
        gameSpecific: { correctCount: 7, attempts: 8, requiredRounds: 7 },
      }),
    );
  });

  it("counts missed rounds and cannot award mastery on a zero-catch run", async () => {
    const complete = start({ speed: 1000, maxSpeed: 1000 });
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      if (i < 2)
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1200);
        });
    }
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 0,
        accuracy: 0,
        starsEarned: 0,
        roundsCompleted: 3,
        gameSpecific: { correctCount: 0, attempts: 3, requiredRounds: 7 },
      }),
    );
  });

  it("counts a rapid double-click only once and keeps post-choice feedback", async () => {
    const complete = start();
    const correct = screen.getByRole("button", { name: "⚙️ Answer 1" });
    act(() => {
      fireEvent.click(correct);
      fireEvent.click(correct);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Got it!");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(810);
    });
    await endWithWrongPicks();
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 10,
        gameSpecific: { correctCount: 1, attempts: 4, requiredRounds: 7 },
      }),
    );
  });
});
