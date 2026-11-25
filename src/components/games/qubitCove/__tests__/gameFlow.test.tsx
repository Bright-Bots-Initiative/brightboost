import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { enMock } from "@/test/i18nMock";
import QubitCoveGame from "../QubitCoveGame";

vi.mock("react-i18next", () => enMock());
vi.mock("../scene", () => ({
  createCoveRenderer: () => ({ draw: () => {} }),
}));

const button = (name: string | RegExp) => screen.getByRole("button", { name });
const click = (name: string | RegExp) => fireEvent.click(button(name));

it("keeps page scrolling available until the embedded game has keyboard focus", () => {
  const { rerender } = render(<QubitCoveGame storageScope="guest" embedded />);
  const field = screen.getByRole("img", {
    name: "Qubit Cove island playground",
  });
  const arrow = { code: "ArrowDown", key: "ArrowDown", cancelable: true };
  expect(fireEvent.keyDown(document.body, arrow)).toBe(true);
  field.focus();
  expect(fireEvent.keyDown(field, arrow)).toBe(false);
  expect(fireEvent.keyDown(field, { code: "Space", cancelable: true })).toBe(
    false,
  );
  field.blur();
  expect(fireEvent.keyDown(document.body, arrow)).toBe(true);
  rerender(<QubitCoveGame storageScope="student" />);
  expect(fireEvent.keyDown(document.body, arrow)).toBe(false);
});

function visit(name: string) {
  click("Island map");
  click(new RegExp(`Ride to ${name}`));
  click("Use beacon");
}

it("accepts repeated chance outcomes, requires all three discoveries and retries a failed save", async () => {
  const onReplay = vi.fn();
  const finish = vi
    .fn()
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  const random = vi.spyOn(Math, "random").mockReturnValue(0.2);
  try {
    render(
      <QubitCoveGame
        storageScope="explorer"
        onComplete={finish}
        onReplay={onReplay}
      />,
    );
    visit("Chance Harbor");
    for (let round = 0; round < 3; round++) {
      click(round ? "Prepare a fresh qubit" : "Prepare qubit");
      click("Measure");
    }
    const readings = within(screen.getByRole("dialog")).getAllByRole(
      "listitem",
    );
    expect(readings.map((item) => item.textContent)).toEqual(["0", "0", "0"]);
    click("Only 0");
    expect(screen.getByText(/Look at how you set up/)).toBeVisible();
    click("0 or 1");
    click("Back to the cove");
    expect(
      screen.queryByRole("button", { name: "Finish adventure" }),
    ).toBeNull();
    for (const [name, answer] of [
      ["One Peak", "Only 1"],
      ["Zero Garden", "Only 0"],
    ]) {
      visit(name);
      click("Prepare qubit");
      click("Measure");
      click(answer);
      click("Back to the cove");
    }
    expect(
      screen.getByRole("heading", { name: "The lighthouse is shining!" }),
    ).toBeVisible();
    expect(finish).not.toHaveBeenCalled();
    click("Finish adventure");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not be saved/,
    );
    click("Finish adventure");
    expect(
      await screen.findByRole("button", { name: /Adventure complete/i }),
    ).toBeDisabled();
    expect(finish).toHaveBeenCalledTimes(2);
    expect(finish.mock.calls[1][0]).toMatchObject({
      gameKey: "qubit_cove",
      score: 3,
      total: 3,
      roundsCompleted: 3,
    });
    expect(onReplay).not.toHaveBeenCalled();
    click("Play again");
    expect(onReplay).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "Finish adventure" }),
    ).toBeNull();
    visit("Chance Harbor");
    expect(button("Prepare qubit")).toBeVisible();
  } finally {
    random.mockRestore();
  }
});
