import { describe, expect, it } from "vitest";
import { decideAnalytics, describeAnalyticsDecision } from "../analyticsGuard";

const KEY = "phc_test_key_not_real";
const VARS = { key: "VITE_POSTHOG_KEY", keyEnv: "VITE_POSTHOG_KEY_ENV" };

describe("decideAnalytics (browser mirror of the backend guard)", () => {
  it("healthy production with an unlabeled key stays enabled", () => {
    expect(
      decideAnalytics({ envName: "production", key: KEY, keyEnv: undefined }),
    ).toEqual({
      status: "enabled",
      reason: "production-key",
    });
  });

  it("healthy staging with a staging-labeled key is enabled", () => {
    expect(
      decideAnalytics({ envName: "staging", key: KEY, keyEnv: "staging" }),
    ).toEqual({
      status: "enabled",
      reason: "nonproduction-key",
    });
  });

  it("missing key is disabled, not refused", () => {
    expect(
      decideAnalytics({
        envName: "staging",
        key: undefined,
        keyEnv: undefined,
      }),
    ).toEqual({
      status: "disabled",
      reason: "no-key",
    });
  });

  it("staging with the production key is refused", () => {
    const d = decideAnalytics({
      envName: "staging",
      key: KEY,
      keyEnv: "production",
    });
    expect(d).toEqual({
      status: "refused",
      reason: "production-key-outside-production",
    });
    expect(describeAnalyticsDecision(d, VARS, "staging")).toContain(
      "VITE_POSTHOG_KEY_ENV=staging",
    );
  });

  it("staging with an unlabeled key is refused", () => {
    expect(
      decideAnalytics({ envName: "staging", key: KEY, keyEnv: undefined }),
    ).toEqual({
      status: "refused",
      reason: "unlabeled-nonproduction",
    });
  });

  it("production with a staging-labeled key is refused", () => {
    expect(
      decideAnalytics({ envName: "production", key: KEY, keyEnv: "staging" }),
    ).toEqual({
      status: "refused",
      reason: "nonproduction-key-in-production",
    });
  });
});
