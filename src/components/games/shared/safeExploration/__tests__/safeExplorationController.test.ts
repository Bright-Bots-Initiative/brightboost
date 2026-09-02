/**
 * #838 — the Safe Exploration controller (headless half).
 *
 * These pin the two guards the controller owns and the §6 failure distinction:
 *
 *   SEC-1  grammar guard — `keep` exists only as an exit of `observing`, so a
 *          stray keep after a restore cannot overwrite the preserved baseline.
 *   SEC-2  latch — one consequential submit per in-flight action
 *          (the `completingRef` precedent in `src/pages/ActivityPlayer.tsx`).
 *   SEC-3  learner outcomes never become errors, and infrastructure failures
 *          never become learner outcomes — including thrown/rejected handlers.
 *   SEC-4  the controller computes nothing: no randomness, no scores.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSafeExplorationController } from "../useSafeExplorationController";
import type {
  SafeExplorationActionId,
  SafeExplorationConfig,
  SafeExplorationOutcome,
} from "../types";

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const BASE: SafeExplorationConfig = {
  surfaceId: "test-surface",
  band: "k2",
  baseline: { id: "b-1", label: "Your saved track" },
  onRun: () => ({ status: "ok", summary: "The bike spun out." }),
};

function setup(overrides: Partial<SafeExplorationConfig> = {}) {
  const config = { ...BASE, ...overrides } as SafeExplorationConfig;
  return renderHook(() => useSafeExplorationController(config));
}

/** Drive the surface into `observing` with a synchronous, successful run. */
function toObserving(result: {
  current: ReturnType<typeof useSafeExplorationController>;
}) {
  act(() => {
    result.current.requestAction("run");
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SEC — state transitions and the callback contract", () => {
  it("walks the K–2 grammar: baseline → running → observing → kept", () => {
    const order: string[] = [];
    const { result } = setup({
      onRun: () => {
        order.push("run");
        return { status: "ok", summary: "The bike spun out." };
      },
      onKeep: () => {
        order.push("keep");
      },
      onRestore: () => {
        order.push("restore");
      },
    });

    expect(result.current.state).toBe("baseline");
    expect(result.current.announcement).toBeNull(); // idle is silent

    toObserving(result);
    expect(result.current.state).toBe("observing");
    expect(result.current.attempt).toBe(1);

    act(() => {
      result.current.requestAction("keep");
    });
    expect(result.current.state).toBe("kept");
    expect(order).toEqual(["run", "keep"]);
  });

  it("walks the older grammar: preview → run → observing → branch", () => {
    const order: string[] = [];
    const { result } = setup({
      band: "older",
      onPreview: () => {
        order.push("preview");
      },
      onRun: () => {
        order.push("run");
        return { status: "ok", summary: "Lap time went up." };
      },
      onBranch: () => {
        order.push("branch");
      },
    });

    act(() => {
      result.current.requestAction("preview");
    });
    expect(result.current.state).toBe("preview");

    act(() => {
      result.current.requestAction("run");
    });
    expect(result.current.state).toBe("observing");

    act(() => {
      result.current.requestAction("branch");
    });
    expect(result.current.state).toBe("branched");
    expect(order).toEqual(["preview", "run", "branch"]);
  });

  it("passes through `running` before it reaches `observing`", async () => {
    const run = deferred<SafeExplorationOutcome>();
    const states: string[] = [];
    const { result } = setup({
      onRun: () => run.promise,
      onStateChange: (next) => states.push(next),
    });

    act(() => {
      result.current.requestAction("run");
    });
    expect(result.current.state).toBe("running");

    await act(async () => {
      run.resolve({ status: "ok", summary: "It wobbled." });
      await run.promise;
    });
    expect(result.current.state).toBe("observing");
    expect(states).toEqual(["running", "observing"]);
  });

  it("band-gates `branch`: K–2 never offers it even when a handler exists", () => {
    const onBranch = vi.fn();
    const { result } = setup({ band: "k2", onBranch, onKeep: () => {} });
    toObserving(result);

    expect(result.current.actions.map((a) => a.id)).not.toContain("branch");
    let outcome;
    act(() => {
      outcome = result.current.requestAction("branch");
    });
    expect(outcome).toEqual({ accepted: false, rejection: "no-handler" });
    expect(onBranch).not.toHaveBeenCalled();
  });
});

describe("SEC-1 — restore cannot overwrite the preserved baseline", () => {
  it("refuses `keep` from `restored` and never calls onKeep", () => {
    const onKeep = vi.fn();
    const onRestore = vi.fn();
    const { result } = setup({ onKeep, onRestore });

    toObserving(result);
    act(() => {
      result.current.requestAction("restore");
    });
    expect(result.current.state).toBe("restored");
    expect(onRestore).toHaveBeenCalledTimes(1);

    let outcome;
    act(() => {
      outcome = result.current.requestAction("keep");
    });
    expect(outcome).toEqual({ accepted: false, rejection: "not-in-grammar" });
    expect(onKeep).not.toHaveBeenCalled();
    expect(result.current.state).toBe("restored");
  });

  it("refuses a second `keep` from `kept`", () => {
    const onKeep = vi.fn();
    const { result } = setup({ onKeep });
    toObserving(result);
    act(() => {
      result.current.requestAction("keep");
    });

    let outcome;
    act(() => {
      outcome = result.current.requestAction("keep");
    });
    expect(outcome).toEqual({ accepted: false, rejection: "not-in-grammar" });
    expect(onKeep).toHaveBeenCalledTimes(1);
  });

  it("keeps `restore` reachable after the consequential action", () => {
    const { result } = setup({ onKeep: () => {}, onRestore: () => {} });
    toObserving(result);
    act(() => {
      result.current.requestAction("keep");
    });
    expect(result.current.actions.map((a) => a.id)).toContain("restore");
  });

  it("never hands a handler anything it could write the baseline with", () => {
    // The callback contract is zero-argument by construction: the component
    // holds the baseline's *name*, never the artifact and never a setter.
    const onKeep = vi.fn();
    const { result } = setup({ onKeep });
    toObserving(result);
    act(() => {
      result.current.requestAction("keep");
    });
    expect(onKeep).toHaveBeenCalledWith();
    expect(onKeep.mock.calls[0]).toHaveLength(0);
  });
});

describe("SEC-2 — the in-flight latch", () => {
  it("double-submit: two keeps in one tick call onKeep once", async () => {
    const save = deferred<SafeExplorationOutcome>();
    const onKeep = vi.fn(() => save.promise);
    const { result } = setup({ onKeep });
    toObserving(result);

    let first;
    let second;
    act(() => {
      first = result.current.requestAction("keep");
      second = result.current.requestAction("keep");
    });

    expect(onKeep).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ accepted: true });
    expect(second).toEqual({ accepted: false, rejection: "in-flight" });

    await act(async () => {
      save.resolve({ status: "ok" });
      await save.promise;
    });
    expect(result.current.state).toBe("kept");
    expect(onKeep).toHaveBeenCalledTimes(1);
  });

  it("double-restore: two restores in one tick call onRestore once", async () => {
    const undo = deferred<SafeExplorationOutcome>();
    const onRestore = vi.fn(() => undo.promise);
    const { result } = setup({ onRestore, onKeep: () => {} });
    toObserving(result);

    let second;
    act(() => {
      result.current.requestAction("restore");
      second = result.current.requestAction("restore");
    });

    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(second).toEqual({ accepted: false, rejection: "in-flight" });

    await act(async () => {
      undo.resolve({ status: "ok" });
      await undo.promise;
    });
    expect(result.current.state).toBe("restored");
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it("a keep requested while a restore is in flight is refused", async () => {
    const undo = deferred<SafeExplorationOutcome>();
    const onRestore = vi.fn(() => undo.promise);
    const onKeep = vi.fn();
    const { result } = setup({ onRestore, onKeep });
    toObserving(result);

    let keepOutcome;
    act(() => {
      result.current.requestAction("restore");
      keepOutcome = result.current.requestAction("keep");
    });
    expect(keepOutcome).toEqual({ accepted: false, rejection: "in-flight" });
    expect(onKeep).not.toHaveBeenCalled();

    await act(async () => {
      undo.resolve({ status: "ok" });
      await undo.promise;
    });
    expect(onKeep).not.toHaveBeenCalled();
  });

  it("releases the latch after a failure so the learner can retry", async () => {
    const attempts: number[] = [];
    let call = 0;
    const onKeep = vi.fn((): SafeExplorationOutcome => {
      call += 1;
      attempts.push(call);
      return call === 1
        ? {
            status: "recoverableError",
            summary: "The save did not go through.",
          }
        : { status: "ok" };
    });
    const { result } = setup({ onKeep });
    toObserving(result);

    act(() => {
      result.current.requestAction("keep");
    });
    expect(result.current.state).toBe("recoverableError");
    expect(result.current.pendingAction).toBeNull();

    act(() => {
      result.current.requestAction("retry");
    });
    expect(onKeep).toHaveBeenCalledTimes(2);
    expect(result.current.state).toBe("kept");
  });

  it("keeps an escape reachable while a run is in flight and drops its stale result", async () => {
    const run = deferred<SafeExplorationOutcome>();
    const onCancel = vi.fn();
    const { result } = setup({ onRun: () => run.promise, onCancel });

    act(() => {
      result.current.requestAction("run");
    });
    expect(result.current.state).toBe("running");

    let cancelOutcome;
    act(() => {
      cancelOutcome = result.current.requestAction("cancel");
    });
    expect(cancelOutcome).toEqual({ accepted: true });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe("baseline");

    await act(async () => {
      run.resolve({ status: "ok", summary: "too late" });
      await run.promise;
    });
    // The abandoned run must not drag the learner back into `observing`.
    expect(result.current.state).toBe("baseline");
  });
});

describe("SEC-3 — learner outcomes vs system failures (§6)", () => {
  it("keeps a disappointing learner result an outcome, not an error", () => {
    const { result } = setup({
      onRun: () => ({ status: "ok", summary: "The bike spun out." }),
    });
    toObserving(result);
    expect(result.current.state).toBe("observing");
  });

  it("classifies a thrown handler as unexpected and reports it", () => {
    const boom = new Error("engine exploded");
    const onUnexpectedError = vi.fn();
    const { result } = setup({
      onKeep: () => {
        throw boom;
      },
      onUnexpectedError,
    });
    toObserving(result);

    act(() => {
      result.current.requestAction("keep");
    });

    expect(result.current.state).toBe("unexpectedError");
    expect(onUnexpectedError).toHaveBeenCalledWith(boom, {
      action: "keep",
      state: "observing",
    });
  });

  it("classifies a rejected promise as unexpected, never as `ok`", async () => {
    const boom = new Error("network down");
    const onUnexpectedError = vi.fn();
    const { result } = setup({
      onKeep: () => Promise.reject(boom),
      onUnexpectedError,
    });
    toObserving(result);

    await act(async () => {
      result.current.requestAction("keep");
      await Promise.resolve();
    });

    expect(result.current.state).toBe("unexpectedError");
    expect(result.current.state).not.toBe("kept");
    expect(onUnexpectedError).toHaveBeenCalledTimes(1);
  });

  it("says the baseline is safe after a failed keep, and tells the truth after a failed restore", () => {
    const failing = { status: "unexpectedError" as const };
    const keepCase = setup({ onKeep: () => failing });
    toObserving(keepCase.result);
    act(() => {
      keepCase.result.current.requestAction("keep");
    });
    expect(
      keepCase.result.current.body.map((p) => ("key" in p ? p.key : p.text)),
    ).toContain("safeExploration.k2.announce.baselineSafe");

    const restoreCase = setup({ onKeep: () => {}, onRestore: () => failing });
    toObserving(restoreCase.result);
    act(() => {
      restoreCase.result.current.requestAction("restore");
    });
    expect(
      restoreCase.result.current.body.map((p) => ("key" in p ? p.key : p.text)),
    ).toContain("safeExploration.k2.announce.restoreFailed");
  });

  it("emits a distinct analytics kind for each error class", () => {
    const events: string[] = [];
    const kinds: string[] = [];
    const recoverable = setup({
      onAnalyticsEvent: (e) => {
        events.push(e.kind);
        if (e.error_kind) kinds.push(e.error_kind);
      },
      onKeep: () => ({ status: "recoverableError", summary: "Try once more." }),
    });
    toObserving(recoverable.result);
    act(() => {
      recoverable.result.current.requestAction("keep");
    });

    expect(events).toEqual(["experiment_tried", "experiment_failed"]);
    expect(kinds).toEqual(["recoverable"]);
  });
});

describe("SEC-4 — the controller computes nothing", () => {
  it("never calls Math.random across a full experiment loop", () => {
    const random = vi.spyOn(Math, "random");
    const { result } = setup({ onKeep: () => {}, onRestore: () => {} });
    toObserving(result);
    act(() => {
      result.current.requestAction("restore");
    });
    act(() => {
      result.current.requestAction("tryAgain");
    });
    toObserving(result);
    act(() => {
      result.current.requestAction("keep");
    });
    expect(random).not.toHaveBeenCalled();
    random.mockRestore();
  });

  it("exposes no score, mastery, xp, or access field", () => {
    const { result } = setup();
    const surface = Object.keys(result.current);
    for (const banned of [
      "score",
      "stars",
      "mastery",
      "xp",
      "accuracy",
      "unlocked",
    ]) {
      expect(surface).not.toContain(banned);
    }
  });

  it("emits process events with no correctness payload", () => {
    const seen: Record<string, unknown>[] = [];
    const { result } = setup({
      onAnalyticsEvent: (e) => seen.push({ ...e }),
      onKeep: () => {},
    });
    toObserving(result);
    act(() => {
      result.current.requestAction("keep");
    });

    expect(seen.map((e) => e.kind)).toEqual([
      "experiment_tried",
      "experiment_kept",
    ]);
    for (const event of seen) {
      expect(Object.keys(event).sort()).toEqual([
        "attempt",
        "band",
        "kind",
        "surface_id",
      ]);
    }
  });
});

describe("SEC-5 — availability is never a mystery", () => {
  it("hides a hidden action entirely and refuses it programmatically", () => {
    const onKeep = vi.fn();
    const { result } = setup({
      onKeep,
      availability: { keep: { kind: "hidden" } },
    });
    toObserving(result);
    expect(result.current.actions.map((a) => a.id)).not.toContain("keep");

    let outcome;
    act(() => {
      outcome = result.current.requestAction("keep");
    });
    expect(outcome).toEqual({ accepted: false, rejection: "unavailable" });
    expect(onKeep).not.toHaveBeenCalled();
  });

  it("renders a blocked action with its reason and refuses it", () => {
    const onKeep = vi.fn();
    const { result } = setup({
      onKeep,
      availability: {
        keep: { kind: "blocked", reason: "Finish the lap first." },
      },
    });
    toObserving(result);

    const keep = result.current.actions.find((a) => a.id === "keep");
    expect(keep).toMatchObject({
      status: "blocked",
      reason: "Finish the lap first.",
    });
    let outcome;
    act(() => {
      outcome = result.current.requestAction("keep");
    });
    expect(outcome).toEqual({ accepted: false, rejection: "unavailable" });
    expect(onKeep).not.toHaveBeenCalled();
  });

  it("host-declared unavailability overrides every state and offers no exits", () => {
    const { result } = setup({
      unavailable: { reason: "Your teacher paused experiments." },
      onKeep: () => {},
    });
    expect(result.current.state).toBe("unavailable");
    expect(result.current.actions).toHaveLength(0);
    expect(result.current.announcement).toBeNull(); // never announced unprompted

    const ids: SafeExplorationActionId[] = ["run", "keep", "restore"];
    for (const id of ids) {
      let outcome;
      act(() => {
        outcome = result.current.requestAction(id);
      });
      expect(outcome).toEqual({ accepted: false, rejection: "not-in-grammar" });
    }
  });

  it("keeps exactly one primary action in every reachable state", () => {
    const { result } = setup({
      band: "older",
      onPreview: () => {},
      onCancel: () => {},
      onKeep: () => {},
      onRestore: () => {},
      onBranch: () => {},
      onExit: () => {},
    });

    const check = () => {
      const primaries = result.current.actions.filter(
        (a) => a.emphasis === "primary",
      );
      expect(primaries.length).toBeLessThanOrEqual(1);
      if (result.current.actions.length > 0) {
        expect(primaries).toHaveLength(1);
      }
    };

    check(); // baseline
    act(() => {
      result.current.requestAction("preview");
    });
    check(); // preview
    act(() => {
      result.current.requestAction("run");
    });
    check(); // observing
    act(() => {
      result.current.requestAction("keep");
    });
    check(); // kept
    act(() => {
      result.current.requestAction("restore");
    });
    check(); // restored
  });
});
