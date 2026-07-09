import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useState } from "react";
import QuizSummary from "@/components/activities/quiz/QuizSummary";
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

describe("QuizSummary", () => {
  it("AC-4.1: shows title, score line, and perfect line only when score equals total", () => {
    const { rerender } = render(
      <QuizSummary
        score={2}
        total={3}
        submitting={false}
        onFinish={vi.fn()}
      />,
    );

    expect(screen.getByText("Quiz done! 🌟")).toBeInTheDocument();
    expect(screen.getByText("You got 2 of 3 right!")).toBeInTheDocument();
    expect(
      screen.queryByText("Perfect! Every single one!"),
    ).not.toBeInTheDocument();

    rerender(
      <QuizSummary
        score={3}
        total={3}
        submitting={false}
        onFinish={vi.fn()}
      />,
    );

    expect(screen.getByText("Perfect! Every single one!")).toBeInTheDocument();
  });

  it("AC-4.3: Finish disabled while submitting; re-enabled after rejected onFinish", async () => {
    let rejectFinish!: (reason: unknown) => void;

    function Wrapper() {
      const [submitting, setSubmitting] = useState(false);

      return (
        <QuizSummary
          score={2}
          total={3}
          submitting={submitting}
          onFinish={() => {
            setSubmitting(true);
            return new Promise<void>((_, reject) => {
              rejectFinish = reject;
            })
              .catch(() => undefined)
              .finally(() => {
                setSubmitting(false);
              });
          }}
        />
      );
    }

    render(<Wrapper />);

    const finish = screen.getByRole("button", { name: "Finish" });
    expect(finish).not.toBeDisabled();

    fireEvent.click(finish);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Finish" })).toBeDisabled();
    });

    rejectFinish(new Error("save failed"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Finish" })).not.toBeDisabled();
    });
  });

  it("AC-4.3: Finish disabled when submitting prop is true", () => {
    render(
      <QuizSummary
        score={2}
        total={3}
        submitting
        onFinish={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Finish" })).toBeDisabled();
  });
});
