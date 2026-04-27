import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LearningGameFrame } from "../shared/LearningGameFrame";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

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

    const toggle = screen.getByRole("button", { name: /reduced effects: off/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/reduces motion, particles, and visual intensity for smoother play/i)).toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
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
    expect(screen.getByRole("region", { name: /rhymo's rhyme rocket/i })).toBeInTheDocument();
  });

  it("renders words to know when vocabulary is provided", () => {
    render(
      <LearningGameFrame title="Game" objective="Obj" vocabulary={["rhyme", "pattern"]}>
        <div>Body</div>
      </LearningGameFrame>,
    );

    expect(screen.getByText(/games\.learning\.wordsToKnow/i)).toBeInTheDocument();
    expect(screen.getByText(/rhyme, pattern/i)).toBeInTheDocument();
  });
});
