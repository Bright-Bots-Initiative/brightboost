import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const analyticsMock = vi.hoisted(() => ({
  decision: { status: "enabled" as "enabled" | "disabled" | "refused" },
  ready: true,
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  getAnalyticsDecision: () => analyticsMock.decision,
  isAnalyticsReady: () => analyticsMock.ready,
  trackEvent: analyticsMock.trackEvent,
}));

const posthogMock = vi.hoisted(() => ({
  flagValue: undefined as unknown,
  listeners: [] as Array<() => void>,
  getFeatureFlag: vi.fn(),
  onFeatureFlags: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: {
    getFeatureFlag: (key: string, opts: unknown) => {
      posthogMock.getFeatureFlag(key, opts);
      return posthogMock.flagValue;
    },
    onFeatureFlags: (cb: () => void) => {
      posthogMock.onFeatureFlags(cb);
      posthogMock.listeners.push(cb);
    },
  },
}));

import {
  FLAG_REGISTRY,
  assertRegistryFresh,
  normalizeFlagValue,
  recordFlagExposure,
  resolveFlagValue,
  useRegisteredFlag,
  type FlagDefinition,
} from "../featureFlags";

const demoGame: FlagDefinition<"control" | "variant"> = {
  key: "try-demo-game",
  owner: "@example-owner",
  issue: "#641",
  expires: "2999-12-31",
  fallback: "control",
  variants: ["control", "variant"],
  purpose: "Which game the /try demo serves (test fixture, not a real flag).",
};

describe("resolveFlagValue — safe defaults", () => {
  it("healthy: loaded known variant comes from posthog", () => {
    expect(resolveFlagValue(demoGame, "variant", true, true)).toEqual({
      value: "variant",
      loading: false,
      source: "posthog",
      reason: "loaded",
    });
  });

  it("analytics disabled/refused → fallback, never loading", () => {
    expect(resolveFlagValue(demoGame, "variant", true, false)).toMatchObject({
      value: "control",
      loading: false,
      reason: "analytics-disabled",
    });
  });

  it("flags not loaded yet → fallback with loading=true", () => {
    expect(resolveFlagValue(demoGame, undefined, false, true)).toMatchObject({
      value: "control",
      loading: true,
      reason: "loading",
    });
  });

  it("unset flag → fallback", () => {
    expect(resolveFlagValue(demoGame, undefined, true, true)).toMatchObject({
      value: "control",
      reason: "flag-unset",
    });
    expect(resolveFlagValue(demoGame, false, true, true)).toMatchObject({
      value: "control",
      reason: "unknown-value",
    });
  });

  it("a value the code cannot render → fallback, not a crash", () => {
    expect(resolveFlagValue(demoGame, "variant-c", true, true)).toMatchObject({
      value: "control",
      reason: "unknown-value",
    });
  });

  it("normalizes booleans to on/off and trims strings", () => {
    expect(normalizeFlagValue(true)).toBe("on");
    expect(normalizeFlagValue(false)).toBe("off");
    expect(normalizeFlagValue("  b ")).toBe("b");
    expect(normalizeFlagValue("")).toBeUndefined();
    expect(normalizeFlagValue(null)).toBeUndefined();
  });
});

describe("assertRegistryFresh — ownership and expiry", () => {
  it("the committed registry is clean today", () => {
    expect(() => assertRegistryFresh(FLAG_REGISTRY)).not.toThrow();
  });

  it("an expired flag fails the registry naming owner and issue", () => {
    const registry = { demoGame: { ...demoGame, expires: "2026-01-01" } };
    expect(() =>
      assertRegistryFresh(registry, new Date("2026-09-02T00:00:00Z")),
    ).toThrow(/demoGame: expired on 2026-01-01 \(owner @example-owner, #641\)/);
  });

  it("a flag expiring today is still valid; tomorrow's date is not expired", () => {
    const registry = { demoGame: { ...demoGame, expires: "2026-09-02" } };
    expect(() =>
      assertRegistryFresh(registry, new Date("2026-09-02T23:59:59Z")),
    ).not.toThrow();
    expect(() =>
      assertRegistryFresh(registry, new Date("2026-09-03T00:00:00Z")),
    ).toThrow(/expired/);
  });

  it("rejects malformed entries", () => {
    expect(() =>
      assertRegistryFresh({
        bad: {
          ...demoGame,
          owner: " ",
          issue: "641",
          expires: "soon",
          fallback: "nope" as never,
        },
      }),
    ).toThrow(
      /missing owner[\s\S]*issue must look like[\s\S]*expires must be[\s\S]*not one of its variants/,
    );
  });
});

describe("useRegisteredFlag — hook behaviour", () => {
  it("returns the fallback and never touches posthog when analytics is disabled", () => {
    analyticsMock.decision = { status: "disabled" };
    posthogMock.getFeatureFlag.mockClear();
    const { result } = renderHook(() => useRegisteredFlag(demoGame));
    expect(result.current).toMatchObject({
      value: "control",
      loading: false,
      reason: "analytics-disabled",
    });
    expect(posthogMock.getFeatureFlag).not.toHaveBeenCalled();
  });

  it("reads the flag without sending an exposure event, then updates when flags load", () => {
    analyticsMock.decision = { status: "enabled" };
    analyticsMock.ready = false;
    posthogMock.flagValue = "variant";
    posthogMock.listeners.length = 0;
    posthogMock.getFeatureFlag.mockClear();

    const { result } = renderHook(() => useRegisteredFlag(demoGame));
    expect(result.current).toMatchObject({
      value: "control",
      loading: true,
      reason: "loading",
    });

    analyticsMock.ready = true;
    act(() => {
      for (const cb of posthogMock.listeners) cb();
    });
    expect(result.current).toMatchObject({
      value: "variant",
      loading: false,
      source: "posthog",
    });
    expect(posthogMock.getFeatureFlag).toHaveBeenCalledWith("try-demo-game", {
      send_event: false,
    });
  });
});

describe("recordFlagExposure", () => {
  it("emits PostHog's standard exposure event only when called", () => {
    analyticsMock.trackEvent.mockClear();
    recordFlagExposure("try-demo-game", "variant");
    expect(analyticsMock.trackEvent).toHaveBeenCalledWith(
      "$feature_flag_called",
      {
        $feature_flag: "try-demo-game",
        $feature_flag_response: "variant",
      },
    );
  });
});
