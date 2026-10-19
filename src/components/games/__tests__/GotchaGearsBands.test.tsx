import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GotchaGearsGame from "../GotchaGearsGame";
import i18n from "@/i18n";

vi.mock("@/hooks/usePersonalBest", () => ({ usePersonalBest: () => null }));

// Evaluate only the canonical content literal: never execute the seed or touch a DB.
const seed = readFileSync("prisma/seed.cjs", "utf8");
const literal = seed.match(
  /const gotchaGameContent = JSON\.stringify\(([\s\S]*?)\);/,
);
if (!literal) throw new Error("Canonical Gotcha Gears content was not found");
const canonical = runInNewContext(`(${literal[1]})`);

beforeEach(async () => {
  await i18n.changeLanguage("en");
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
afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  await i18n.changeLanguage("en");
});

function start(config: Record<string, unknown>) {
  const complete = vi.fn();
  render(<GotchaGearsGame config={config} onComplete={complete} />);
  fireEvent.click(
    screen.getByRole("button", { name: /let.s go|start|iniciar/i }),
  );
  return complete;
}
async function catchAnswer(label: string) {
  fireEvent.click(screen.getByRole("button", { name: `⚙️ ${label}` }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(810);
  });
}

describe("#901 — canonical and authored grade-band content", () => {
  it.each(["k2", "g3_5"])(
    "plays canonical seed content through for %s",
    async (gradeBand) => {
      const complete = start({ ...canonical, gradeBand });
      const labels =
        gradeBand === "k2"
          ? Array.from({ length: 7 }, (_, i) =>
              i18n.t(`content.gotchaGame.r${i + 1}.correct`),
            )
          : [
              "CPU",
              "Hard Drive",
              "Sensor",
              "Actuator",
              "Loop",
              "Validation",
              "API",
              "Debugging",
            ];
      for (const label of labels) await catchAnswer(label);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });
      expect(screen.getByText("100%")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Finish" }));
      expect(complete).toHaveBeenCalledWith(
        expect.objectContaining({
          total: labels.length,
          roundsCompleted: labels.length,
          accuracy: 100,
        }),
      );
    },
  );

  it("normalizes the built-in localized distractor lists", () => {
    start({ gradeBand: "g3_5" });
    expect(screen.getByRole("button", { name: "⚙️ CPU" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "⚙️ Battery" }),
    ).toBeInTheDocument();
  });

  it("selects the harder bank for existing seed data without a band tag", () => {
    const { roundsGradeBand: _tag, ...legacy } = canonical;
    start({ ...legacy, gradeBand: "g3_5" });
    expect(screen.getByRole("button", { name: "⚙️ CPU" })).toBeInTheDocument();
  });

  it("does not discard edited legacy rounds that resemble the seed", () => {
    const { roundsGradeBand: _tag, ...legacy } = canonical;
    const rounds = legacy.rounds.map((round: object, index: number) =>
      index ? round : { ...round, clueText: "Teacher-authored variation" },
    );
    start({ ...legacy, rounds, gradeBand: "g3_5" });
    expect(screen.getByText(/Teacher-authored variation/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `⚙️ ${i18n.t("content.gotchaGame.r1.correct")}`,
      }),
    ).toBeInTheDocument();
  });

  it("preserves an intentional legacy authored override", () => {
    start({
      gradeBand: "g3_5",
      rounds: [
        {
          clueText: "Authored clue",
          correctLabel: "Custom answer",
          distractors: ["Other answer"],
        },
      ],
    });
    expect(screen.getByText(/Authored clue/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "⚙️ Custom answer" }),
    ).toBeInTheDocument();
  });

  it("prefers explicit per-band authored content and localizes its answers", async () => {
    await i18n.changeLanguage("es");
    start({
      ...canonical,
      gradeBand: "g3_5",
      roundsByBand: {
        g3_5: [
          {
            clueText: { en: "Custom clue", es: "Pista personalizada" },
            correctLabel: { en: "Correct", es: "Correcta" },
            distractors: { en: ["Other"], es: ["Otra"] },
          },
        ],
      },
    });
    expect(screen.getByText(/Pista personalizada/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "⚙️ Correcta" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "⚙️ Otra" })).toBeInTheDocument();
  });

  it("selects Spanish upper-elementary questions with the existing seed", async () => {
    await i18n.changeLanguage("es");
    start({ ...canonical, gradeBand: "g3_5" });
    expect(
      screen.getByText(/Proceso datos para tomar decisiones/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "⚙️ Batería" }),
    ).toBeInTheDocument();
  });
});
