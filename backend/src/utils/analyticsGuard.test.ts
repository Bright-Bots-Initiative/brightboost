/* @vitest-environment node */
import { describe, expect, it } from "vitest";
import { decideAnalytics, describeAnalyticsDecision } from "./analyticsGuard";

const KEY = "phc_test_key_not_real";
const VARS = { key: "POSTHOG_KEY", keyEnv: "POSTHOG_KEY_ENV" };

describe("decideAnalytics (BRAND_R0 environment guard)", () => {
  // Two-phase: healthy rows first, then every refusal row.
  it("healthy production: key + no label → enabled (today's prod shape)", () => {
    expect(
      decideAnalytics({ envName: "production", key: KEY, keyEnv: undefined }),
    ).toEqual({ status: "enabled", reason: "production-key" });
  });

  it("healthy production: key + label production → enabled", () => {
    expect(
      decideAnalytics({
        envName: "production",
        key: KEY,
        keyEnv: "production",
      }),
    ).toEqual({ status: "enabled", reason: "production-key" });
  });

  it("healthy staging: key + label staging → enabled", () => {
    expect(
      decideAnalytics({ envName: "staging", key: KEY, keyEnv: "staging" }),
    ).toEqual({ status: "enabled", reason: "nonproduction-key" });
  });

  it("no key anywhere → disabled (silent no-op preserved)", () => {
    expect(
      decideAnalytics({
        envName: "production",
        key: undefined,
        keyEnv: "production",
      }),
    ).toEqual({ status: "disabled", reason: "no-key" });
    expect(
      decideAnalytics({ envName: "staging", key: "  ", keyEnv: undefined }),
    ).toEqual({ status: "disabled", reason: "no-key" });
  });

  it("staging configured with production analytics (label production) → refused", () => {
    const d = decideAnalytics({
      envName: "staging",
      key: KEY,
      keyEnv: "production",
    });
    expect(d).toEqual({
      status: "refused",
      reason: "production-key-outside-production",
    });
    expect(describeAnalyticsDecision(d, VARS, "staging")).toContain("REFUSED");
    expect(describeAnalyticsDecision(d, VARS, "staging")).toContain(
      "POSTHOG_KEY_ENV=staging",
    );
  });

  it("staging with an unlabeled key (copied variables) → refused, fail closed", () => {
    const d = decideAnalytics({
      envName: "staging",
      key: KEY,
      keyEnv: undefined,
    });
    expect(d).toEqual({ status: "refused", reason: "unlabeled-nonproduction" });
    expect(describeAnalyticsDecision(d, VARS, "staging")).toContain(
      "no POSTHOG_KEY_ENV",
    );
  });

  it("production configured with a staging-labeled key → refused", () => {
    const d = decideAnalytics({
      envName: "production",
      key: KEY,
      keyEnv: "staging",
    });
    expect(d).toEqual({
      status: "refused",
      reason: "nonproduction-key-in-production",
    });
    expect(describeAnalyticsDecision(d, VARS, "production")).toContain(
      "REFUSED",
    );
  });

  it("preview and development follow the non-production rows", () => {
    expect(
      decideAnalytics({ envName: "preview", key: KEY, keyEnv: "preview" })
        .status,
    ).toBe("enabled");
    expect(
      decideAnalytics({ envName: "development", key: KEY, keyEnv: undefined })
        .status,
    ).toBe("refused");
  });

  it("labels are case- and whitespace-insensitive", () => {
    expect(
      decideAnalytics({
        envName: "Production",
        key: KEY,
        keyEnv: " PRODUCTION ",
      }).status,
    ).toBe("enabled");
    expect(
      decideAnalytics({ envName: "staging", key: KEY, keyEnv: "Production" })
        .status,
    ).toBe("refused");
  });
});
