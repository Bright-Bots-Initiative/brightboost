import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ControlInstructions } from "../shared/ControlInstructions";

describe("ControlInstructions", () => {
  it("renders heading and keyboard/touch/button lists", () => {
    render(
      <ControlInstructions
        id="controls"
        instructions={{
          keyboard: ["Use Tab to move."],
          touch: ["Tap cards to choose."],
          buttons: ["Press Start to begin."],
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "How to play" })).toBeInTheDocument();
    expect(screen.getByText("Use Tab to move.")).toBeInTheDocument();
    expect(screen.getByText("Tap cards to choose.")).toBeInTheDocument();
    expect(screen.getByText("Press Start to begin.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "How to play" })).toHaveAttribute("tabindex", "0");
  });
});
