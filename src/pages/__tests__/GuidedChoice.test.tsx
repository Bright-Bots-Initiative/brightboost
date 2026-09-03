/**
 * #842 — the guided-choice UI contract.
 *
 * What these cases exist to prove, in the order the issue's acceptance
 * criteria ask for it:
 *
 * - Continue is the ONE dominant action and keeps the canonical scan's target;
 * - "Surprise me" never launches immediately — the destination, its objective
 *   and why it is available are disclosed in ordinary page structure first,
 *   and the learner can accept, reselect, or cancel (accessibility contract
 *   §1, the "surprise destination" row);
 * - focus moves to the disclosure on open and returns to the invoking control
 *   on cancel, having navigated nowhere;
 * - everything is reachable by keyboard alone;
 * - the pick is deterministic under an injected seed (contract §5) — no case
 *   here depends on `Math.random`;
 * - an empty pool is a safe state, never an error.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GuidedChoicePanel } from "@/components/modules/GuidedChoicePanel";
import type { GuidedChoiceResult } from "@/lib/guidedChoice";

const track = vi.fn();
vi.mock("@/lib/analytics", () => ({ track: (e: unknown) => track(e) }));

const SEED = { seedUserId: "student-7", seedDateBucket: "2026-09-03" };

function destination(slug: string, extra: Record<string, unknown> = {}) {
  return {
    moduleSlug: slug,
    title: `${slug} name`,
    objective: `${slug} objective`,
    whyAvailable: "progression" as const,
    ...extra,
  };
}

function result(
  overrides: Partial<GuidedChoiceResult> = {},
): GuidedChoiceResult {
  return {
    continueTarget: {
      kind: "activity",
      moduleSlug: "mod-continue",
      moduleTitle: "Bounce Buds",
      lessonId: "lesson-1",
      activityId: "act-1",
      activityTitle: "Round 1",
    },
    eligible: [
      destination("alt-a"),
      destination("alt-b"),
      destination("alt-c"),
      destination("alt-d"),
    ],
    revisit: [],
    excluded: [],
    ...overrides,
  };
}

function renderPanel(overrides: Partial<GuidedChoiceResult> = {}) {
  const navigate = vi.fn();
  const utils = render(
    <GuidedChoicePanel
      result={result(overrides)}
      navigate={navigate}
      {...SEED}
    />,
  );
  return { navigate, ...utils };
}

beforeEach(() => {
  track.mockClear();
});

// ── Hierarchy ─────────────────────────────────────────────────────────────

describe("navigation hierarchy", () => {
  it("has exactly one dominant action, and it is Continue", () => {
    renderPanel({ revisit: [destination("done-a")] });
    const primary = document.querySelectorAll('[data-guided-action="primary"]');
    expect(primary).toHaveLength(1);
    expect(primary[0]).toBe(screen.getByTestId("guided-continue"));
    // The other three choices exist, and none of them is dominant.
    expect(screen.getByTestId("guided-try-another")).toBeInTheDocument();
    expect(screen.getByTestId("guided-revisit")).toBeInTheDocument();
    expect(screen.getByTestId("guided-surprise")).toBeInTheDocument();
  });

  it("puts Continue first in focus order among the actions", () => {
    renderPanel({ revisit: [destination("done-a")] });
    const buttons = Array.from(
      document.querySelectorAll("[data-guided-action]"),
    );
    expect(buttons[0]).toBe(screen.getByTestId("guided-continue"));
  });

  it("sends Continue to the canonical scan's activity route", async () => {
    const user = userEvent.setup();
    const { navigate } = renderPanel();
    await user.click(screen.getByTestId("guided-continue"));
    expect(navigate).toHaveBeenCalledWith(
      "/student/modules/mod-continue/lessons/lesson-1/activities/act-1",
    );
  });

  it("sends Continue to the module when there is no progress yet", async () => {
    const user = userEvent.setup();
    const { navigate } = renderPanel({
      continueTarget: {
        kind: "module",
        moduleSlug: "mod-first",
        moduleTitle: "First Game",
      },
    });
    await user.click(screen.getByTestId("guided-continue"));
    expect(navigate).toHaveBeenCalledWith("/student/modules/mod-first");
  });

  it("keeps alternatives collapsed so they cannot obscure Continue", async () => {
    const user = userEvent.setup();
    renderPanel();
    const trigger = screen.getByTestId("guided-try-another");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("guided-alternatives")).toBeNull();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const list = screen.getByTestId("guided-alternatives");
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(within(list).getByText("alt-a name")).toBeInTheDocument();
    expect(within(list).getByText("alt-a objective")).toBeInTheDocument();
    // Continue is still there and still the only dominant action.
    expect(
      document.querySelectorAll('[data-guided-action="primary"]'),
    ).toHaveLength(1);
  });

  it("opens a chosen alternative", async () => {
    const user = userEvent.setup();
    const { navigate } = renderPanel();
    await user.click(screen.getByTestId("guided-try-another"));
    await user.click(screen.getByLabelText("Start Learning alt-b name"));
    expect(navigate).toHaveBeenCalledWith("/student/modules/alt-b");
  });

  it("omits Revisit entirely when nothing has been finished", () => {
    renderPanel({ revisit: [] });
    expect(screen.queryByTestId("guided-revisit")).toBeNull();
  });

  it("labels Revisit truthfully — replay, never an unsupported remix", async () => {
    const user = userEvent.setup();
    renderPanel({ revisit: [destination("done-a")] });
    const trigger = screen.getByTestId("guided-revisit");
    expect(trigger).toHaveTextContent("Play one again");
    expect(trigger.textContent?.toLowerCase()).not.toContain("remix");

    await user.click(trigger);
    const list = screen.getByTestId("guided-revisit-list");
    expect(within(list).getByText("done-a name")).toBeInTheDocument();
    // States what replaying does, before anything is opened (contract §1).
    expect(
      screen.getByText(/Your finished work stays just as it is/),
    ).toBeInTheDocument();
    expect(document.body.textContent?.toLowerCase()).not.toContain("remix");
  });
});

// ── Surprise: disclosure before navigation ────────────────────────────────

describe("surprise me", () => {
  it("discloses the destination, its objective and why it is available — and does NOT navigate", async () => {
    const user = userEvent.setup();
    const { navigate } = renderPanel();

    await user.click(screen.getByTestId("guided-surprise"));

    const disclosure = screen.getByTestId("guided-surprise-disclosure");
    expect(disclosure).toBeInTheDocument();
    const name = screen.getByTestId("guided-surprise-name").textContent ?? "";
    expect(["alt-a name", "alt-b name", "alt-c name", "alt-d name"]).toContain(
      name,
    );
    expect(
      within(disclosure).getByText("What you will do:"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("guided-surprise-why")).toHaveTextContent(
      "You opened this one by playing.",
    );

    // The whole point: nothing has been launched.
    expect(navigate).not.toHaveBeenCalled();
  });

  it("navigates only once Accept is pressed", async () => {
    const user = userEvent.setup();
    const { navigate } = renderPanel();
    await user.click(screen.getByTestId("guided-surprise"));
    expect(navigate).not.toHaveBeenCalled();

    const name = screen.getByTestId("guided-surprise-name").textContent ?? "";
    const slug = name.replace(" name", "");
    await user.click(screen.getByTestId("guided-surprise-accept"));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(`/student/modules/${slug}`);
  });

  it("moves focus to the disclosure on open", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId("guided-surprise"));
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByTestId("guided-surprise-disclosure"),
      );
    });
  });

  it("returns focus to the invoking control on cancel, having navigated nowhere", async () => {
    const user = userEvent.setup();
    const { navigate } = renderPanel();
    const trigger = screen.getByTestId("guided-surprise");
    await user.click(trigger);
    await user.click(screen.getByTestId("guided-surprise-cancel"));

    expect(screen.queryByTestId("guided-surprise-disclosure")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("cancels on Escape without navigating", async () => {
    const user = userEvent.setup();
    const { navigate } = renderPanel();
    const trigger = screen.getByTestId("guided-surprise");
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByTestId("guided-surprise-disclosure")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("is deterministic: the same seed shows the same destination", async () => {
    const user = userEvent.setup();
    const names: string[] = [];
    for (let run = 0; run < 2; run++) {
      const { unmount } = renderPanel();
      await user.click(screen.getByTestId("guided-surprise"));
      names.push(screen.getByTestId("guided-surprise-name").textContent ?? "");
      unmount();
    }
    expect(names[0]).toBe(names[1]);
  });

  it("shows a different learner a pick of their own, deterministically", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    for (const seedUserId of ["s1", "s2", "s3", "s4", "s5", "s6"]) {
      const { unmount } = render(
        <GuidedChoicePanel
          result={result()}
          navigate={vi.fn()}
          seedUserId={seedUserId}
          seedDateBucket={SEED.seedDateBucket}
        />,
      );
      await user.click(screen.getByTestId("guided-surprise"));
      seen.push(screen.getByTestId("guided-surprise-name").textContent ?? "");
      unmount();
    }
    expect(new Set(seen).size).toBeGreaterThan(1);
  });

  it('"Show me a different one" rerolls deterministically and never leaves the pool', async () => {
    const user = userEvent.setup();
    const pool = ["alt-a name", "alt-b name", "alt-c name", "alt-d name"];

    async function walk() {
      const { unmount } = renderPanel();
      await user.click(screen.getByTestId("guided-surprise"));
      const seq = [
        screen.getByTestId("guided-surprise-name").textContent ?? "",
      ];
      for (let i = 0; i < 6; i++) {
        await user.click(screen.getByTestId("guided-surprise-reroll"));
        seq.push(screen.getByTestId("guided-surprise-name").textContent ?? "");
      }
      unmount();
      return seq;
    }

    const first = await walk();
    const second = await walk();

    // Every pick came out of the offered pool…
    for (const name of first) expect(pool).toContain(name);
    // …rerolling can actually change the answer…
    expect(new Set(first).size).toBeGreaterThan(1);
    // …and the whole walk replays identically for the same seed.
    expect(first).toEqual(second);
  });

  it("offers a safe empty state rather than an error when nothing is available", async () => {
    const user = userEvent.setup();
    const { navigate } = renderPanel({ eligible: [] });

    // The alternatives trigger is gone, but Surprise is still answerable.
    expect(screen.queryByTestId("guided-try-another")).toBeNull();
    await user.click(screen.getByTestId("guided-surprise"));

    expect(screen.getByText("Nothing new right now")).toBeInTheDocument();
    expect(screen.getByTestId("guided-surprise-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("guided-surprise-accept")).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    // No alert/error semantics anywhere.
    expect(screen.queryByRole("alert")).toBeNull();

    // And it still returns cleanly.
    await user.click(screen.getByTestId("guided-surprise-cancel"));
    expect(document.activeElement).toBe(screen.getByTestId("guided-surprise"));
  });

  it("announces the destination and objective once, deterministically", async () => {
    const user = userEvent.setup();
    renderPanel();
    const live = screen.getByTestId("guided-announcement");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveTextContent("");

    await user.click(screen.getByTestId("guided-surprise"));
    const name = screen.getByTestId("guided-surprise-name").textContent ?? "";
    const slug = name.replace(" name", "");
    expect(live).toHaveTextContent(`Surprise: ${name}. ${slug} objective`);

    await user.click(screen.getByTestId("guided-surprise-cancel"));
    expect(live.textContent).toBe("");
  });

  it("announces the empty pool as a state, not a failure", async () => {
    const user = userEvent.setup();
    renderPanel({ eligible: [] });
    await user.click(screen.getByTestId("guided-surprise"));
    expect(screen.getByTestId("guided-announcement")).toHaveTextContent(
      "Nothing new right now. Keep going with your next game.",
    );
  });
});

// ── Teacher assignments ───────────────────────────────────────────────────

describe("teacher assignments stay visible and attributed", () => {
  it("names the teacher as the reason, and puts assigned work first", async () => {
    const user = userEvent.setup();
    renderPanel({
      eligible: [
        destination("alt-a"),
        destination("assigned", { whyAvailable: "teacher_assignment" }),
      ],
    });
    await user.click(screen.getByTestId("guided-try-another"));
    const items = within(
      screen.getByTestId("guided-alternatives"),
    ).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("assigned name");
    expect(items[0]).toHaveTextContent("Your teacher picked this one for you.");
    expect(items[1]).toHaveTextContent("You opened this one by playing.");
  });
});

// ── Keyboard only ─────────────────────────────────────────────────────────

describe("keyboard-only operation", () => {
  it("reaches and operates every essential action with the keyboard alone", async () => {
    const user = userEvent.setup();
    const { navigate } = renderPanel({ revisit: [destination("done-a")] });

    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId("guided-continue"));
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByTestId("guided-try-another"),
    );
    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId("guided-revisit"));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId("guided-surprise"));

    // Open the surprise with the keyboard, reroll, then accept — no pointer.
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByTestId("guided-surprise-disclosure"),
      ),
    );
    expect(navigate).not.toHaveBeenCalled();

    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByTestId("guided-surprise-accept"),
    );
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByTestId("guided-surprise-reroll"),
    );
    await user.keyboard("{Enter}");
    expect(navigate).not.toHaveBeenCalled();

    const name = screen.getByTestId("guided-surprise-name").textContent ?? "";
    const slug = name.replace(" name", "");
    await user.click(screen.getByTestId("guided-surprise-accept"));
    expect(navigate).toHaveBeenCalledWith(`/student/modules/${slug}`);
  });
});

// ── Analytics: descriptive process events only ────────────────────────────

describe("analytics", () => {
  it("reports the surprise as process, with no correctness or reward signal", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId("guided-surprise"));
    await user.click(screen.getByTestId("guided-surprise-reroll"));
    await user.click(screen.getByTestId("guided-surprise-accept"));

    const kinds = track.mock.calls.map((c) => c[0].kind);
    expect(kinds).toEqual([
      "guided_surprise_offered",
      "guided_surprise_rerolled",
      "guided_surprise_accepted",
    ]);
    for (const [event] of track.mock.calls) {
      expect(Object.keys(event).sort()).toEqual([
        "date_bucket",
        "kind",
        "module_slug",
        "pool_size",
        "reroll_count",
        "why_available",
      ]);
    }
  });

  it("reports an empty pool distinctly from a cancel", async () => {
    const user = userEvent.setup();
    renderPanel({ eligible: [] });
    await user.click(screen.getByTestId("guided-surprise"));
    await user.click(screen.getByTestId("guided-surprise-cancel"));
    expect(track.mock.calls.map((c) => c[0].kind)).toEqual([
      "guided_surprise_empty",
      "guided_surprise_cancelled",
    ]);
  });
});
