import { describe, expect, it } from "vitest";
import {
  newStudioName,
  parseStudioDraft,
  renderStudioName,
  runMachine,
  starterStudioDraft,
  studioLessonCopy,
  studioLevel,
  verifyStudioDraft,
  type StudioDraft,
} from "../index";

describe("the first Great Work studio", () => {
  it("recreates the same engine output after saving, leaving and reopening", () => {
    const draft = starterStudioDraft("en");
    const result = runMachine(studioLevel(draft), draft.program);
    expect(result.produced).toMatchObject([
      { molecule: { atoms: [{ element: "water" }] }, count: 1 },
    ]);
    const saved = parseStudioDraft(JSON.parse(JSON.stringify(draft)));
    expect(verifyStudioDraft(saved)).toEqual(result);
    expect(
      verifyStudioDraft(
        parseStudioDraft({ ...saved, program: { parts: [], tapes: [] } }),
      ).produced,
    ).toEqual([]);
  });

  it("gives the younger learner an observable change to make, in either language", () => {
    const lesson = starterStudioDraft("es", true);
    expect(studioLessonCopy("es-MX").hint).toContain("paso 2");
    expect(verifyStudioDraft(parseStudioDraft(lesson))).toMatchObject({
      solved: false,
      produced: [],
    });
    const fixed: StudioDraft = {
      ...lesson,
      program: {
        ...lesson.program,
        tapes: [{ armId: 1, chips: ["GRAB", "ROTATE_CW", "DROP"] }],
      },
    };
    const result = verifyStudioDraft(parseStudioDraft(fixed));
    expect(result).toMatchObject({
      solved: true,
      produced: [{ count: 1, molecule: { atoms: [{ element: "water" }] } }],
    });
    expect(
      verifyStudioDraft(parseStudioDraft(JSON.parse(JSON.stringify(fixed)))),
    ).toEqual(result);
    expect(verifyStudioDraft(lesson).solved).toBe(false);
  });

  it("validates the save envelope before simulating and rejects forged scores or lesson settings", () => {
    const draft = starterStudioDraft("en", true);
    expect(parseStudioDraft(draft)).toEqual(draft);
    for (const value of [
      { ...draft, lastRun: { cycles: 1 } },
      { ...draft, v: 2 },
      { ...draft, iterations: Infinity },
      { ...draft, targetCount: 3 },
      {
        ...draft,
        targetProduct: {
          atoms: [{ at: { q: 0, r: 0 }, element: "fire" }],
          bonds: [],
        },
      },
      { ...draft, nameSeed: { ...draft.nameSeed, noun: "n.invalid" } },
      {
        ...draft,
        program: { ...draft.program, tapes: [{ armId: 1, chips: ["REPEAT"] }] },
      },
      {
        ...draft,
        program: {
          ...draft.program,
          tapes: [{ armId: 1, chips: ["GRAB", "DROP", "DROP", "DROP"] }],
        },
      },
      {
        ...draft,
        program: {
          ...draft.program,
          tapes: [{ armId: 1, chips: [], replay: 1 }],
        },
      },
      {
        ...draft,
        program: {
          ...draft.program,
          parts: [
            {
              kind: "dispenser",
              id: 12,
              element: "water",
              at: { q: 65, r: 1 },
            },
          ],
        },
      },
      {
        ...draft,
        program: { ...draft.program, tapes: [{ armId: 3, chips: [] }] },
      },
      { ...draft, mode: "open" },
      { ...draft, levelKey: "T8" },
    ])
      expect(() => parseStudioDraft(value)).toThrow();
    expect(() => verifyStudioDraft(draft, () => true)).toThrow(
      "GW_STUDIO_RUN_TIMEOUT",
    );
  });

  it("rerolls without repeating, translates saved names and identifies English fallback", () => {
    const first = newStudioName("es-MX");
    const second = newStudioName("es", first);
    expect(second).not.toEqual(first);
    expect(second.poolLocale).toBe("es");
    const seed = {
      adj1: "a1.curious",
      adj2: "a2.star",
      noun: "n.spark",
      poolLocale: "es",
    } as const;
    expect(renderStudioName(seed, "es")).toBe(
      "Chispa curiosa de las estrellas",
    );
    expect(renderStudioName(seed, "en")).toBe("Curious Star Spark");
    expect(newStudioName("vi").poolLocale).toBe("en");
    expect(newStudioName("zh-CN").poolLocale).toBe("en");
  });
});
