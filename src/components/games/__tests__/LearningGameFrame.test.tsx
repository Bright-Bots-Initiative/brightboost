import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LearningGameFrame } from "../shared/LearningGameFrame";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("LearningGameFrame", () => {
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
