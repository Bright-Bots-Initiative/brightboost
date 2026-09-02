/**
 * #838 — locale coverage for the Safe Exploration controls.
 *
 * Structural parity (en is the shape of record), a key for every state and
 * every action the grammar can render, interpolation-placeholder parity, and
 * the banded-copy rules from principle 9 / accessibility contract §8:
 * no technical words in K–2 child-facing strings, comparison/version language
 * allowed for older learners.
 */
import { describe, expect, it } from "vitest";

import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";
import vi from "@/locales/vi/common.json";
import zh from "@/locales/zh-CN/common.json";

import { SAFE_EXPLORATION_GRAMMAR } from "../types";

const LOCALES = { en, es, vi, "zh-CN": zh } as Record<
  string,
  Record<string, unknown>
>;
const BANDS = ["k2", "older"] as const;

const STATES = Object.keys(SAFE_EXPLORATION_GRAMMAR);
const ACTIONS = Array.from(
  new Set(Object.values(SAFE_EXPLORATION_GRAMMAR).flatMap((e) => e.actions)),
);
const ANNOUNCE = [
  "preview",
  "running",
  "observing",
  "observingPlain",
  "kept",
  "restored",
  "branched",
  "recoverableError",
  "unexpectedError",
  "baselineSafe",
  "restoreFailed",
];
const TOP = [
  "regionLabel",
  "actionsLabel",
  "baselinePrefix",
  "replaceNotice",
  "branchNotice",
];

function at(root: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      root,
    );
}

function flatten(value: unknown, prefix = "", out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(prefix);
    return out;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

function stringsFor(locale: string, band: string): string[] {
  const root = at(LOCALES[locale], `safeExploration.${band}`);
  return flatten(root).map((p) => String(at(root, p)));
}

const REQUIRED_PATHS = BANDS.flatMap((band) => [
  ...TOP.map((k) => `${band}.${k}`),
  `${band}.body.baseline`,
  ...STATES.map((s) => `${band}.headings.${s}`),
  ...ACTIONS.map((a) => `${band}.actions.${a}`),
  ...ANNOUNCE.map((a) => `${band}.announce.${a}`),
]);

describe("i18n — every rendered key exists in every locale", () => {
  it.each(Object.keys(LOCALES))("%s carries the full key set", (locale) => {
    const missing = REQUIRED_PATHS.filter(
      (path) =>
        typeof at(LOCALES[locale], `safeExploration.${path}`) !== "string",
    );
    expect(missing, `missing in ${locale}: ${missing.join(", ")}`).toEqual([]);
  });

  it("has no locale-only extras: es/vi/zh-CN mirror en exactly", () => {
    const enPaths = flatten(at(en, "safeExploration")).sort();
    for (const locale of ["es", "vi", "zh-CN"]) {
      const paths = flatten(at(LOCALES[locale], "safeExploration")).sort();
      expect(paths, `shape drift in ${locale}`).toEqual(enPaths);
    }
  });

  it("keeps interpolation placeholders in parity with en", () => {
    const enPaths = flatten(at(en, "safeExploration"));
    for (const path of enPaths) {
      const source = String(at(at(en, "safeExploration"), path));
      const placeholders = (source.match(/{{\w+}}/g) ?? []).sort();
      for (const locale of ["es", "vi", "zh-CN"]) {
        const value = String(at(at(LOCALES[locale], "safeExploration"), path));
        expect(
          (value.match(/{{\w+}}/g) ?? []).sort(),
          `placeholder drift at ${locale} ${path}`,
        ).toEqual(placeholders);
      }
    }
  });

  it("leaves no untranslated English in es/vi/zh-CN", () => {
    for (const band of BANDS) {
      const enStrings = stringsFor("en", band);
      for (const locale of ["es", "vi", "zh-CN"]) {
        const localized = stringsFor(locale, band);
        const identical = localized.filter((s, i) => s === enStrings[i]);
        expect(identical, `untranslated in ${locale}.${band}`).toEqual([]);
      }
    }
  });
});

describe("banded copy rules", () => {
  // Principle 9 / §8: no technical words in K–2 child-facing strings.
  const K2_BANNED: Record<string, RegExp> = {
    en: /checkpoint|mutation|rollback|revert|\bbranch|\bcommit|\bversion/i,
    es: /punto de control|mutaci|reversi|\brama\b|\bversi/i,
    vi: /điểm kiểm tra|đột biến|hoàn tác hệ thống|nhánh|phiên bản/i,
    "zh-CN": /检查点|突变|回滚|分支|版本/,
  };

  it.each(Object.keys(K2_BANNED))(
    "%s K–2 copy uses concrete verbs, not technical words",
    (locale) => {
      const offenders = stringsFor(locale, "k2").filter((s) =>
        K2_BANNED[locale].test(s),
      );
      expect(offenders).toEqual([]);
    },
  );

  it("lets the older band use comparison and version language", () => {
    expect(at(en, "safeExploration.older.actions.keep")).toMatch(/version/i);
    expect(at(en, "safeExploration.older.headings.observing")).toMatch(
      /compare/i,
    );
    expect(at(es, "safeExploration.older.actions.keep")).toMatch(/versi/i);
  });

  it("never blames the learner for a system failure", () => {
    for (const band of BANDS) {
      expect(
        at(en, `safeExploration.${band}.announce.unexpectedError`),
      ).toMatch(/our side/i);
      expect(
        at(es, `safeExploration.${band}.announce.unexpectedError`),
      ).toMatch(/nuestro lado/i);
    }
  });

  it("names what was restored rather than saying a bare 'done'", () => {
    for (const locale of Object.keys(LOCALES)) {
      for (const band of BANDS) {
        const value = String(
          at(LOCALES[locale], `safeExploration.${band}.announce.restored`),
        );
        expect(value, `${locale}.${band}`).toMatch(/{{baseline}}/);
      }
    }
  });
});
