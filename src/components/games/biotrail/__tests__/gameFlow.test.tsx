import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BioTrailGame from "../BioTrailGame";
import en from "@/locales/en/common.json";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options: Record<string, unknown> = {}) => {
      let value: unknown = en;
      for (const k of key.split("."))
        value = (value as Record<string, unknown>)?.[k];
      return String(value ?? key).replace(/\{\{(\w+)\}\}/g, (_, k) =>
        String(options[k] ?? k),
      );
    },
  }),
}));
beforeEach(() => localStorage.clear());
describe("BioTrail creative journey", () => {
  it("completes an untimed branch, keeps a named build, and retries a failed platform save", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    render(<BioTrailGame storageScope="student-a" onComplete={complete} />);
    expect(
      screen.getByRole("button", { name: /The Field Lab/ }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Sprout Meadow/ }));
    fireEvent.change(screen.getByLabelText("Give your suit a name"), {
      target: { value: "Leaf jumper" },
    });
    fireEvent.click(screen.getByLabelText(/Untimed explorer mode/));
    function explore() {
      fireEvent.click(screen.getByRole("button", { name: "Test my design" }));
      fireEvent.click(screen.getByRole("button", { name: "Next observation" }));
      fireEvent.click(screen.getByRole("button", { name: "Next observation" }));
      fireEvent.click(
        screen.getByRole("button", { name: "Keep this discovery" }),
      );
    }
    explore();
    fireEvent.click(
      screen.getByRole("button", { name: "Choose my next island" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Canopy Crossing/ }));
    fireEvent.click(screen.getByRole("button", { name: /Gliding wings/ }));
    explore();
    fireEvent.click(
      screen.getByRole("button", { name: "Choose my next island" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /The Field Lab/ }));
    explore();
    fireEvent.click(screen.getByRole("button", { name: "My creation card" }));
    expect(
      screen.getByRole("heading", { name: "Leaf jumper" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Finish my expedition" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByLabelText("I changed my design to fit the habitat."),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Finish my expedition" }),
    );
    await screen.findByRole("alert");
    expect(
      screen.getByRole("button", { name: "Finish my expedition" }),
    ).toBeEnabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Finish my expedition" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Expedition saved" }),
      ).toBeDisabled(),
    );
    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete.mock.calls[0][0]).toMatchObject({
      gameKey: "biotrail",
      score: 1,
      total: 1,
      roundsCompleted: 3,
    });
    expect(
      JSON.parse(localStorage.getItem("brightboost:biotrail:v1:student-a")!),
    ).toMatchObject({
      name: "Leaf jumper",
      completed: ["meadow", "canopy", "lab"],
      reflection: "changed",
    });
    expect(
      localStorage.getItem("brightboost:biotrail:v1:student-b"),
    ).toBeNull();
  });
});
