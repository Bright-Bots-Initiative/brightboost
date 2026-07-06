import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuestionScreen from "@/components/activities/quiz/QuestionScreen";
import {
  threeQuestionFixture,
  i18nKeyFixture,
} from "@/test/quizFixtures";
import { enTranslate } from "@/test/i18nMock";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  const base = enMock();
  return {
    ...base,
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, unknown>) => {
        let s = enTranslate(key);
        if (opts) {
          for (const [k, v] of Object.entries(opts)) {
            s = s.replace(`{{${k}}}`, String(v));
          }
        }
        return s;
      },
      i18n: {
        language: "en",
        changeLanguage: () => Promise.resolve(),
        on: () => {},
        off: () => {},
      },
    }),
  };
});

describe("QuestionScreen", () => {
  const question = threeQuestionFixture[0];
  const onAnswer = vi.fn();

  const defaultProps = {
    question,
    currentIndex: 0,
    total: 3,
    shuffleMap: { q1: [2, 0, 1] },
    phase: "answering" as const,
    onAnswer,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC-3.1: renders questionOf progress, prompt id, and labelled choice group", () => {
    render(<QuestionScreen {...defaultProps} />);

    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("What is Boost trying to do?")).toHaveAttribute(
      "id",
      "question-prompt-q1",
    );

    const group = screen.getByRole("group", {
      name: "What is Boost trying to do?",
    });
    expect(group).toHaveAttribute("aria-labelledby", "question-prompt-q1");
  });

  // covered-by AC-3.2
  it("E-7: choices render in shuffleMap order with identity fallback when entry missing", () => {
    const { rerender } = render(<QuestionScreen {...defaultProps} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("Paint the wall");
    expect(buttons[1]).toHaveTextContent("Reach the charging station");
    expect(buttons[2]).toHaveTextContent("Go to sleep");

    rerender(
      <QuestionScreen
        {...defaultProps}
        shuffleMap={{}}
      />,
    );

    const identityButtons = screen.getAllByRole("button");
    expect(identityButtons[0]).toHaveTextContent("Reach the charging station");
    expect(identityButtons[1]).toHaveTextContent("Go to sleep");
    expect(identityButtons[2]).toHaveTextContent("Paint the wall");
  });

  // covered-by AC-6.2
  it("E-10: i18nKeyFixture resolves via i18n mock", () => {
    render(
      <QuestionScreen
        {...defaultProps}
        question={i18nKeyFixture[0]}
        shuffleMap={{ "rhymo-q1": [0, 1, 2] }}
        currentIndex={0}
        total={1}
      />,
    );

    expect(
      screen.getByText(enTranslate("games.rhymo.q1.prompt")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(enTranslate("games.rhymo.q1.c1")),
    ).toBeInTheDocument();
  });

  it("I-3: onAnswer receives original index from shuffleMap display order", () => {
    render(<QuestionScreen {...defaultProps} />);

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(2);
  });

  // covered-by AC-1.3
  it("I-3: choices disabled when phase is feedback", () => {
    render(
      <QuestionScreen
        {...defaultProps}
        phase="feedback"
        selectedChoiceIndex={2}
        lastResult="incorrect"
      />,
    );

    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });

  it("AC-3.3: feedback-phase choices have no aria-pressed attribute", () => {
    render(
      <QuestionScreen
        {...defaultProps}
        phase="feedback"
        selectedChoiceIndex={2}
        lastResult="incorrect"
      />,
    );

    for (const button of screen.getAllByRole("button")) {
      expect(button).not.toHaveAttribute("aria-pressed");
    }
  });

  // covered-by AC-1.1, AC-2.1
  it("§15.2/§15.3: feedback phase highlights choices; icons aria-hidden; no bg-red-", () => {
    const { container } = render(
      <QuestionScreen
        {...defaultProps}
        phase="feedback"
        selectedChoiceIndex={2}
        lastResult="incorrect"
      />,
    );

    const buttons = screen.getAllByRole("button");
    const correctButton = buttons.find((b) =>
      b.textContent?.includes("Reach the charging station"),
    );
    const wrongButton = buttons.find((b) =>
      b.textContent?.includes("Paint the wall"),
    );

    expect(correctButton?.className).toMatch(/border-emerald-500/);
    expect(correctButton?.className).toMatch(/bg-emerald-50/);
    expect(correctButton?.className).toMatch(/text-emerald-700/);
    expect(wrongButton?.className).toMatch(/border-slate-300/);
    expect(wrongButton?.className).toMatch(/bg-slate-50/);
    expect(wrongButton?.className).toMatch(/text-slate-500/);
    expect(wrongButton?.className).toMatch(/opacity-80/);
    expect(correctButton?.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(wrongButton?.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(container.innerHTML).not.toMatch(/bg-red-/);
  });
});
