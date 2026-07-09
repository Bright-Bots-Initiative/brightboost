import { describe, it, expect } from "vitest";
import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";

const NEW_KEY_PATHS = [
  "questionOf",
  "feedback.answerIs",
  "feedback.seeResults",
  "feedback.correctCheers",
  "feedback.incorrectGentle",
  "summary.title",
  "summary.scoreLine",
  "summary.perfect",
  "summary.finish",
] as const;

const LEGACY_KEY_PATHS = [
  "submit",
  "reset",
  "tryAgain",
  "almost",
  "checkHints",
] as const;

const EN_BANNED = /wrong|incorrect|failed|no!/i;
const ES_BANNED = /mal|incorrecto|fallaste/i;

function getAtPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined || typeof acc !== "object") {
      return undefined;
    }
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, out);
    }
  }
  return out;
}

// covered-by AC-6.1 (all new keys in en/es), AC-6.3 (parity + banned-word scan)
describe("i18n parity (overview §5.6.1 + G-004 + G-009)", () => {
  const enActivity = en.activityPlayer as Record<string, unknown>;
  const esActivity = es.activityPlayer as Record<string, unknown>;

  it.each(NEW_KEY_PATHS)("§5.6.1 key activityPlayer.%s exists in en and es", (path) => {
    const enVal = getAtPath(enActivity, path);
    const esVal = getAtPath(esActivity, path);

    expect(enVal, `missing en activityPlayer.${path}`).toBeDefined();
    expect(esVal, `missing es activityPlayer.${path}`).toBeDefined();
    expect(enVal).not.toBeNull();
    expect(esVal).not.toBeNull();
  });

  it("array keys have equal length in en and es", () => {
    const arrayPaths = ["feedback.correctCheers", "feedback.incorrectGentle"] as const;

    for (const path of arrayPaths) {
      const enArr = getAtPath(enActivity, path);
      const esArr = getAtPath(esActivity, path);

      expect(Array.isArray(enArr)).toBe(true);
      expect(Array.isArray(esArr)).toBe(true);
      expect((enArr as unknown[]).length).toBe((esArr as unknown[]).length);
    }

    expect((getAtPath(enActivity, "feedback.correctCheers") as unknown[]).length).toBe(5);
    expect((getAtPath(enActivity, "feedback.incorrectGentle") as unknown[]).length).toBe(4);
  });

  it("G-009: new child-facing en strings contain no banned words", () => {
    const strings: string[] = [];
    for (const path of NEW_KEY_PATHS) {
      collectStrings(getAtPath(enActivity, path), strings);
    }

    for (const str of strings) {
      expect(str).not.toMatch(EN_BANNED);
    }
  });

  it("G-009: new child-facing es strings contain no banned words", () => {
    const strings: string[] = [];
    for (const path of NEW_KEY_PATHS) {
      collectStrings(getAtPath(esActivity, path), strings);
    }

    for (const str of strings) {
      expect(str).not.toMatch(ES_BANNED);
    }
  });

  it.each(LEGACY_KEY_PATHS)(
    "G-004: legacy key activityPlayer.%s still present in en and es",
    (path) => {
      expect(getAtPath(enActivity, path), `missing en activityPlayer.${path}`).toBeDefined();
      expect(getAtPath(esActivity, path), `missing es activityPlayer.${path}`).toBeDefined();
    },
  );
});
