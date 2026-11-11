import { describe, expect, it, vi } from "vitest";
import {
  addCard,
  counter,
  decide,
  FLOORS,
  MAX_BEATS,
  MAX_BYTES,
  newDraft,
  newRound,
  outcome,
  parseDraft,
  practiceTell,
  referenceCards,
  runRound,
  serializeDraft,
  step,
  tell,
  type Floor,
} from "../model";

describe("SparBots example-driven learning", () => {
  it("uses the move triangle and abstains with no examples", () => {
    expect(outcome("tap", "spin")).toBe("bot");
    expect(outcome("spin", "block")).toBe("bot");
    expect(outcome("block", "tap")).toBe("bot");
    expect(outcome("tap", "tap")).toBe("bump");
    expect(decide([], "pose", tell(0, 0, 0), 1).move).toBeNull();
  });
  it.each([0, 1, 2, 3] as Floor[])(
    "has a small reference playbook that clears floor %i; an empty book cannot",
    (floor) => {
      for (const target of [3, 5]) {
        for (const index of [0, 1, 2]) {
          const draft = {
            ...newDraft(floor, floor),
            clue: FLOORS[floor].clue,
            cards: referenceCards(floor, index),
          };
          expect(runRound(draft, index, target).result).toBe("bot");
          expect(runRound({ ...draft, cards: [] }, index, target).result).toBe(
            "partner",
          );
        }
      }
    },
  );
  it("makes bad labels, irrelevant clues and a changed mapping observable", () => {
    expect(runRound(newDraft(2, 2), 0).result).not.toBe("bot");
    const lightBook = { ...newDraft(1, 1), cards: referenceCards(1) };
    expect(runRound(lightBook, 0).result).not.toBe("bot");
    expect(runRound({ ...lightBook, clue: "light" }, 0).result).toBe("bot");
    const shuffle = { ...newDraft(3, 3), cards: referenceCards(3) };
    expect(runRound(shuffle, 0).result).toBe("bot");
    expect(runRound(shuffle, 1).result).not.toBe("bot");
    expect(
      runRound({ ...shuffle, cards: referenceCards(3, 1) }, 1).result,
    ).toBe("bot");
  });
  it("explains majority, conflicting cards and unseen clues deterministically", () => {
    const signal = tell(0, 0, 0),
      card = referenceCards(0)[0];
    const cards = [card, { ...card, id: 4, move: counter(card.move) }];
    const decision = decide(cards, "pose", signal, 7);
    expect(decision.tied).toBe(true);
    expect(decision.confidence).toBe("some");
    expect(decision.matching).toEqual([1, 4]);
    expect(decision.voters).toHaveLength(1);
    expect(decide(cards, "pose", signal, 7)).toEqual(decision);
    expect(
      decide(cards, "pose", { ...signal, pose: "low" }, 7).confidence,
    ).toBe("new");
    const spy = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("unseeded");
    });
    expect(runRound(newDraft(), 0)).toEqual(runRound(newDraft(), 0));
    spy.mockRestore();
  });
  it("offers only one coach call per round and only on an unseen clue", () => {
    const draft = newDraft();
    let round = step(draft, newRound(), 3, "tap");
    expect(round.beats[0].coached).toBe(false);
    round = step(draft, round, 3);
    round = step(draft, round, 3, counter(tell(0, 0, 2).move));
    expect(round.coachUsed).toBe(true);
    expect(round.beats[2].coached).toBe(true);
    const empty = { ...draft, cards: [] };
    const once = step(empty, newRound(), 5, "tap");
    expect(step(empty, once, 5, "spin").beats[1].coached).toBe(false);
  });
  it("bounds draws and samples every teaching clue", () => {
    const draft = {
      ...newDraft(),
      cards: referenceCards(0).map((c) => ({
        ...c,
        move: counter(counter(c.move)),
      })),
    };
    const round = runRound(draft, 0);
    expect(round.result).toBe("draw");
    expect(round.beats).toHaveLength(MAX_BEATS);
    expect(step(draft, round, 3)).toBe(round);
    for (const floor of [0, 1, 2, 3] as Floor[]) {
      const signals = Array.from(
        { length: 6 },
        (_, i) => practiceTell(floor, 0, i)[FLOORS[floor].clue],
      );
      expect(new Set(signals).size).toBe(3);
    }
  });
});

describe("bounded device drafts", () => {
  it("round-trips a full deck and rejects malformed or expanded payloads", () => {
    const draft = newDraft();
    while (draft.cards.length < 24)
      draft.cards = addCard(draft.cards, tell(0, 0, 1), "tap", "practice");
    const raw = serializeDraft(draft);
    expect(new TextEncoder().encode(raw).length).toBeLessThanOrEqual(MAX_BYTES);
    expect(parseDraft(raw)).toEqual(draft);
    expect(addCard(draft.cards, tell(0, 0, 0), "spin", "coach")).toBe(
      draft.cards,
    );
    for (const value of [
      { ...draft, cards: [...draft.cards, { ...draft.cards[0], id: 25 }] },
      { ...draft, cards: [draft.cards[0], draft.cards[0]] },
      { ...draft, cards: [{ ...draft.cards[0], move: "shoot" }] },
      { ...draft, name: "free text" },
      { ...draft, seed: "changed" },
      { ...draft, floor: 3, cleared: 0 },
      { ...draft, revisions: -1 },
    ])
      expect(parseDraft(JSON.stringify(value))).toBeNull();
    expect(parseDraft("{")).toBeNull();
    expect(parseDraft(" ".repeat(MAX_BYTES + 1))).toBeNull();
    expect(
      parseDraft(JSON.stringify(newDraft()).padEnd(MAX_BYTES, "é")),
    ).toBeNull();
  });
});
