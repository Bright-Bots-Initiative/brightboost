import { describe, expect, it } from "vitest";
import {
  CLIENT_GUARD_VARS,
  decideAnalytics,
  describeAnalyticsDecision,
} from "../analyticsGuard";

const KEY = "phc_test_key_not_real";

describe("analyticsGuard (browser re-export of shared/deploy-env)", () => {
  it("names VITE_POSTHOG_KEY / VITE_POSTHOG_KEY_ENV in operator messages", () => {
    const d = decideAnalytics({
      env: { name: "staging", mismatch: "none" },
      key: KEY,
      keyEnv: "production",
    });
    expect(d).toEqual({
      status: "refused",
      reason: "production-key-outside-production",
    });
    expect(
      describeAnalyticsDecision(d, CLIENT_GUARD_VARS, "staging"),
    ).toContain("VITE_POSTHOG_KEY_ENV=staging");
  });

  it("exact label matching: staging+preview label and preview+staging label are refused", () => {
    expect(
      decideAnalytics({
        env: { name: "staging", mismatch: "none" },
        key: KEY,
        keyEnv: "preview",
      }).reason,
    ).toBe("environment-key-mismatch");
    expect(
      decideAnalytics({
        env: { name: "preview", mismatch: "none" },
        key: KEY,
        keyEnv: "staging",
      }).reason,
    ).toBe("environment-key-mismatch");
  });

  it("a classifier mismatch refuses analytics regardless of label", () => {
    expect(
      decideAnalytics({
        env: { name: "preview", mismatch: "declared-vs-railway" },
        key: KEY,
        keyEnv: "preview",
      }),
    ).toEqual({ status: "refused", reason: "environment-mismatch" });
  });
});
