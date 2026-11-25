import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { GreatWorkStudio } from "../GreatWorkStudio";
import {
  createStudioShelf,
  type SavedMachine,
  type StudioShelf,
} from "../studioShelf";
import type { StudioDraft } from "@shared/greatwork-engine";

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage("en");
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function mount(shelf: StudioShelf, finish?: () => Promise<boolean>) {
  render(
    <I18nextProvider i18n={i18n}>
      <GreatWorkStudio shelf={shelf} onFinish={finish} />
    </I18nextProvider>,
  );
}
describe("studio save and completion retries", () => {
  it("reuses the generated copy name when a response is lost", async () => {
    const base = createStudioShelf({ mode: "guest" });
    const duplicate = vi
      .fn((row: SavedMachine, draft?: StudioDraft) =>
        base.duplicate(row, draft),
      )
      .mockRejectedValueOnce(new Error("lost response"));
    mount({ ...base, duplicate });
    fireEvent.click(screen.getByRole("button", { name: "Save machine" }));
    const copy = await screen.findByRole("button", { name: "Make a copy" });
    fireEvent.click(copy);
    await screen.findByRole("alert");
    fireEvent.click(copy);
    await waitFor(() => expect(duplicate).toHaveBeenCalledTimes(2));
    expect(duplicate.mock.calls[0][1]).toEqual(duplicate.mock.calls[1][1]);
    expect(await screen.findByText(/Saved a new copy as/)).toBeInTheDocument();
  });
  it("can retry a failed completion with the same durable revision", async () => {
    const base = createStudioShelf({ mode: "guest" });
    const complete = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    mount(base, complete);
    expect(
      screen.queryByRole("button", { name: "Finish activity" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save machine" }));
    const finish = await screen.findByRole("button", {
      name: "Finish activity",
    });
    fireEvent.click(finish);
    await screen.findByText(
      "Your machine is saved. Try Finish activity again.",
    );
    fireEvent.click(finish);
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(2));
    const [row] = await base.list();
    expect(complete).toHaveBeenNthCalledWith(2, {
      id: row.id,
      revision: row.revision,
    });
  });
});
