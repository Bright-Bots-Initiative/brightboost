import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SparBotsGame from "../SparBotsGame";
import SparringArena from "../SparringArena";
import {
  counter,
  FLOORS,
  newDraft,
  newRound,
  parseDraft,
  practiceTell,
  referenceCards,
  serializeDraft,
  storageKey,
  step,
  tell,
  type Draft,
  type Floor,
} from "../model";
import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options: Record<string, unknown> = {}) => {
      let value: unknown = en;
      for (const k of key.split("."))
        value = (value as Record<string, unknown>)?.[k];
      return String(value ?? key).replace(/\{\{(\w+)\}\}/g, (_, k) =>
        String(options[k] ?? k),
      );
    },
  }),
}));
beforeEach(() => localStorage.clear());
const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));
async function keepEdit() {
  click("Try it");
  await screen.findByRole("button", { name: "Keep it" });
  click("Keep it");
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Keep it" }),
    ).not.toBeInTheDocument(),
  );
}
function showExamples(floor: Floor, round = 0) {
  click("Show six examples");
  for (let i = 0; i < 6; i++) {
    click(en.sparbots.moves[counter(practiceTell(floor, round, i).move)]);
    click("Keep this card");
  }
}
function winRound() {
  click("Train & watch");
  for (let i = 0; i < 3; i++) click("Let my bot choose");
  expect(
    screen.getByRole("heading", { name: "Sparks all around!" }),
  ).toBeInTheDocument();
}
function reflect() {
  click("Show the Why");
  click(/Card 1 ·/);
  // The final beat can be another clue; the trace tells which card contributed.
  if (
    (
      screen.getByRole("button", {
        name: "Keep this discovery",
      }) as HTMLButtonElement
    ).disabled
  ) {
    const used = screen.getByText(/Cards for this move:/).textContent!;
    const id = used.match(/\d+/)![0];
    click(new RegExp(`^Card ${id} ·`));
  }
  fireEvent.click(screen.getByLabelText(en.sparbots.reflections.examples));
  click("Keep this discovery");
}
describe("SparBots coaching journey", () => {
  it("teaches all four floors, revises a changed partner, reflects and retries platform saving", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    render(<SparBotsGame storageScope="learner-a" onComplete={complete} />);
    expect(screen.getByRole("button", { name: /Floor 2/ })).toBeDisabled();
    for (const floor of [0, 1, 2, 3] as Floor[]) {
      click(new RegExp(`Floor ${floor + 1}`));
      showExamples(floor);
      if (floor === 1) {
        click("Light");
        await keepEdit();
      }
      winRound();
      click("Back to Coach’s Corner");
      if (floor === 3) {
        expect(screen.getByText(en.sparbots.shift)).toBeInTheDocument();
        const cards = [
          ...referenceCards(3).slice(0, 2),
          ...Array.from({ length: 6 }, (_, i) => ({
            ...practiceTell(3, 0, i),
            id: i + 3,
          })),
        ];
        for (const card of cards) {
          const move = referenceCards(3, 1).find(
            (c) => c.pose === card.pose,
          )!.move;
          fireEvent.change(screen.getByLabelText(`Move on card ${card.id}`), {
            target: { value: move },
          });
          await keepEdit();
        }
      }
      winRound();
      reflect();
      expect(complete).not.toHaveBeenCalled();
      if (floor < 3) click("Choose my next floor");
    }
    fireEvent.change(screen.getByLabelText("Choose a bot name"), {
      target: { value: "pebble" },
    });
    click("Finish my tower");
    await screen.findByRole("alert");
    click("Finish my tower");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Tower saved" }),
      ).toBeDisabled(),
    );
    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete.mock.calls[0][0]).toMatchObject({
      gameKey: "sparbots",
      score: 1,
      total: 1,
      roundsCompleted: 4,
    });
    expect(complete.mock.calls[0][0].gameSpecific).toEqual({
      cardsKept: 8,
      revisions: 33,
      reflection: "examples",
    });
    expect(
      parseDraft(localStorage.getItem(storageKey("learner-a"))),
    ).toMatchObject({ cleared: 4, name: "pebble" });
    expect(localStorage.getItem(storageKey("learner-b"))).toBeNull();
  });
  it("supports keyboard entry, one-edit restore, draft isolation and storage errors", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SparBotsGame storageScope="a" />);
    screen.getByRole("button", { name: "Meet my partner" }).focus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("heading", { name: "Meet your partner" }),
    ).toHaveFocus();
    showExamples(0);
    const before = (
      screen.getByLabelText("Move on card 1") as HTMLSelectElement
    ).value;
    fireEvent.change(screen.getByLabelText("Move on card 1"), {
      target: { value: "block" },
    });
    expect(screen.getByLabelText("Move on card 2")).toBeDisabled();
    click("Try it");
    await screen.findByRole("button", { name: "Keep it" });
    click("Go back");
    await waitFor(() =>
      expect(screen.getByLabelText("Move on card 1")).toHaveValue(before),
    );
    const save = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    click("Save my version");
    expect(screen.getByRole("alert")).toHaveTextContent(en.sparbots.saveError);
    save.mockRestore();
    click("Save my version");
    expect(
      parseDraft(localStorage.getItem(storageKey("a")))?.cards,
    ).toHaveLength(8);
    rerender(<SparBotsGame storageScope="b" />);
    click("My Bot Card");
    expect(
      screen.getByText("2 example cards · 0 changes made"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Finish my tower" }),
    ).not.toBeInTheDocument();
  });
  it("shows unknown-clue coaching once, keeps the example only on request, and respects the injected band", () => {
    const draft = { ...newDraft(), cards: referenceCards(0).slice(2) };
    localStorage.setItem(storageKey("coach"), serializeDraft(draft));
    render(
      <SparBotsGame storageScope="coach" config={{ gradeBand: "g3_5" }} />,
    );
    click("Meet my partner");
    click("Show six examples");
    for (let i = 0; i < 6; i++) {
      click("Tap");
      click("Toss this card");
    }
    click("Train & watch");
    expect(
      screen.getByRole("meter", { name: "Your bot’s sparks" }),
    ).toHaveAttribute("max", "5");
    click("Coach: Tap");
    expect(
      within(
        screen.getByRole("list", { name: en.sparbots.decisionPath }),
      ).getByText(en.sparbots.coachPick),
    ).toBeVisible();
    const beforeReplay = localStorage.getItem(storageKey("coach"));
    const sparks = screen.getByRole("meter", { name: "Your bot’s sparks" });
    expect(sparks).toHaveAttribute("value", "1");
    click("Watch again");
    click("Watch again");
    expect(sparks).toHaveAttribute("value", "1");
    expect(screen.getByText("Replay · Beat 1")).toBeVisible();
    expect(localStorage.getItem(storageKey("coach"))).toBe(beforeReplay);
    expect(
      screen.getByRole("button", { name: "Let my bot choose" }),
    ).toBeDisabled();
    click("Keep this card");
    expect(
      screen.queryByRole("button", { name: "Coach: Tap" }),
    ).not.toBeInTheDocument();
    click("Pause in Coach’s Corner");
    click("Save my version");
    expect(
      parseDraft(localStorage.getItem(storageKey("coach")))?.cards.at(-1)
        ?.source,
    ).toBe("coach");
  });
  it("replays a bump and a round-ending partner spark without changing either meter or opening another beat", () => {
    const complete = vi.fn();
    // Pip shows spin, block, tap. These cards tie on spin and lose otherwise.
    const draft: Draft = {
      ...newDraft(),
      cards: referenceCards(0).map((card) => ({
        ...card,
        move: card.pose === "low" ? "tap" : "spin",
      })),
    };
    localStorage.setItem(storageKey("replay"), serializeDraft(draft));
    const { container } = render(
      <SparBotsGame storageScope="replay" onComplete={complete} />,
    );
    click("Meet my partner");
    click("Show six examples");
    for (let i = 0; i < 6; i++) {
      click("Spin");
      click("Toss this card");
    }
    click("Train & watch");
    const bot = screen.getByRole("meter", { name: en.sparbots.yourSparks });
    const partner = screen.getByRole("meter", {
      name: en.sparbots.partnerSparks,
    });
    const next = () => click("Let my bot choose");
    next();
    click("Watch again");
    expect(bot).toHaveAttribute("value", "0");
    expect(partner).toHaveAttribute("value", "0");
    expect(container.querySelector(".sparbots-bump")).toBeInTheDocument();
    expect(screen.getByText(en.sparbots.bumpLabel)).toBeVisible();
    expect(container.querySelector(".sparbots-spark-flight")).toBeNull();
    expect(screen.getByText("Replay · Beat 1")).toBeVisible();
    next();
    expect(partner).toHaveAttribute("value", "1");
    expect(screen.queryByText("Replay · Beat 1")).not.toBeInTheDocument();
    next();
    next();
    next();
    expect(
      screen.getByRole("heading", { name: en.sparbots.roundEnd.partner }),
    ).toBeVisible();
    click("Watch again");
    expect(screen.getByText("Replay · Beat 5")).toBeVisible();
    expect(bot).toHaveAttribute("value", "0");
    expect(partner).toHaveAttribute("value", "3");
    expect(screen.getByText("Spark for Pip!")).toBeVisible();
    expect(
      container.querySelector('[data-side="partner"] .sparbots-spark-flight')
        ?.parentElement,
    ).toBe(
      container.querySelector(
        '[data-side="partner"] .sparbots-socket:last-child',
      ),
    );
    expect(
      screen.queryByRole("button", { name: en.sparbots.nextBeat }),
    ).not.toBeInTheDocument();
    expect(complete).not.toHaveBeenCalled();
  });
  it.each([
    [
      referenceCards(1),
      en.sparbots.cardNumber.replace("{{number}}", "1"),
      en.sparbots.moves.block,
    ],
    [
      referenceCards(1).slice(1, 2),
      en.sparbots.otherCards,
      en.sparbots.moves.tap,
    ],
    [[], en.sparbots.noCards, en.sparbots.noMove],
  ] as const)(
    "shows the actual source of a light-based decision (%#)",
    (cards, source, move) => {
      const draft: Draft = {
        ...newDraft(1, 1),
        cards: [...cards],
        clue: "light",
      };
      const round = step(draft, newRound(), 3);
      render(
        <SparringArena
          draft={draft}
          round={round}
          target={3}
          nextSignal={tell(1, 0, 1)}
          botName="Comet"
          partnerName="Tally"
        />,
      );
      const path = within(
        screen.getByRole("list", { name: en.sparbots.decisionPath }),
      );
      expect(
        path.getAllByRole("listitem").map((item) => item.textContent),
      ).toEqual([en.sparbots.lights.triangle, source, move]);
    },
  );
  it("provides Spanish copy for the complete coaching vocabulary", () => {
    function leaves(value: Record<string, unknown>, prefix = ""): string[] {
      return Object.entries(value).flatMap(([key, v]) =>
        typeof v === "object"
          ? leaves(v as Record<string, unknown>, `${prefix}${key}.`)
          : [`${prefix}${key}`],
      );
    }
    expect(leaves(es.sparbots).sort()).toEqual(leaves(en.sparbots).sort());
    expect(FLOORS).toHaveLength(4);
  });
});
