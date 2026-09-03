/* @vitest-environment node */
/**
 * The guard rows are proven in shared/deploy-env/index.test.ts. This file
 * proves the backend re-export is the shared implementation and names the
 * backend variables in its messages.
 */
import { describe, expect, it } from "vitest";
import {
  decideAnalytics,
  describeAnalyticsDecision,
  SERVER_GUARD_VARS,
} from "./analyticsGuard";

const KEY = "phc_test_key_not_real";

describe("analyticsGuard (backend re-export)", () => {
  it("names POSTHOG_KEY / POSTHOG_KEY_ENV in operator messages", () => {
    const d = decideAnalytics({
      env: { name: "staging", mismatch: "none" },
      key: KEY,
      keyEnv: undefined,
    });
    expect(d).toEqual({ status: "refused", reason: "unlabeled-nonproduction" });
    const msg = describeAnalyticsDecision(d, SERVER_GUARD_VARS, "staging");
    expect(msg).toContain("POSTHOG_KEY_ENV=staging");
    expect(msg).not.toContain(KEY);
  });

  it("staging with the production key is refused; production with a staging label is refused", () => {
    expect(
      decideAnalytics({
        env: { name: "staging", mismatch: "none" },
        key: KEY,
        keyEnv: "production",
      }).reason,
    ).toBe("production-key-outside-production");
    expect(
      decideAnalytics({
        env: { name: "production", mismatch: "none" },
        key: KEY,
        keyEnv: "staging",
      }).reason,
    ).toBe("nonproduction-key-in-production");
  });
});
