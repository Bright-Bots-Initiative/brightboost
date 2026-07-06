import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import LegacyListQuiz from "@/components/activities/quiz/LegacyListQuiz";
import type { LegacyListQuizProps } from "@/components/activities/quiz/types";
import {
  threeQuestionFixture,
  identityShuffleMap,
  reversedShuffleMap,
} from "@/test/quizFixtures";

const mockToast = vi.fn();

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

type RenderLegacyOptions = Partial<
  Pick<
    LegacyListQuizProps,
    | "questions"
    | "shuffleMap"
    | "isQuizOnly"
    | "onComplete"
    | "onBackToStory"
    | "onBackToModule"
  >
>;

function renderLegacyQuiz(options: RenderLegacyOptions = {}) {
  const onComplete = options.onComplete ?? vi.fn();
  const stateProbe = { submitted: false };

  function StatefulLegacyQuiz() {
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [submitted, setSubmitted] = useState(false);
    const [incorrectIds, setIncorrectIds] = useState<string[]>([]);
    stateProbe.submitted = submitted;

    return (
      <LegacyListQuiz
        title="Test Quiz"
        questions={options.questions ?? threeQuestionFixture}
        shuffleMap={options.shuffleMap ?? identityShuffleMap(threeQuestionFixture)}
        answers={answers}
        submitted={submitted}
        incorrectIds={incorrectIds}
        setAnswers={setAnswers}
        setSubmitted={setSubmitted}
        setIncorrectIds={setIncorrectIds}
        onComplete={onComplete}
        isQuizOnly={options.isQuizOnly ?? false}
        onBackToStory={options.onBackToStory ?? vi.fn()}
        onBackToModule={options.onBackToModule ?? vi.fn()}
      />
    );
  }

  const result = render(<StatefulLegacyQuiz />);
  return {
    ...result,
    onComplete,
    getSubmitted: () => stateProbe.submitted,
  };
}

function questionSection(promptText: string) {
  const prompt = screen.getByText(promptText);
  const section = prompt.closest(".space-y-2");
  expect(section).toBeTruthy();
  return section as HTMLElement;
}

function choiceButtonsForQuestion(promptText: string) {
  const group = questionSection(promptText).querySelector('[role="group"]');
  expect(group).toBeTruthy();
  return within(group as HTMLElement).getAllByRole("button");
}

function clickChoice(label: string) {
  fireEvent.click(screen.getByRole("button", { name: label }));
}

function answerAllCorrect() {
  clickChoice("Reach the charging station");
  clickChoice("A map");
  clickChoice("Blue");
}

function answerAllWrong() {
  clickChoice("Go to sleep");
  clickChoice("A hammer");
  clickChoice("Red");
}

describe("LegacyListQuiz", () => {
  // covered-by AC-5.3: legacy submit-all behavior preserved (G-002); ActivityPlayerA11y
  // assertion diff empty + full test:unit green (Part E E1-02).
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders questions from fixture", () => {
    renderLegacyQuiz();

    expect(screen.getByText("What is Boost trying to do?")).toBeInTheDocument();
    expect(screen.getByText("Which tool helps Boost plan?")).toBeInTheDocument();
    expect(screen.getByText("What color is Boost?")).toBeInTheDocument();
  });

  it("Submit disabled until all questions answered", () => {
    renderLegacyQuiz();

    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeDisabled();
  });

  it("Submit enabled when all questions answered", () => {
    renderLegacyQuiz();
    answerAllCorrect();

    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).not.toBeDisabled();
  });

  it("highlights selected choice with aria-pressed and default variant styling", () => {
    renderLegacyQuiz();
    clickChoice("Reach the charging station");

    const selected = screen.getByRole("button", {
      name: "Reach the charging station",
    });
    const unselected = screen.getByRole("button", { name: "Go to sleep" });

    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(selected.className).toContain("bg-primary");
    expect(unselected).toHaveAttribute("aria-pressed", "false");
    expect(unselected.className).toContain("border-input");
  });

  it("changes selection when a different choice is tapped", () => {
    renderLegacyQuiz();
    clickChoice("Go to sleep");
    clickChoice("Reach the charging station");

    expect(
      screen.getByRole("button", { name: "Reach the charging station" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Go to sleep" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("wrong submit shows tryAgain, red styling, hint, and toast", () => {
    renderLegacyQuiz();
    answerAllWrong();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getAllByText("(Try again!)").length).toBe(3);
    expect(
      screen.getByRole("button", { name: "Go to sleep" }).className,
    ).toContain("border-red-500");
    expect(screen.getByText(/Read the first slide again/)).toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith({
      title: "Almost!",
      description: "Check the hints and try again!",
    });
  });

  it("re-answer clears per-question error state", () => {
    renderLegacyQuiz();
    answerAllWrong();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    const q1Section = questionSection("What is Boost trying to do?");
    expect(within(q1Section).getByText("(Try again!)")).toBeInTheDocument();

    clickChoice("Reach the charging station");

    expect(within(q1Section).queryByText("(Try again!)")).not.toBeInTheDocument();
    expect(
      within(q1Section).queryByText(/Read the first slide again/),
    ).not.toBeInTheDocument();
  });

  it("all-correct submit calls onComplete once without entering submitted state", () => {
    const { onComplete, getSubmitted } = renderLegacyQuiz();
    answerAllCorrect();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(getSubmitted()).toBe(false);
    expect(screen.queryByText("(Try again!)")).not.toBeInTheDocument();
  });

  it("Reset clears answers, submitted state, incorrect markers, and hints", () => {
    const { getSubmitted } = renderLegacyQuiz();
    answerAllWrong();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(getSubmitted()).toBe(true);
    expect(screen.getAllByText("(Try again!)")).toHaveLength(3);
    expect(screen.getByText(/Read the first slide again/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(getSubmitted()).toBe(false);
    expect(screen.queryByText("(Try again!)")).not.toBeInTheDocument();
    expect(screen.queryByText(/Read the first slide again/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Think about navigation/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    for (const label of [
      "Reach the charging station",
      "Go to sleep",
      "Paint the wall",
      "A map",
      "A hammer",
      "A pillow",
      "Blue",
      "Red",
      "Green",
    ]) {
      expect(screen.getByRole("button", { name: label })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
  });

  // covered-by AC-3.2 (legacy path shuffle order)
  it("E-7: renders choices in reversed shuffleMap order", () => {
    renderLegacyQuiz({
      shuffleMap: reversedShuffleMap(threeQuestionFixture),
    });

    const q1Buttons = choiceButtonsForQuestion("What is Boost trying to do?");
    expect(q1Buttons.map((b) => b.textContent)).toEqual([
      "Paint the wall",
      "Go to sleep",
      "Reach the charging station",
    ]);
  });

  // covered-by AC-3.2 (legacy path identity fallback)
  it("E-7: missing shuffleMap entry falls back to identity order", () => {
    renderLegacyQuiz({ shuffleMap: {} });

    const q1Buttons = choiceButtonsForQuestion("What is Boost trying to do?");
    expect(q1Buttons.map((b) => b.textContent)).toEqual([
      "Reach the charging station",
      "Go to sleep",
      "Paint the wall",
    ]);
  });
});
