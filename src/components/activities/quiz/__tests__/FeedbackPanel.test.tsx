import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import FeedbackPanel from "@/components/activities/quiz/FeedbackPanel";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

const defaultProps = {
  cheer: "You got it! 🎉",
  correctAnswerText: "Reach the charging station",
  isLastQuestion: false,
  onNext: vi.fn(),
};

describe("FeedbackPanel", () => {
  it("AC-1.2: correct variant cheer inside role=status aria-live=polite; no explanation", () => {
    const { container } = render(
      <FeedbackPanel {...defaultProps} result="correct" />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("You got it! 🎉");
    expect(screen.queryByText(/💡/)).not.toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/bg-red-/);
  });

  it("AC-2.2–2.4: incorrect variant shows encouragement, answer line, and explanation when provided", () => {
    render(
      <FeedbackPanel
        {...defaultProps}
        result="incorrect"
        cheer="Good try!"
        explanation="Read the first slide again."
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Good try!");
    expect(status).toHaveTextContent("The answer is:");
    expect(status).toHaveTextContent("Reach the charging station");
    expect(screen.getByText(/Read the first slide again/)).toBeInTheDocument();
  });

  it("E-8: incorrect variant omits explanation paragraph when absent", () => {
    render(
      <FeedbackPanel
        {...defaultProps}
        result="incorrect"
        cheer="Good try!"
      />,
    );

    expect(screen.getByText("The answer is:")).toBeInTheDocument();
    expect(screen.queryByText(/💡/)).not.toBeInTheDocument();
  });

  it("AC-1.4: Next button has min-h-[44px], auto-focused on mount, label is Next", () => {
    render(<FeedbackPanel {...defaultProps} result="correct" />);

    const next = screen.getByRole("button", { name: "Next" });
    expect(next.className).toMatch(/min-h-\[44px\]/);
    expect(next).toHaveFocus();
  });

  it("§5.4.4: Next label switches to seeResults when isLastQuestion", () => {
    render(
      <FeedbackPanel
        {...defaultProps}
        result="correct"
        isLastQuestion
      />,
    );

    expect(
      screen.getByRole("button", { name: "See how I did!" }),
    ).toBeInTheDocument();
  });

  it("§15.3: correct variant icons are aria-hidden", () => {
    const { container } = render(
      <FeedbackPanel {...defaultProps} result="correct" />,
    );

    const icons = container.querySelectorAll('[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThanOrEqual(1);
  });

  it("§15.3: incorrect variant Lightbulb icon is aria-hidden", () => {
    const { container } = render(
      <FeedbackPanel
        {...defaultProps}
        result="incorrect"
        cheer="Good try!"
        explanation="A hint."
      />,
    );

    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  // covered-by AC-2.1
  it("G-103: never uses bg-red- punitive styling", () => {
    const { container } = render(
      <FeedbackPanel
        {...defaultProps}
        result="incorrect"
        cheer="Good try!"
        explanation="A hint."
      />,
    );

    expect(container.innerHTML).not.toMatch(/bg-red-/);
  });
});
