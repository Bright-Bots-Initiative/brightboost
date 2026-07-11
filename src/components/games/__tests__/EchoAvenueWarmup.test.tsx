/**
 * The pre-warm contract (design ruling 10, held-firm requirement):
 * the AudioContext wakes on the Start screen's FIRST interaction, exactly
 * once — and after entering the studio, the first pad tap plays
 * SYNCHRONOUSLY (no wake gap, nothing awaited on the tap path).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createWarmupGate } from "../echoAvenue/echoAvenueWarmup";
import { EchoStudioCore } from "../echoAvenue/EchoAvenueGame";
import type { EchoAudio } from "../echoAvenue/echoAvenueAudio";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty" as const, init: () => {} },
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
  }),
}));

vi.mock("@/services/api", () => ({
  useApi: () => ({
    get: vi.fn().mockRejectedValue(new Error("offline test")),
    post: vi.fn(),
    patch: vi.fn(),
  }),
}));

vi.mock("@/utils/localizedContent", () => ({
  pickLocale: (map: Record<string, string>, fallback: string) => map.en ?? fallback,
}));

// ── Gate unit contract ──────────────────────────────────────────────────────

describe("createWarmupGate", () => {
  it("wakes exactly once no matter how many interactions race", async () => {
    let resolveWake: () => void = () => {};
    const prewarm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveWake = resolve;
        }),
    );
    const gate = createWarmupGate({ prewarm });
    void gate.warmOnFirstInteraction();
    void gate.warmOnFirstInteraction();
    void gate.warmOnFirstInteraction();
    expect(prewarm).toHaveBeenCalledTimes(1);
    expect(gate.isWarm()).toBe(false);
    resolveWake();
    await gate.warmOnFirstInteraction();
    expect(gate.isWarm()).toBe(true);
    expect(gate.wakeCount()).toBe(1);
  });
});

// ── Component contract: title interaction warms; pad tap is synchronous ────

function mockAudio(): EchoAudio & { prewarm: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn> } {
  let t = 100;
  return {
    ctx: {} as AudioContext,
    master: {} as GainNode,
    layerGain: { lead: {} as GainNode, partner: {} as GainNode },
    prewarm: vi.fn(async () => {}),
    play: vi.fn(),
    tick: vi.fn(),
    setMasterVolume: vi.fn(),
    setLayerVolume: vi.fn(),
    now: () => (t += 0.01),
  };
}

describe("EchoStudioCore — pre-warm sequencing", () => {
  beforeEach(() => localStorage.clear());

  it("any Start-screen interaction wakes the engine ONCE; the first studio pad tap plays synchronously", () => {
    const audio = mockAudio();
    const { container } = render(
      <EchoStudioCore
        onFinish={() => {}}
        reducedEffects={false}
        band="k2"
        audioFactory={() => audio}
      />,
    );

    // First interaction: a mood-preview tap on the title screen
    fireEvent.pointerDown(container.firstChild as Element);
    expect(audio.prewarm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("🔁 Echo")); // more title interactions…
    fireEvent.pointerDown(container.firstChild as Element);
    expect(audio.prewarm).toHaveBeenCalledTimes(1); // …still exactly one wake

    // Enter the studio
    fireEvent.click(screen.getByText("Open the studio!"));

    // The child's first musical tap: play() fires within the tap's own event
    // dispatch — nothing awaited, no wake gap (prewarm count unchanged).
    audio.play.mockClear();
    fireEvent.pointerDown(screen.getByLabelText("step"));
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.play.mock.calls[0][0]).toBe("step");
    expect(audio.prewarm).toHaveBeenCalledTimes(1); // the tap never pays the wake
  });

  it("K-2 studio opens with the starter pulse seeded (the canvas is never blank)", () => {
    const audio = mockAudio();
    render(
      <EchoStudioCore
        onFinish={() => {}}
        reducedEffects={false}
        band="k2"
        audioFactory={() => audio}
      />,
    );
    fireEvent.click(screen.getByText("Open the studio!"));
    // Lead tab shows its seeded event count > 0
    expect(screen.getByText(/Lead \([1-9]/)).toBeTruthy();
  });

  it("Partner starts locked on K-2 and the pads show only the starting pair", () => {
    const audio = mockAudio();
    render(
      <EchoStudioCore
        onFinish={() => {}}
        reducedEffects={false}
        band="k2"
        audioFactory={() => audio}
      />,
    );
    fireEvent.click(screen.getByText("Open the studio!"));
    // Source-reconciled K-2 opening: Step + Clap pads first
    expect(screen.getByLabelText("step")).toBeTruthy();
    expect(screen.getByLabelText("clap")).toBeTruthy();
    expect(screen.queryByLabelText("chime")).toBeNull(); // locked until first phrase
    const partnerTab = screen.getByRole("button", { name: /Partner \(0\)/ });
    expect(partnerTab.hasAttribute("disabled")).toBe(true);
  });
});
