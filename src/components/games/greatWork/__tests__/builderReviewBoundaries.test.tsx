import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { canonicalize } from "@shared/greatwork-engine";
import type { Molecule, RunResult } from "@shared/greatwork-engine";
import i18n from "@/i18n";
import { GreatWorkBuilder } from "../GreatWorkBuilder";
import { resolveBandConfig } from "../greatWorkBandConfig";
import type { PartAllowList } from "../greatWorkBandConfig";
import { starterMachine } from "../greatWorkModel";
import { RunNote } from "../feedback/RunNote";

beforeEach(async () => {
  await i18n.changeLanguage("en");
  // Inspect controls and callback boundaries here, not canvas drawing.
  // Real Chromium stories separately prove the board and keyboard sensors.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("#721 review: changing lesson restrictions", () => {
  const config = resolveBandConfig("g3_5");
  const program = starterMachine();
  function builder(
    onRunResult: (result: RunResult) => void,
    allowList?: PartAllowList,
  ) {
    return (
      <I18nextProvider i18n={i18n}>
        <GreatWorkBuilder
          band="g3_5"
          bandConfig={config}
          program={program}
          target={null}
          onProgramChange={() => {}}
          onRunResult={onRunResult}
          allowList={allowList}
        />
      </I18nextProvider>
    );
  }
  it("allows the unchanged permitted machine to finish", () => {
    vi.useFakeTimers();
    const done = vi.fn();
    render(builder(done));
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    act(() => vi.advanceTimersByTime(10000));
    expect(done).toHaveBeenCalledTimes(1);
  });
  it.each<{ name: string; allow: PartAllowList }>([
    { name: "instructions", allow: { instructions: ["GRAB"] } },
    { name: "parts", allow: { parts: ["arm"] } },
  ])(
    "stops when $name become unavailable and waits for Run after restoration",
    ({ allow }) => {
      vi.useFakeTimers();
      const done = vi.fn();
      const before = JSON.stringify(program);
      const view = render(builder(done));
      fireEvent.click(screen.getByRole("button", { name: "Run" }));
      act(() => vi.advanceTimersByTime(650));
      view.rerender(builder(done, allow));
      act(() => vi.advanceTimersByTime(10000));
      expect(done).not.toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
      expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();
      expect(JSON.stringify(program)).toBe(before);
      view.rerender(builder(done));
      act(() => vi.advanceTimersByTime(10000));
      expect(done).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Run" }));
      act(() => vi.advanceTimersByTime(10000));
      expect(done).toHaveBeenCalledTimes(1);
    },
  );
});

describe("#721 review: precise creation feedback", () => {
  const fire: Molecule = {
    atoms: [{ element: "fire", at: { q: 0, r: 0 } }],
    bonds: [],
  };
  const water: Molecule = {
    atoms: [{ element: "water", at: { q: 0, r: 0 } }],
    bonds: [],
  };
  function resultFor(molecules: Molecule[]): RunResult {
    return {
      solved: false,
      cycles: 12,
      cost: 5,
      area: 4,
      instructions: 3,
      produced: molecules.map((molecule, index) => ({
        canonical: canonicalize(molecule),
        molecule,
        count: 1,
        firstTick: index + 1,
      })),
    };
  }
  it.each(["matching first", "mismatched first"])(
    "names the mismatched output with %s",
    (order) => {
      const result = resultFor(
        order === "matching first" ? [fire, water] : [water, fire],
      );
      render(
        <I18nextProvider i18n={i18n}>
          <RunNote
            result={result}
            target={{ molecule: fire, count: 3 }}
            invalid={false}
            showMetrics={false}
          />
        </I18nextProvider>,
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        "It made Water. You were going for Fire",
      );
    },
  );
  it("does not describe a matching but incomplete delivery as a wrong product", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <RunNote
          result={resultFor([fire])}
          target={{ molecule: fire, count: 3 }}
          invalid={false}
          showMetrics={false}
        />
      </I18nextProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your machine makes Fire!",
    );
  });
});
