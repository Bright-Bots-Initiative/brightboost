import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ComponentProps } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import K2InstantFeedbackQuiz from "@/components/activities/quiz/K2InstantFeedbackQuiz";
import {
  threeQuestionFixture,
  identityShuffleMap,
  singleQuestionFixture,
  noHintFixture,
  malformedAnswerIndexFixture,
} from "@/test/quizFixtures";
import enCommon from "@/locales/en/common.json";
import esCommon from "@/locales/es/common.json";
import { track } from "@/lib/analytics";

const i18nState = { language: "en" };

vi.mock("@/i18n", () => ({
  default: {
    get language() {
      return i18nState.language;
    },
    get resolvedLanguage() {
      return i18nState.language;
    },
  },
}));

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

function lookup(
  root: Record<string, unknown>,
  path: string,
): unknown {
  const parts = path.split(".");
  let cur: unknown = root;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

function makeTranslate(locale: "en" | "es") {
  const root = locale === "en" ? enCommon : esCommon;
  return (key: string, opts?: Record<string, unknown>) => {
    const val = lookup(root as Record<string, unknown>, key);
    if (opts?.returnObjects && Array.isArray(val)) {
      return val;
    }
    if (typeof val === "string" && opts) {
      let s = val;
      for (const [k, v] of Object.entries(opts)) {
        if (k !== "returnObjects") {
          s = s.replace(`{{${k}}}`, String(v));
        }
      }
      return s;
    }
    return typeof val === "string" ? val : key;
  };
}

let currentLanguage = "en";
const changeLanguage = vi.fn((lang: string) => {
  currentLanguage = lang;
  i18nState.language = lang;
  return Promise.resolve();
});

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  const base = enMock();
  return {
    ...base,
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, unknown>) =>
        makeTranslate(currentLanguage as "en" | "es")(key, opts),
      i18n: {
        get language() {
          return currentLanguage;
        },
        changeLanguage,
        on: () => {},
        off: () => {},
      },
    }),
  };
});

const defaultTrackContext = {
  moduleSlug: "test-module",
  activityId: "a-1",
  gradeBand: "k2" as const,
};

function renderQuiz(
  overrides: Partial<ComponentProps<typeof K2InstantFeedbackQuiz>> = {},
) {
  const onComplete = vi.fn().mockResolvedValue(true);
  const props = {
    title: "Test Quiz",
    questions: threeQuestionFixture,
    shuffleMap: identityShuffleMap(threeQuestionFixture),
    onComplete,
    trackContext: defaultTrackContext,
    pickIndex: () => 0,
    ...overrides,
  };
  const result = render(<K2InstantFeedbackQuiz {...props} />);
  return { ...result, onComplete, props };
}

function clickChoiceByText(text: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(text) }));
}

function clickNext() {
  fireEvent.click(screen.getByRole("button", { name: /^(Next|See how I did!)$/ }));
}

async function completeThreeQuestionJourney(onComplete = vi.fn().mockResolvedValue(true)) {
  renderQuiz({ onComplete });

  clickChoiceByText("Go to sleep");
  await waitFor(() => {
    expect(screen.getByTestId("feedback-panel")).toBeInTheDocument();
  });
  clickNext();

  clickChoiceByText("A map");
  await waitFor(() => {
    expect(screen.getByText("You got it! 🎉")).toBeInTheDocument();
  });
  clickNext();

  clickChoiceByText("Blue");
  await waitFor(() => {
    expect(screen.getByTestId("feedback-panel")).toBeInTheDocument();
  });
  clickNext();

  await waitFor(() => {
    expect(screen.getByTestId("quiz-summary")).toBeInTheDocument();
  });
}

describe("K2InstantFeedbackQuiz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLanguage = "en";
    i18nState.language = "en";
  });

  // covered-by AC-2.5, AC-6.2 (resolveText/resolveChoiceList render journey copy)
  it("D1-01: full journey — wrong Q1, correct Q2+Q3, summary shows 2 of 3", async () => {
    renderQuiz();

    expect(screen.getByTestId("instant-quiz")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();

    clickChoiceByText("Go to sleep");

    await waitFor(() => {
      expect(screen.getByTestId("feedback-panel")).toBeInTheDocument();
    });

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Good try!");
    expect(status).toHaveTextContent("The answer is:");
    expect(status).toHaveTextContent("Reach the charging station");
    expect(screen.getByText(/Read the first slide again/)).toBeInTheDocument();

    clickNext();

    expect(
      screen.getByText("Which tool helps Boost plan?"),
    ).toBeInTheDocument();

    clickChoiceByText("A map");

    await waitFor(() => {
      expect(screen.getByText("You got it! 🎉")).toBeInTheDocument();
    });
    expect(screen.queryByText(/💡/)).not.toBeInTheDocument();

    clickNext();

    clickChoiceByText("Blue");

    await waitFor(() => {
      expect(screen.getByTestId("feedback-panel")).toBeInTheDocument();
    });
    clickNext();

    await waitFor(() => {
      expect(screen.getByTestId("quiz-summary")).toBeInTheDocument();
      expect(screen.getByText("You got 2 of 3 right!")).toBeInTheDocument();
    });
  });

  // covered-by AC-1.1, AC-1.3
  it("D1-03: feedback phase highlights correct and wrong choices; all choices disabled", async () => {
    const { container } = renderQuiz();

    clickChoiceByText("Go to sleep");

    await waitFor(() => {
      expect(screen.getByTestId("feedback-panel")).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button").filter((b) =>
      b.textContent?.match(/Reach the charging station|Go to sleep|Paint the wall/),
    );

    for (const button of buttons) {
      expect(button).toBeDisabled();
    }

    const correctButton = buttons.find((b) =>
      b.textContent?.includes("Reach the charging station"),
    );
    const wrongButton = buttons.find((b) =>
      b.textContent?.includes("Go to sleep"),
    );

    expect(correctButton?.className).toMatch(/border-emerald-500/);
    expect(correctButton?.textContent).toContain("Reach the charging station");
    expect(wrongButton?.className).toMatch(/border-slate-300/);
    expect(container.innerHTML).not.toMatch(/bg-red-/);
  });

  it("D2-01: G-201 cheer stays stable across parent rerender", async () => {
    const { rerender, props } = renderQuiz();

    clickChoiceByText("Go to sleep");

    await waitFor(() => {
      expect(screen.getByText("Good try!")).toBeInTheDocument();
    });

    rerender(<K2InstantFeedbackQuiz {...props} title="Rerendered Title" />);

    expect(screen.getByText("Good try!")).toBeInTheDocument();
    expect(screen.queryByText("Nice thinking!")).not.toBeInTheDocument();
  });

  it("D2-03: fires exactly one quiz_question_answered per answer; E-3 double-tap is a no-op", async () => {
    renderQuiz();

    const choiceButton = screen.getByRole("button", { name: /Go to sleep/ });
    fireEvent.click(choiceButton);
    fireEvent.click(choiceButton);

    await waitFor(() => {
      expect(track).toHaveBeenCalledTimes(1);
    });

    expect(track).toHaveBeenCalledWith({
      kind: "quiz_question_answered",
      module_slug: "test-module",
      activity_id: "a-1",
      grade_band: "k2",
      question_id: "q1",
      question_index: 0,
      correct: false,
      quiz_variant: "instant",
    });

    clickNext();
    clickChoiceByText("A map");

    await waitFor(() => {
      expect(track).toHaveBeenCalledTimes(2);
    });
  });

  it("D2-05: I-6 / AC-4.3 onComplete called once with score; Finish re-enabled on rejection", async () => {
    const onComplete = vi.fn().mockResolvedValue(false);
    await completeThreeQuestionJourney(onComplete);

    const finish = screen.getByRole("button", { name: "Finish" });
    fireEvent.click(finish);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(2);
    });

    await waitFor(() => {
      expect(finish).not.toBeDisabled();
    });

    fireEvent.click(finish);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(2);
    });
  });

  // covered-by AC-6.2, E-9
  it("D2-07: E-9 language swap mid-quiz re-resolves strings without resetting state", async () => {
    const { rerender, props } = renderQuiz();

    clickChoiceByText("Go to sleep");
    await waitFor(() => {
      expect(screen.getByTestId("feedback-panel")).toBeInTheDocument();
    });
    clickNext();

    await changeLanguage("es");
    rerender(<K2InstantFeedbackQuiz {...props} />);

    await waitFor(() => {
      expect(screen.getByText("Pregunta 2 de 3")).toBeInTheDocument();
    });
    expect(
      screen.getByText("¿Qué herramienta ayuda a Boost a planificar?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Un mapa")).toBeInTheDocument();
  });

  it("E-2: single-question quiz shows seeResults on feedback then summary on Next", async () => {
    renderQuiz({
      questions: singleQuestionFixture,
      shuffleMap: identityShuffleMap(singleQuestionFixture),
    });

    expect(screen.getByText("Question 1 of 1")).toBeInTheDocument();

    clickChoiceByText("Go to sleep");

    await waitFor(() => {
      expect(screen.getByTestId("feedback-panel")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "See how I did!" }),
    ).toBeInTheDocument();

    clickNext();

    await waitFor(() => {
      expect(screen.getByTestId("quiz-summary")).toBeInTheDocument();
      expect(screen.getByText("You got 0 of 1 right!")).toBeInTheDocument();
    });
  });

  it("E-8: no-hint question shows feedback without explanation paragraph", async () => {
    renderQuiz({
      questions: noHintFixture,
      shuffleMap: identityShuffleMap(noHintFixture),
    });

    clickChoiceByText("B");

    await waitFor(() => {
      expect(screen.getByTestId("feedback-panel")).toBeInTheDocument();
    });

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Good try!");
    expect(status).toHaveTextContent("The answer is:");
    expect(screen.queryByText(/💡/)).not.toBeInTheDocument();

    for (const button of screen.getAllByRole("button")) {
      if (button.textContent?.match(/^A$|^B$/)) {
        expect(button).toBeDisabled();
      }
    }
  });

  it("E-12: malformed answerIndex grades incorrect, skips green highlight, never crashes", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    renderQuiz({
      questions: malformedAnswerIndexFixture,
      shuffleMap: identityShuffleMap(malformedAnswerIndexFixture),
    });

    clickChoiceByText("Only choice");

    await waitFor(() => {
      expect(screen.getByTestId("feedback-panel")).toBeInTheDocument();
    });

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Good try!");
    expect(status).not.toHaveTextContent("You got it!");

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("malformed-q1"),
    );

    const choiceButtons = screen
      .getAllByRole("button")
      .filter((b) => b.textContent?.includes("Only choice"));
    expect(choiceButtons[0]?.className).not.toMatch(/border-emerald-500/);

    warnSpy.mockRestore();
  });

  it("AC-1.2: feedback cheer announced via aria-live polite status region", async () => {
    renderQuiz();

    clickChoiceByText("Go to sleep");

    await waitFor(() => {
      expect(screen.getByTestId("feedback-panel")).toBeInTheDocument();
    });

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Good try!");
  });

  it("AC-1.4: Next button auto-focused after wrong answer in container", async () => {
    renderQuiz();

    clickChoiceByText("Go to sleep");

    await waitFor(() => {
      expect(screen.getByTestId("feedback-panel")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /^(Next|See how I did!)$/ }),
    ).toHaveFocus();
  });

  it("G-201: correct answer uses correctCheers pool via pickIndex", async () => {
    renderQuiz({
      questions: singleQuestionFixture,
      shuffleMap: identityShuffleMap(singleQuestionFixture),
      pickIndex: () => 0,
    });

    clickChoiceByText("Reach the charging station");

    await waitFor(() => {
      expect(screen.getByText("You got it! 🎉")).toBeInTheDocument();
    });
    expect(screen.queryByText("Good try!")).not.toBeInTheDocument();
    expect(screen.queryByText(/💡/)).not.toBeInTheDocument();
  });

  it("E-11: unmount discards in-progress state", async () => {
    const { unmount } = renderQuiz();

    clickChoiceByText("Go to sleep");

    await waitFor(() => {
      expect(screen.getByTestId("feedback-panel")).toBeInTheDocument();
    });

    unmount();

    renderQuiz();

    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();
    expect(screen.queryByTestId("feedback-panel")).not.toBeInTheDocument();
  });

  it("E-1: questions.length === 0 renders nothing", () => {
    const { container } = renderQuiz({ questions: [] });

    expect(container.firstChild).toBeNull();
  });

  it("I-6: successful Finish disables button and calls onComplete once", async () => {
    const onComplete = vi.fn().mockResolvedValue(true);
    await completeThreeQuestionJourney(onComplete);

    const finish = screen.getByRole("button", { name: "Finish" });
    fireEvent.click(finish);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(2);
    });

    expect(finish).toBeDisabled();
  });
});
