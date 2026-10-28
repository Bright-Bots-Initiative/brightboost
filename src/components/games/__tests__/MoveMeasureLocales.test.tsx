import type { ComponentProps } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MoveMeasureGame, {
  dashMeasurement,
  jumpMeasurement,
  tossMeasurement,
} from "../MoveMeasureGame";
import type GameShell from "../shared/GameShell";
import { changeLanguage } from "@/i18n";
import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";
import vietnamese from "@/locales/vi/common.json";

// Keep the actual game and translations; isolate the unrelated shell/routing.
vi.mock("../shared/GameShell", () => ({
  default: ({ children, onComplete }: ComponentProps<typeof GameShell>) =>
    children({ onFinish: onComplete, reducedEffects: false }),
}));

const locales = { es, vi: vietnamese };
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
});
afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  await changeLanguage("en");
});

function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}
function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name, exact: true }), {
    detail: 0,
  });
}

describe("#818 — Move & Measure locale parity and feedback", () => {
  it.each(["es", "vi"] as const)(
    "%s has the English keys, no obsolete keys, and matching interpolation",
    (language) => {
      const copy = locales[language].games.moveMeasure as Record<
        string,
        string
      >;
      expect(Object.keys(copy).sort()).toEqual(
        Object.keys(en.games.moveMeasure).sort(),
      );
      for (const [key, value] of Object.entries(en.games.moveMeasure)) {
        expect(copy[key]?.match(/{{\w+}}/g) ?? [], key).toEqual(
          value.match(/{{\w+}}/g) ?? [],
        );
      }
    },
  );

  it.each([
    ["es", "k2"],
    ["es", "g3_5"],
    ["vi", "k2"],
    ["vi", "g3_5"],
  ] as const)(
    "%s/%s plays through the real game with localized controls and distinct answer/feedback copy",
    async (language, band) => {
      await changeLanguage(language);
      const copy = locales[language].games.moveMeasure as Record<
        string,
        string
      >;
      const complete = vi.fn();
      render(
        <MoveMeasureGame config={{ gradeBand: band }} onComplete={complete} />,
      );
      const finishEvent = (measurement: number) => {
        advance(1200);
        if (band === "g3_5") {
          expect(screen.getByText(copy.compareQuestion)).toBeInTheDocument();
          click(`${measurement.toFixed(1)} m`);
          click(copy.continue);
        }
      };
      click(copy.letsGo);
      if (band === "g3_5") click(copy.start);
      click(copy.tap);
      finishEvent(dashMeasurement(0));
      if (band === "g3_5") click(copy.start);
      click(copy.holdMe);
      click(copy.release);
      finishEvent(jumpMeasurement(0));
      if (band === "g3_5") click(copy.start);
      fireEvent.change(screen.getByRole("slider"), { target: { value: "20" } });
      click(copy.throw);
      finishEvent(tossMeasurement(20));
      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(copy.tossName) }),
      );
      advance(1200);
      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(copy.tipAim) }),
      );
      advance(800);
      fireEvent.change(screen.getByRole("slider"), { target: { value: "50" } });
      click(copy.throw);
      advance(1200);
      expect(screen.getByText(copy.before)).toBeInTheDocument();
      expect(screen.getByText(copy.after)).toBeInTheDocument();
      expect(copy.exitCorrect).not.toBe(copy.exitB);
      click(copy.exitB);
      expect(screen.getByText(copy.exitCorrect)).toBeInTheDocument();
      expect(screen.queryByText(en.games.moveMeasure.exitCorrect)).toBeNull();
      advance(1500);
      expect(screen.getByText(copy.celebTitle)).toBeInTheDocument();
      advance(2500);
      expect(complete).toHaveBeenCalledOnce();
    },
  );
});
