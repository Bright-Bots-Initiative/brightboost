import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  init: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  capture: vi.fn(),
  startSessionRecording: vi.fn(),
  stopSessionRecording: vi.fn(),
}));

vi.mock("posthog-js", () => ({ default: sdk }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  // Noncredential marker: the mocked SDK never makes a network request.
  vi.stubEnv("VITE_POSTHOG_KEY", "unit-test-only");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function initialize(host?: string) {
  vi.stubEnv("VITE_POSTHOG_HOST", host);
  const analytics = await import("../analytics");
  analytics.initAnalytics();
  return analytics;
}

describe("analytics ingestion host", () => {
  it("accepts a valid HTTPS origin", async () => {
    await initialize("https://eu.i.posthog.com");
    expect(sdk.init.mock.calls[0][1].api_host).toBe("https://eu.i.posthog.com");
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith(
      "[analytics] Initializing PostHog → https://eu.i.posthog.com",
    );
  });

  it("uses the default without warning when unset", async () => {
    await initialize();
    expect(sdk.init.mock.calls[0][1].api_host).toBe("https://us.i.posthog.com");
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("normalizes an origin's trailing slash", async () => {
    await initialize("https://eu.i.posthog.com/");
    expect(sdk.init.mock.calls[0][1].api_host).toBe("https://eu.i.posthog.com");
    expect(console.warn).not.toHaveBeenCalled();
  });

  it.each([
    ["dashboard link", "https://us.posthog.com/dashboard"],
    ["HTTP", "http://analytics.example.invalid"],
    ["query", "https://analytics.example.invalid/?context=private"],
    ["hash", "https://analytics.example.invalid/#private"],
    ["empty query", "https://analytics.example.invalid?"],
    ["empty hash", "https://analytics.example.invalid#"],
    ["normalized path", "https://analytics.example.invalid/hidden/.."],
    ["user info", "https://visitor@analytics.example.invalid"],
    ["malformed URL", "not-an-origin"],
  ])(
    "rejects %s without exposing the supplied value",
    async (_label, value) => {
      const analytics = await initialize(value);
      analytics.initAnalytics();
      expect(sdk.init.mock.calls[0][1].api_host).toBe(
        "https://us.i.posthog.com",
      );
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(
        "[analytics] Invalid VITE_POSTHOG_HOST; using the default ingestion host.",
      );
      expect(console.info).toHaveBeenCalledWith(
        "[analytics] Initializing PostHog → https://us.i.posthog.com",
      );
      expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(
        value,
      );
      expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(
        value,
      );
      expect(sdk.init).toHaveBeenCalledTimes(1);
    },
  );
});

function finishLoading() {
  sdk.init.mock.calls[0][1].loaded();
}

describe("analytics recording policy", () => {
  it("keeps anonymous recording, heatmaps, console capture, dead clicks and surveys off", async () => {
    await initialize();
    expect(sdk.init.mock.calls[0][1]).toMatchObject({
      disable_session_recording: true,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      disable_surveys: true,
      enable_recording_console_log: false,
      session_recording: { maskAllInputs: true, maskTextSelector: "*" },
    });
    finishLoading();
    expect(sdk.startSessionRecording).not.toHaveBeenCalled();
  });

  it.each(["student", "parent"] as const)(
    "does not record a %s",
    async (role) => {
      const analytics = await initialize();
      finishLoading();
      analytics.identifyUser("fixture-user", role, { role: "admin" });
      expect(sdk.identify).toHaveBeenCalledWith("fixture-user", { role });
      expect(sdk.stopSessionRecording).toHaveBeenCalledTimes(1);
      expect(sdk.startSessionRecording).not.toHaveBeenCalled();
    },
  );

  it.each(["teacher", "admin"] as const)(
    "starts only after identifying a %s",
    async (role) => {
      const analytics = await initialize();
      finishLoading();
      expect(sdk.startSessionRecording).not.toHaveBeenCalled();
      analytics.identifyUser("fixture-user", role);
      expect(sdk.identify).toHaveBeenCalledWith("fixture-user", { role });
      expect(sdk.startSessionRecording).toHaveBeenCalledTimes(1);
      expect(sdk.identify.mock.invocationCallOrder[0]).toBeLessThan(
        sdk.startSessionRecording.mock.invocationCallOrder[0],
      );
    },
  );

  it("stops a teacher recording before identifying a student", async () => {
    const analytics = await initialize();
    finishLoading();
    analytics.identifyUser("fixture-teacher", "teacher");
    analytics.identifyUser("fixture-student", "student");
    expect(sdk.startSessionRecording).toHaveBeenCalledTimes(1);
    expect(sdk.stopSessionRecording).toHaveBeenCalledTimes(1);
    expect(sdk.stopSessionRecording.mock.invocationCallOrder[0]).toBeLessThan(
      sdk.identify.mock.invocationCallOrder[1],
    );
  });

  it("stops recording before reset creates a new anonymous identity", async () => {
    const analytics = await initialize();
    finishLoading();
    analytics.identifyUser("fixture-teacher", "teacher");
    analytics.resetAnalytics();
    expect(sdk.reset).toHaveBeenCalledTimes(1);
    expect(sdk.stopSessionRecording).toHaveBeenCalledTimes(1);
    expect(sdk.stopSessionRecording.mock.invocationCallOrder[0]).toBeLessThan(
      sdk.reset.mock.invocationCallOrder[0],
    );
    analytics.track({ kind: "homepage_viewed" });
    expect(sdk.capture).toHaveBeenCalledWith("homepage_viewed", {});
    expect(sdk.startSessionRecording).toHaveBeenCalledTimes(1);
  });

  it("defers teacher identification and recording until the SDK has loaded", async () => {
    const analytics = await initialize();
    analytics.identifyUser("fixture-teacher", "teacher");
    expect(sdk.identify).not.toHaveBeenCalled();
    expect(sdk.startSessionRecording).not.toHaveBeenCalled();
    finishLoading();
    expect(sdk.identify).toHaveBeenCalledWith("fixture-teacher", {
      role: "teacher",
    });
    expect(sdk.startSessionRecording).toHaveBeenCalledTimes(1);
  });

  it("a reset during loading cancels queued recording and clears the persisted identity", async () => {
    const analytics = await initialize();
    analytics.identifyUser("fixture-teacher", "teacher");
    analytics.resetAnalytics();
    finishLoading();
    expect(sdk.identify).not.toHaveBeenCalled();
    expect(sdk.startSessionRecording).not.toHaveBeenCalled();
    expect(sdk.stopSessionRecording).toHaveBeenCalledTimes(1);
    expect(sdk.reset).toHaveBeenCalledTimes(1);
  });

  it("a later student identity replaces a queued teacher identity", async () => {
    const analytics = await initialize();
    analytics.identifyUser("fixture-teacher", "teacher");
    analytics.identifyUser("fixture-student", "student");
    finishLoading();
    expect(sdk.identify).toHaveBeenCalledExactlyOnceWith("fixture-student", {
      role: "student",
    });
    expect(sdk.startSessionRecording).not.toHaveBeenCalled();
  });

  it("retains the anonymous demo completion payload", async () => {
    const analytics = await initialize();
    finishLoading();
    analytics.track({
      kind: "demo_game_completed",
      game_id: "tank_trek",
      score: 9,
      stars: 3,
      time_spent_seconds: 42,
    });
    expect(sdk.capture).toHaveBeenCalledWith("demo_game_completed", {
      game_id: "tank_trek",
      score: 9,
      stars: 3,
      time_spent_seconds: 42,
    });
    expect(sdk.identify).not.toHaveBeenCalled();
    expect(sdk.startSessionRecording).not.toHaveBeenCalled();
  });

  it("stays inert without analytics configured", async () => {
    vi.stubEnv("VITE_POSTHOG_KEY", undefined);
    const analytics = await initialize();
    analytics.identifyUser("fixture-teacher", "teacher");
    analytics.resetAnalytics();
    analytics.track({ kind: "homepage_viewed" });
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.identify).not.toHaveBeenCalled();
    expect(sdk.startSessionRecording).not.toHaveBeenCalled();
    expect(sdk.reset).not.toHaveBeenCalled();
    expect(sdk.capture).not.toHaveBeenCalled();
  });
});
