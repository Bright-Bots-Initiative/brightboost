import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import "@/i18n";
import type { ComponentProps } from "react";
import type GameShell from "../shared/GameShell";
import Bounce from "../BounceBudsGame";
import Gears from "../GotchaGearsGame";
import Rhyme from "../RhymeRideGame";
import Quantum from "../QuantumQuestGame";
import { RETRY_MS, ANSWER_MS } from "../shared/usePracticeRound";

vi.mock("../shared/GameShell", () => ({
  default: ({
    children,
    onComplete,
  }: Pick<ComponentProps<typeof GameShell>, "children" | "onComplete">) =>
    children({ onFinish: onComplete, reducedEffects: true }),
}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  // Advance game time without moving targets; the Bounce test exercises its actual timeout.
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.spyOn(Math, "random").mockReturnValue(0.99);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};
const retry = () =>
  expect(screen.getByRole("status")).toHaveTextContent("Try this one again.");
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));

describe("K–2 keeps the same prompt for two retries, then teaches the answer", () => {
  it("Bounce & Buds: a timeout replays the plant question and advances without a point", async () => {
    render(<Bounce config={{ gradeBand: "k2" }} onComplete={vi.fn()} />);
    for (let miss = 1; miss <= 3; miss++) {
      expect(
        screen.getByText("Which one helps a plant grow?"),
      ).toBeInTheDocument();
      await tick(1000);
      fireEvent.keyDown(window, { key: "Enter", code: "Enter" });
      await tick(25000);
      if (miss < 3) retry();
      else
        expect(screen.getByRole("status")).toHaveTextContent(
          "The answer is Water",
        );
      await tick((miss < 3 ? RETRY_MS : ANSWER_MS) + 400);
    }
    expect(
      screen.getByText("Which part drinks water from the soil?"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Score: 0/)).toBeInTheDocument();
  });
  it("Gotcha Gears: an assisted round counts as visited, never as correct", async () => {
    const done = vi.fn();
    render(
      <Gears
        config={{
          gradeBand: "k2",
          rounds: [
            {
              clueText: "Pick water",
              correctLabel: "Water",
              distractors: ["Rock"],
            },
            { clueText: "Pick sun", correctLabel: "Sun", distractors: ["Ice"] },
          ],
        }}
        onComplete={done}
      />,
    );
    for (let miss = 1; miss <= 3; miss++) {
      click("⚙️ Rock");
      if (miss < 3) retry();
      else
        expect(screen.getByRole("status")).toHaveTextContent(
          "The answer is Water",
        );
      await tick(miss < 3 ? RETRY_MS : ANSWER_MS);
    }
    click("⚙️ Sun");
    await tick(850);
    expect(done).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        roundsCompleted: 2,
        gameSpecific: { correctCount: 1, attempts: 4, requiredRounds: 2 },
      }),
    );
  });
  it("Rhyme Ride: the same word pair is replayed, then the next family opens", async () => {
    render(<Rhyme config={{ gradeBand: "k2" }} onComplete={vi.fn()} />);
    // With the initial order retained, the first lane is the rhyme, the second a distractor.
    for (let miss = 1; miss <= 3; miss++) {
      expect(screen.getByText("1/6")).toBeInTheDocument();
      expect(screen.getByText("-at")).toBeInTheDocument();
      click("Lane 2");
      if (miss < 3) retry();
      else
        expect(screen.getByRole("status")).toHaveTextContent(
          "The answer is sat",
        );
      await tick(miss < 3 ? RETRY_MS : ANSWER_MS);
    }
    expect(screen.getByText("2/6")).toBeInTheDocument();
    expect(screen.getByText("-an")).toBeInTheDocument();
  });
  it("Quantum Quest: a shown answer does not award first-try or correctness credit", async () => {
    const done = vi.fn();
    render(
      <Quantum
        onComplete={done}
        config={{
          gameKey: "quantum_quest",
          gradeBand: "k2",
          sectors: [
            {
              id: "s",
              titles: { en: "Stars" },
              theme: "harbor",
              speed: 1,
              spawnRate: 1,
              problems: [
                {
                  id: "p",
                  prompts: { en: "Two plus one?" },
                  skillTag: "addition",
                  correctAnswer: 3,
                  decoys: [4],
                },
              ],
            },
          ],
        }}
      />,
    );
    for (let miss = 1; miss <= 3; miss++) {
      click("4");
      if (miss < 3) retry();
      else
        expect(screen.getByRole("status")).toHaveTextContent("The answer is 3");
      await tick(miss < 3 ? RETRY_MS : ANSWER_MS);
    }
    click("Finish");
    expect(done).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        score: 0,
        firstTryClear: false,
        accuracy: 0,
        roundsCompleted: 1,
      }),
    );
  });
});
