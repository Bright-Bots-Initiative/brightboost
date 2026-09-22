import type { ComponentProps } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MoveMeasureGame from "../MoveMeasureGame";
import type GameShell from "../shared/GameShell";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});
// Keep the real playfield, phase transitions and scorer; isolate shell routing.
vi.mock("../shared/GameShell", () => ({
  default: ({ children, onComplete }: ComponentProps<typeof GameShell>) =>
    children({ onFinish: onComplete, reducedEffects: false }),
}));

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
function advanceFrames(count: number) {
  for (let i = 0; i < count; i++) {
    act(() => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(i * 16));
    });
  }
}
function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}
async function tabTo(
  user: ReturnType<typeof userEvent.setup>,
  target: HTMLElement,
) {
  for (let i = 0; document.activeElement !== target && i < 12; i++) {
    await user.tab();
  }
  expect(target).toHaveFocus();
}
async function startJump() {
  const onComplete = vi.fn();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<MoveMeasureGame onComplete={onComplete} />);
  await tabTo(user, screen.getByRole("button", { name: "Let's Go!" }));
  await user.keyboard("{Enter}");
  await tabTo(user, screen.getByRole("button", { name: "TAP!" }));
  advanceFrames(29);
  await user.keyboard("{Enter}");
  advance(1200);
  const button = screen.getByRole("button", { name: "HOLD ME!" });
  await tabTo(user, button);
  return { user, button, onComplete };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  frames = new Map();
  nextFrame = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  // jsdom has no PointerEvent; preserve the identity/type needed by the control.
  vi.stubGlobal(
    "PointerEvent",
    class extends MouseEvent {
      pointerId: number;
      pointerType: string;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
        this.pointerType = init.pointerType ?? "mouse";
      }
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Move & Measure keyboard completion (#880)", () => {
  it.each(["Space", "Enter"])(
    "completes jump, jump retry and the game using %s",
    async (key) => {
      const { user, button, onComplete } = await startJump();
      await user.keyboard(`[${key}>]`);
      expect(screen.getByRole("button", { name: "RELEASE!" })).toBe(button);
      expect(button).toHaveFocus();
      advanceFrames(45);
      await user.keyboard(`[/${key}]`);
      advance(1200);
      await tabTo(user, screen.getByRole("button", { name: "THROW!" }));
      await user.keyboard("{Enter}");
      advance(1200);
      await tabTo(user, screen.getByRole("button", { name: /🦘 Jump/ }));
      await user.keyboard("{Enter}");
      advance(1200);
      await tabTo(
        user,
        screen.getByRole("button", { name: /Control your power/ }),
      );
      await user.keyboard("{Enter}");
      advance(800);
      await tabTo(user, screen.getByRole("button", { name: "HOLD ME!" }));
      await user.keyboard(`[${key}>]`);
      advanceFrames(45);
      await user.keyboard(`[/${key}]`);
      advance(1200);
      await tabTo(
        user,
        screen.getByRole("button", { name: "I measured and compared" }),
      );
      await user.keyboard("{Enter}");
      advance(1500);
      advance(2500);
      expect(onComplete).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          score: 30,
          total: 40,
          roundsCompleted: 3,
          gameSpecific: {
            dash: 10,
            jump: 10,
            toss: 0,
            impEvent: "jump",
            impScore: 10,
            exitCorrect: true,
          },
        }),
      );
    },
  );

  it("cancels on focus loss and ignores repeats, unrelated keys and stray releases", async () => {
    const { user, button } = await startJump();
    fireEvent.keyUp(button, { key: " " });
    expect(button).toHaveTextContent("HOLD ME!");
    await user.keyboard("[Space>]");
    advanceFrames(20);
    fireEvent.keyDown(button, { key: " ", repeat: true });
    fireEvent.keyUp(button, { key: "Enter" });
    expect(button).toHaveTextContent("RELEASE!");
    await user.tab();
    expect(button).toHaveTextContent("HOLD ME!");
    advance(5000);
    expect(
      screen.queryByRole("button", { name: "THROW!" }),
    ).not.toBeInTheDocument();
    await user.keyboard("[/Space]");
    await tabTo(user, button);
    await user.keyboard("[Enter>]");
    advanceFrames(45);
    await user.keyboard("[/Enter]");
    advance(1200);
    expect(screen.getByRole("button", { name: "THROW!" })).toBeInTheDocument();
  });

  it("cancels when the window loses focus and allows assistive activation", async () => {
    const { user, button } = await startJump();
    await user.keyboard("[Space>]");
    advanceFrames(20);
    fireEvent.blur(window);
    expect(button).toHaveTextContent("HOLD ME!");
    await user.keyboard("[/Space]");
    advance(1200);
    expect(button).toBeInTheDocument();
    fireEvent.click(button, { detail: 0 });
    expect(button).toHaveTextContent("RELEASE!");
    advanceFrames(45);
    fireEvent.click(button, { detail: 0 });
    advance(1200);
    expect(screen.getByRole("button", { name: "THROW!" })).toBeInTheDocument();
  });

  it.each(["mouse", "touch"])(
    "keeps %s hold/release usable after pointer cancellation",
    async (pointerType) => {
      const { button } = await startJump();
      fireEvent.pointerDown(button, { pointerId: 1, pointerType, button: 0 });
      expect(screen.getByRole("button", { name: "RELEASE!" })).toBe(button);
      advanceFrames(20);
      fireEvent.pointerCancel(button, { pointerId: 1, pointerType });
      expect(button).toHaveTextContent("HOLD ME!");
      fireEvent.pointerUp(button, { pointerId: 1, pointerType });
      advance(1200);
      expect(button).toBeInTheDocument();
      fireEvent.pointerDown(button, { pointerId: 2, pointerType, button: 0 });
      fireEvent.pointerUp(button, { pointerId: 99, pointerType });
      expect(button).toHaveTextContent("RELEASE!");
      advanceFrames(45);
      fireEvent.pointerUp(button, { pointerId: 2, pointerType });
      advance(1200);
      expect(
        screen.getByRole("button", { name: "THROW!" }),
      ).toBeInTheDocument();
    },
  );
});
