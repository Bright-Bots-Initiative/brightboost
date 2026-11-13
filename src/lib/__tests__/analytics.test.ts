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
