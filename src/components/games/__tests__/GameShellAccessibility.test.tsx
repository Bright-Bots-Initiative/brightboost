import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GameShell from "../shared/GameShell";

// The shared `enMock` resolves real English copy but ignores interpolation;
// the game region's name is built from `{{title}}`, so fill option values.
vi.mock("react-i18next", async () => {
  const { enMock, enTranslate } = await import("@/test/i18nMock");
  const base = enMock();
  const t = (key: string, values?: Record<string, unknown>) => {
    let out = enTranslate(key);
    if (values) {
      for (const [name, value] of Object.entries(values)) {
        out = out.split(`{{${name}}}`).join(String(value));
      }
    }
    return out;
  };
  return {
    ...base,
    useTranslation: () => ({ ...base.useTranslation(), t }),
  };
});

vi.mock("@/components/activities/ActivityHeader", () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/hooks/usePersonalBest", () => ({
  usePersonalBest: () => null,
}));

describe("GameShell accessibility", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  it("renders control instructions on briefing and focuses start/results headings", async () => {
    const user = userEvent.setup();

    render(
      <GameShell
        gameKey="access-test"
        title="Access Test"
        onComplete={() => {}}
        briefing={{
          title: "Mission",
          story: "Story",
          icon: "🎮",
          controlInstructions: {
            keyboard: ["Use Tab and Enter."],
            buttons: ["Choose an action."],
          },
        }}
      >
        {({ onFinish }) => (
          <button
            type="button"
            onClick={() =>
              onFinish({
                gameKey: "access-test",
                score: 1,
                total: 1,
                streakMax: 1,
                roundsCompleted: 1,
              })
            }
          >
            finish
          </button>
        )}
      </GameShell>,
    );

    // enMock resolves the key against en/common.json — "Start Mission".
    const startButton = screen.getByRole("button", { name: /start mission/i });
    expect(startButton).toHaveFocus();
    expect(screen.getByText("Use Tab and Enter.")).toBeInTheDocument();

    await user.click(startButton);
    expect(
      screen.getByRole("region", { name: /access test game area/i }),
    ).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "finish" }));
    expect(screen.getByRole("heading", { name: /amazing/i })).toHaveFocus();
  });
});
