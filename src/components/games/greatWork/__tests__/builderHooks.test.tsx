import { StrictMode } from "react";
import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LevelSpec } from "@shared/greatwork-engine";
import { useBoardCamera } from "../board/useBoardCamera";
import { useEnginePlayback } from "../transport/useEnginePlayback";
import { BUILDER_BOUNDS, starterMachine } from "../greatWorkModel";
const level: LevelSpec = {
  key: "hooks",
  mode: "open",
  fixedParts: [],
  bounds: BUILDER_BOUNDS,
  maxTicks: 30,
};
afterEach(() => {
  vi.useRealTimers();
});
describe("responsive camera", () => {
  it.each([
    [1048, 1],
    [346, 2],
    [276, 2.5],
  ])("starts width %i at readable zoom %s", (width, zoom) => {
    const { result } = renderHook(() =>
      useBoardCamera(BUILDER_BOUNDS, width, 430),
    );
    expect(result.current.zoom).toBe(zoom);
  });
  it("adjusts after the canvas is measured but preserves a manual zoom", () => {
    const { result, rerender } = renderHook(
      ({ width }) => useBoardCamera(BUILDER_BOUNDS, width, 430),
      { initialProps: { width: 720 } },
    );
    rerender({ width: 346 });
    expect(result.current.zoom).toBe(2);
    act(() => result.current.setZoom(1.5));
    rerender({ width: 276 });
    expect(result.current.zoom).toBe(1.5);
  });
  it("Fit restores the complete centered board and stays fitted after resizing", () => {
    const { result, rerender } = renderHook(
      ({ width }) => useBoardCamera(BUILDER_BOUNDS, width, 360),
      { initialProps: { width: 346 } },
    );
    act(() => result.current.pan(60, 40));
    act(() => result.current.fit());
    expect(result.current.zoom).toBe(1);
    expect(result.current.camera.x).toBe(173);
    expect(result.current.camera.y).toBe(180);
    rerender({ width: 276 });
    expect(result.current.zoom).toBe(1);
    expect(result.current.camera.x).toBe(138);
  });
});
describe("controlled playback hook", () => {
  it("keeps one run for equivalent controlled JSON even when references change", () => {
    const done = vi.fn();
    const initial = { level, program: starterMachine() };
    const { result, rerender, unmount } = renderHook(
      (props) => useEnginePlayback(props.level, props.program, done),
      { initialProps: initial },
    );
    const driver = result.current.controller;
    act(() => driver.stepOnce());
    rerender(JSON.parse(JSON.stringify(initial)));
    expect(result.current.controller).toBe(driver);
    expect(result.current.snapshot.state?.tick).toBe(1);
    unmount();
  });
  it("replacing the design cancels the old timer and begins a new tick-zero run", () => {
    vi.useFakeTimers();
    const done = vi.fn();
    const { result, rerender, unmount } = renderHook(
      ({ program }) => useEnginePlayback(level, program, done),
      { initialProps: { program: starterMachine() } },
    );
    act(() => result.current.controller.run());
    const old = result.current.controller;
    const next = starterMachine();
    next.tapes[0].chips = ["DROP"];
    rerender({ program: next });
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.controller).not.toBe(old);
    expect(result.current.snapshot.state?.tick).toBe(0);
    expect(done).not.toHaveBeenCalled();
    expect(old.get().mode).toBe("paused");
    unmount();
  });
  it("survives StrictMode effect replay and cancels timers on unmount", () => {
    vi.useFakeTimers();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );
    const { result, unmount } = renderHook(
      () => useEnginePlayback(level, starterMachine(), () => {}),
      { wrapper },
    );
    act(() => result.current.controller.run());
    act(() => vi.advanceTimersByTime(650));
    expect(result.current.snapshot.state?.tick).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
