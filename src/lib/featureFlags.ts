/**
 * Typed feature-flag adapter over PostHog (BRAND_R0 foundation, #641).
 *
 * Contract:
 *   - Every flag the code reads is REGISTERED here with an owner, an owning
 *     issue, an expiry date, the variants the code can render, and a fallback.
 *     `FlagKey` is derived from the registry, so an unregistered key does not
 *     compile. The registry test fails once a flag is past its expiry.
 *   - The fallback wins whenever PostHog is disabled/refused (see
 *     `analyticsGuard`), flags have not loaded yet, the flag is unset, or the
 *     value is one the code is not prepared to render. Loading is a state, not
 *     a variant: callers render the fallback (or nothing) while `loading`.
 *   - Reading a flag sends NO exposure event (`send_event: false`). Call
 *     `recordFlagExposure()` at the moment the variant is actually rendered —
 *     that is what makes PostHog experiment analysis honest.
 *   - PostHog owns assignment for anonymous/public experiments; the database
 *     `Experiment*` tables are reserved for logged-in, server-authoritative
 *     experiments. Never assign the same experiment on both. See
 *     `docs/experiments.md`.
 */
import { useEffect, useState } from "react";
import posthog from "posthog-js";
import {
  getAnalyticsDecision,
  isAnalyticsReady,
  trackEvent,
} from "./analytics";

export interface FlagDefinition<V extends string = string> {
  /** PostHog flag key — must match the key in the PostHog project exactly. */
  key: string;
  /** Who removes the flag (GitHub handle or team). */
  owner: string;
  /** Issue that owns the flag's lifecycle, e.g. "#641". */
  issue: string;
  /** ISO date (YYYY-MM-DD). After this date the registry test fails until the flag is cleaned up or the date is deliberately extended. */
  expires: string;
  /** Returned when PostHog is unavailable, loading, unset, or returns an unknown value. */
  fallback: V;
  /** Every value the code is prepared to render; anything else → fallback. */
  variants: readonly V[];
  /** One line: what the flag guards. */
  purpose: string;
}

export type FlagRegistry = Record<string, FlagDefinition>;

/**
 * Registered flags. Empty on purpose: BRAND_R0 ships the adapter, not a flag.
 * The first real entry lands with the ticket that owns it (#641 for the /try
 * variant-games experiment) and must name owner, issue, and expiry.
 */
export const FLAG_REGISTRY = {} as const satisfies FlagRegistry;

export type FlagKey = keyof typeof FLAG_REGISTRY;

export type FlagSource = "posthog" | "fallback";

export type FlagReason =
  | "loaded"
  | "loading"
  | "analytics-disabled"
  | "flag-unset"
  | "unknown-value";

export interface FlagState<V extends string> {
  value: V;
  loading: boolean;
  source: FlagSource;
  reason: FlagReason;
}

/** Normalise PostHog's `true | false | string | undefined` into a variant name. */
export function normalizeFlagValue(raw: unknown): string | undefined {
  if (raw === true) return "on";
  if (raw === false) return "off";
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed ? trimmed : undefined;
  }
  return undefined;
}

/**
 * Pure resolver — the whole safe-default policy lives here so it can be
 * tested without PostHog.
 */
export function resolveFlagValue<V extends string>(
  def: FlagDefinition<V>,
  raw: unknown,
  flagsLoaded: boolean,
  analyticsEnabled: boolean,
): FlagState<V> {
  if (!analyticsEnabled) {
    return {
      value: def.fallback,
      loading: false,
      source: "fallback",
      reason: "analytics-disabled",
    };
  }
  if (!flagsLoaded) {
    return {
      value: def.fallback,
      loading: true,
      source: "fallback",
      reason: "loading",
    };
  }
  const normalized = normalizeFlagValue(raw);
  if (normalized === undefined) {
    return {
      value: def.fallback,
      loading: false,
      source: "fallback",
      reason: "flag-unset",
    };
  }
  if ((def.variants as readonly string[]).includes(normalized)) {
    return {
      value: normalized as V,
      loading: false,
      source: "posthog",
      reason: "loaded",
    };
  }
  return {
    value: def.fallback,
    loading: false,
    source: "fallback",
    reason: "unknown-value",
  };
}

function parseIsoDate(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return Number.NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Registry hygiene: every flag well-formed, none expired. Throws with the offending keys. */
export function assertRegistryFresh(
  registry: FlagRegistry,
  now: Date = new Date(),
): void {
  const problems: string[] = [];
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  for (const [name, def] of Object.entries(registry)) {
    if (!def.owner.trim()) problems.push(`${name}: missing owner`);
    if (!/^#\d+$/.test(def.issue))
      problems.push(`${name}: issue must look like #123`);
    const expires = parseIsoDate(def.expires);
    if (Number.isNaN(expires))
      problems.push(`${name}: expires must be YYYY-MM-DD`);
    else if (expires < today)
      problems.push(
        `${name}: expired on ${def.expires} (owner ${def.owner}, ${def.issue}) — remove the flag or extend deliberately`,
      );
    if (!def.variants.includes(def.fallback))
      problems.push(
        `${name}: fallback "${def.fallback}" is not one of its variants`,
      );
    if (def.variants.length === 0) problems.push(`${name}: no variants`);
  }
  if (problems.length) {
    throw new Error(
      `Feature-flag registry is not clean:\n  ${problems.join("\n  ")}`,
    );
  }
}

/**
 * React hook for a registered flag definition. Safe by construction: returns
 * the fallback until PostHog reports flags, and forever when analytics is
 * disabled or refused for this environment.
 */
export function useRegisteredFlag<V extends string>(
  def: FlagDefinition<V>,
): FlagState<V> {
  const analyticsStatus = getAnalyticsDecision().status;
  // `enabled-unlabeled` is production's bootstrap-compatibility state (key
  // without a label); flags still load there. Anything else falls back.
  const analyticsEnabled =
    analyticsStatus === "enabled" || analyticsStatus === "enabled-unlabeled";
  const [state, setState] = useState<FlagState<V>>(() =>
    resolveFlagValue(def, undefined, false, analyticsEnabled),
  );

  useEffect(() => {
    if (!analyticsEnabled) {
      setState(resolveFlagValue(def, undefined, false, false));
      return;
    }
    let cancelled = false;
    const read = () => {
      if (cancelled) return;
      const raw = isAnalyticsReady()
        ? posthog.getFeatureFlag(def.key, { send_event: false })
        : undefined;
      setState(resolveFlagValue(def, raw, isAnalyticsReady(), true));
    };
    read();
    // Fires once flags are (re)loaded; posthog-js calls it immediately if already loaded.
    posthog.onFeatureFlags(read);
    return () => {
      cancelled = true;
    };
  }, [def, analyticsEnabled]);

  return state;
}

/** Hook keyed by registry name. Uncallable until the registry has an entry — intended. */
export function useFeatureFlag<K extends FlagKey>(key: K) {
  return useRegisteredFlag(FLAG_REGISTRY[key] as FlagDefinition);
}

/**
 * Record an exposure ONLY when the variant is rendered to the user. Uses
 * PostHog's standard exposure event so experiments attribute correctly.
 */
export function recordFlagExposure(key: string, value: string): void {
  trackEvent("$feature_flag_called", {
    $feature_flag: key,
    $feature_flag_response: value,
  });
}
