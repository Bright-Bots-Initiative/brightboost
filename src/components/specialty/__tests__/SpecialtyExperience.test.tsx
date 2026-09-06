import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect } from "vitest";
import { SpecialtyExperience } from "../SpecialtyExperience";
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
const ready = { unlocked: true, specialty: null, completed: 5, required: 5 };
describe("Specialty choice", () => {
  it("previews all three without saving, then confirms exactly one choice", async () => {
    const choose = vi.fn().mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <SpecialtyExperience data={ready} onChoose={choose} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("radio", { name: /pattern finder/i }));
    expect(screen.getByText("Your own discovery lab")).toBeInTheDocument();
    expect(choose).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("radio", { name: /possibility explorer/i }),
    );
    expect(screen.getByText("A world of possibilities")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Choose Quantum" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "does not yet support switching",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Yes, this is my specialty" }),
    );
    await waitFor(() =>
      expect(choose).toHaveBeenCalledExactlyOnceWith("QUANTUM"),
    );
  });
  it("keeps locked students in preview and reports a failed save truthfully", async () => {
    const choose = vi.fn().mockRejectedValue(new Error("offline"));
    const { rerender } = render(
      <MemoryRouter>
        <SpecialtyExperience
          data={{ ...ready, unlocked: false, completed: 2 }}
          onChoose={choose}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("button", { name: "Choose Biotech" }),
    ).toBeDisabled();
    rerender(
      <MemoryRouter>
        <SpecialtyExperience data={ready} onChoose={choose} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Choose Biotech" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Yes, this is my specialty" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "could not save",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
