/**
 * Guard for the g3_5 story/quiz overrides served by ActivityPlayer.
 * Contract: exactly the five visible Set 1 modules; 3 slides + 3 questions
 * with 4 choices each; en + es present everywhere; K-2 content passes
 * through applyG35StoryOverrides untouched.
 */
import { describe, expect, it } from "vitest";
import { G35_STORY_QUIZZES, applyG35StoryOverrides } from "../gradeBandContent";

const SET1_SLUGS = [
  "k2-stem-bounce-buds",
  "k2-stem-gotcha-gears",
  "k2-stem-rhyme-ride",
  "k2-stem-tank-trek",
  "k2-stem-quantum-quest",
];

describe("G35 story/quiz overrides", () => {
  it("covers exactly the five Set 1 modules", () => {
    expect(Object.keys(G35_STORY_QUIZZES).sort()).toEqual([...SET1_SLUGS].sort());
  });

  it.each(SET1_SLUGS)("%s: 3 slides + 3 questions x 4 choices, en+es everywhere", (slug) => {
    const o = G35_STORY_QUIZZES[slug];
    expect(o.slides).toHaveLength(3);
    for (const s of o.slides) {
      expect(s.text.en.trim()).toBeTruthy();
      expect(s.text.es.trim()).toBeTruthy();
    }
    expect(o.questions).toHaveLength(3);
    const ids = new Set([...o.slides.map((s) => s.id), ...o.questions.map((q) => q.id)]);
    expect(ids.size, "slide/question ids must be unique").toBe(6);
    for (const q of o.questions) {
      expect(q.choices, q.id).toHaveLength(4);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(4);
      expect(q.prompt.en.trim()).toBeTruthy();
      expect(q.prompt.es.trim()).toBeTruthy();
      for (const c of q.choices) {
        expect(c.en.trim(), `${q.id} choice en`).toBeTruthy();
        expect(c.es.trim(), `${q.id} choice es`).toBeTruthy();
      }
      if (q.hint) {
        expect(q.hint.en.trim()).toBeTruthy();
        expect(q.hint.es.trim()).toBeTruthy();
      }
    }
  });

  it("returns content untouched for k2, unknown modules, and non-story content", () => {
    const story = { type: "story_quiz", slides: [{ id: "k2-s" }], questions: [{ id: "k2-q" }] };
    expect(applyG35StoryOverrides(story, "k2-stem-tank-trek", "k2")).toBe(story);
    expect(applyG35StoryOverrides(story, "k2-stem-maze-maps", "g3_5")).toBe(story);
    const game = { gameKey: "tank_trek" };
    expect(applyG35StoryOverrides(game, "k2-stem-tank-trek", "g3_5")).toBe(game);
    expect(applyG35StoryOverrides(null, "k2-stem-tank-trek", "g3_5")).toBe(null);
    expect(applyG35StoryOverrides(story, undefined, "g3_5")).toBe(story);
  });

  it("swaps slides and questions for a g3_5 student on a Set 1 module", () => {
    const story = {
      type: "story_quiz",
      slides: [{ id: "k2-slide" }],
      questions: [{ id: "k2-q" }],
      review: { keyIdea: "x" },
    };
    const out = applyG35StoryOverrides(story, "k2-stem-rhyme-ride", "g3_5");
    expect(out).not.toBe(story);
    expect(out.type).toBe("story_quiz");
    expect(out.slides.map((s: { id: string }) => s.id)).toEqual([
      "g35-rr-s1",
      "g35-rr-s2",
      "g35-rr-s3",
    ]);
    expect(out.questions).toHaveLength(3);
    // unrelated fields and the source object stay intact
    expect(out.review).toEqual({ keyIdea: "x" });
    expect(story.slides[0].id).toBe("k2-slide");
  });
});
