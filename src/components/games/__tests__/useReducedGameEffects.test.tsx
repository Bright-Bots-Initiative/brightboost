import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useReducedGameEffects, REDUCED_EFFECTS_STORAGE_KEY } from "../shared/useReducedGameEffects";

function HookHarness() {
  const { reducedEffects, source, setReducedEffects, clearReducedEffectsPreference } = useReducedGameEffects();
  return (
    <div>
      <div data-testid="state">{reducedEffects ? "on" : "off"}:{source}</div>
      <button type="button" onClick={() => setReducedEffects(true)}>set-on</button>
      <button type="button" onClick={() => setReducedEffects(false)}>set-off</button>
      <button type="button" onClick={clearReducedEffectsPreference}>clear</button>
    </div>
  );
}

describe("useReducedGameEffects", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("defaults to system reduced-motion when no manual preference is stored", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    render(<HookHarness />);
    expect(screen.getByTestId("state")).toHaveTextContent("on:system");
  });

  it("supports manual override and persistence", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const user = userEvent.setup();

    render(<HookHarness />);
    await user.click(screen.getByRole("button", { name: "set-off" }));

    expect(screen.getByTestId("state")).toHaveTextContent("off:manual");
    expect(window.localStorage.getItem(REDUCED_EFFECTS_STORAGE_KEY)).toBe("false");
  });

  it("clears manual override back to system/default source", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const user = userEvent.setup();

    render(<HookHarness />);
    await user.click(screen.getByRole("button", { name: "set-on" }));
    expect(screen.getByTestId("state")).toHaveTextContent("on:manual");

    await user.click(screen.getByRole("button", { name: "clear" }));
    expect(screen.getByTestId("state")).toHaveTextContent("off:default");
    expect(window.localStorage.getItem(REDUCED_EFFECTS_STORAGE_KEY)).toBeNull();
  });
});
