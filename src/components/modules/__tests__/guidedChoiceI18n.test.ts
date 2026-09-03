/**
 * #842 — locale coverage for the guided-choice copy.
 *
 * Modelled on `safeExplorationI18n.test.ts`, the repo's strictest parity
 * fixture: every locale must carry exactly the same key set as English, with
 * the same interpolation placeholders and no untranslated English left behind.
 *
 * Scoped to `modules.guidedChoice.*` on purpose. The wider `modules.*` subtree
 * is **not** at parity today (es/vi/zh-CN are missing six Set 2/Set 3 keys
 * that predate this work) and closing that gap is not this change's to make —
 * but new copy is held to the bar regardless of the neighbourhood it lands in.
 *
 * Rule 20-i18n: keys, not literals; en + es minimum. vi and zh-CN are included
 * because these strings are short, concrete K-2 sentences.
 */
import { describe, it, expect } from "vitest";
import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";
import vi from "@/locales/vi/common.json";
import zhCN from "@/locales/zh-CN/common.json";

type Bag = Record<string, unknown>;

const LOCALES: Record<string, Bag> = {
  es: es as Bag,
  vi: vi as Bag,
  "zh-CN": zhCN as Bag,
};

function guidedChoice(bag: Bag): Bag {
  const modules = bag.modules as Bag | undefined;
  return (modules?.guidedChoice ?? {}) as Bag;
}

function flatten(bag: Bag, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(bag)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value as Bag, path));
    } else {
      out[path] = String(value);
    }
  }
  return out;
}

function placeholders(value: string): string[] {
  return (value.match(/\{\{\s*\w+\s*\}\}/g) ?? [])
    .map((p) => p.replace(/[{}\s]/g, ""))
    .sort();
}

const EN = flatten(guidedChoice(en as Bag));
const EN_PATHS = Object.keys(EN).sort();

/**
 * The keys the panel actually reads. Listed explicitly so deleting one from
 * the locale files fails here rather than at runtime as a raw key on screen.
 */
const REQUIRED = [
  "accept",
  "announceEmpty",
  "announceSurprise",
  "cancel",
  "chooseAnother",
  "continueNext",
  "continueReplay",
  "continueStart",
  "emptyBody",
  "emptyHeading",
  "heading",
  "objectiveLabel",
  "objectiveMissing",
  "revisit",
  "revisitIntro",
  "setLabel",
  "surprise",
  "surpriseHeading",
  "tryAnother",
  "tryAnotherIntro",
  "whyProgression",
  "whyTeacher",
];

describe("modules.guidedChoice i18n", () => {
  it("English defines every key the panel uses, and nothing spare", () => {
    expect(EN_PATHS).toEqual([...REQUIRED].sort());
    for (const path of EN_PATHS) {
      expect(EN[path].trim()).not.toBe("");
    }
  });

  it.each(Object.keys(LOCALES))("%s has exactly English's key set", (code) => {
    const flat = flatten(guidedChoice(LOCALES[code]));
    expect(Object.keys(flat).sort()).toEqual(EN_PATHS);
    for (const path of EN_PATHS) {
      expect(typeof flat[path]).toBe("string");
      expect(flat[path].trim()).not.toBe("");
    }
  });

  it.each(Object.keys(LOCALES))(
    "%s uses the same interpolation placeholders as English",
    (code) => {
      const flat = flatten(guidedChoice(LOCALES[code]));
      for (const path of EN_PATHS) {
        expect({ path, ph: placeholders(flat[path]) }).toEqual({
          path,
          ph: placeholders(EN[path]),
        });
      }
    },
  );

  it.each(Object.keys(LOCALES))("%s is actually translated", (code) => {
    const flat = flatten(guidedChoice(LOCALES[code]));
    const untranslated = EN_PATHS.filter(
      // A key whose value is character-identical to English is a copy-paste
      // placeholder, not a translation. `setLabel` is exempt for es because
      // "Set" is the product's own word for a STEM set in Spanish copy too
      // (the existing `modules.set1Label` already reads "Set 1: Fundamentos").
      (path) =>
        flat[path] === EN[path] && !(code === "es" && path === "setLabel"),
    );
    expect(untranslated).toEqual([]);
  });

  it("keeps child-facing copy free of technical exploration words", () => {
    // Accessibility contract §8 / principle 9's K-2 banded expressions.
    const banned = /checkpoint|mutation|rollback|branch|seed|remix|algorithm/i;
    for (const [code, bag] of Object.entries({ en: en as Bag, ...LOCALES })) {
      const flat = flatten(guidedChoice(bag));
      for (const [path, value] of Object.entries(flat)) {
        expect(`${code}.${path}: ${value}`).not.toMatch(banned);
      }
    }
  });
});
