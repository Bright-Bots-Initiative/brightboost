import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LearningGameFrame } from "../shared/LearningGameFrame";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

describe("LearningGameFrame", () => {
  it("shows a reduced-effects toggle with accessible description", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const user = userEvent.setup();

    render(
      <LearningGameFrame title="Game" objective="Obj">
        <div>Body</div>
      </LearningGameFrame>,
    );

    // Compact On/Off toggle beside a visible label; the explanation moved
    // to an sr-only aria-describedby so the control stays one line on mobile.
    const toggle = screen.getByRole("button", { name: /^off$/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAccessibleDescription(/reduces motion, particles, and visual intensity/i);
    await user.click(toggle);
    expect(screen.getByRole("button", { name: /^on$/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("announces progress and feedback with polite status regions", () => {
    render(
      <LearningGameFrame
        title="Rhymo's Rhyme Rocket"
        objective="Pick rhyming words."
        progressLabel="Round 1/5"
        feedback="Nice rhyme!"
      >
        <div>Body</div>
      </LearningGameFrame>,
    );

    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(2);
    expect(statuses[0]).toHaveAttribute("aria-live", "polite");
    expect(statuses[1]).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("region", { name: /rhymo's rhyme rocket game area/i })).toBeInTheDocument();
  });

  it("renders words to know when vocabulary is provided", () => {
    render(
      <LearningGameFrame title="Game" objective="Obj" vocabulary={["rhyme", "pattern"]}>
        <div>Body</div>
      </LearningGameFrame>,
    );

    // enMock resolves the key against en/common.json — "Words to know".
    expect(screen.getByText(/words to know/i)).toBeInTheDocument();
    expect(screen.getByText(/rhyme, pattern/i)).toBeInTheDocument();
  });

  it("renders control instructions and links game area to instructions", () => {
    render(
      <LearningGameFrame
        title="Game"
        objective="Obj"
        controlInstructions={{
          keyboard: ["Use Tab to move through controls."],
          buttons: ["Choose an answer button."],
        }}
      >
        <div>Body</div>
      </LearningGameFrame>,
    );

    expect(screen.getByRole("heading", { name: /how to play/i })).toBeInTheDocument();
    expect(screen.getByText(/use tab to move through controls/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /game game area/i })).toHaveAttribute("aria-describedby", "game-title-instructions");
  });
});
