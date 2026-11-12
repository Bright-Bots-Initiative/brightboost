/**
 * `/feedback` — the moved feedback form.
 *
 * Two properties carry the whole point of the move and are asserted directly:
 *
 *  1. the visitor is told the form is browser-local BEFORE they type, not
 *     after they press Send;
 *  2. the message and the e-mail address never leave the component — not in
 *     the analytics payload, not over the network, not into storage.
 */
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import FeedbackPage from "../FeedbackPage";
import { track } from "@/lib/analytics";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

const trackMock = vi.mocked(track);

const SECRET_MESSAGE = "zzsecretmessagezz";
const SECRET_EMAIL = "zzsecret@example.test";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/feedback"]}>
      <FeedbackPage />
    </MemoryRouter>,
  );
}

describe("FeedbackPage (public /feedback route)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let originalTitle: string;

  beforeEach(() => {
    trackMock.mockClear();
    sessionStorage.clear();
    localStorage.removeItem("bb-feedback");
    fetchSpy = vi.spyOn(globalThis, "fetch");
    originalTitle = document.title;
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    sessionStorage.clear();
    document.title = originalTitle;
  });

  it("states that the form is browser-local BEFORE anything is submitted", () => {
    renderPage();
    expect(
      screen.getByText(
        "This form is stored only in this browser session. It does not send a message to Bright Bots Initiative.",
      ),
    ).toBeInTheDocument();
    // The confirmation is not shown until there is something to confirm.
    expect(screen.queryByText(/captured in this browser session/i)).toBeNull();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("keeps the four audiences and fires nothing on view or tab change", async () => {
    const user = userEvent.setup();
    renderPage();

    const tabs = screen.getByRole("tablist", {
      name: "Feedback audience type",
    });
    expect(
      within(tabs)
        .getAllByRole("tab")
        .map((el) => el.textContent),
    ).toEqual(["Teacher", "Student", "Parent", "Org"]);

    await user.click(within(tabs).getByRole("tab", { name: "Parent" }));
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("fires feedback_submitted{audience} exactly once, with no message or email", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: "Org" }));
    await user.type(
      screen.getByRole("textbox", { name: "Share your ideas" }),
      SECRET_MESSAGE,
    );
    await user.type(
      screen.getByRole("textbox", { name: "Email (optional)" }),
      SECRET_EMAIL,
    );
    await user.click(screen.getByRole("button", { name: "Send Feedback" }));

    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({
      kind: "feedback_submitted",
      audience: "org",
    });

    // The payload is an enum, not content — assert the content is nowhere in
    // any call, in case a property is ever added.
    const serialised = JSON.stringify(trackMock.mock.calls);
    expect(serialised).not.toContain(SECRET_MESSAGE);
    expect(serialised).not.toContain(SECRET_EMAIL);

    // No delivery endpoint, and nothing persisted outside React state.
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(sessionStorage)).not.toContain(SECRET_MESSAGE);
    expect(JSON.stringify(localStorage)).not.toContain(SECRET_MESSAGE);
  });

  it("confirms in the same truthful terms after submission", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Send Feedback" }));
    expect(
      screen.getByText(
        "Thank you! Your feedback was captured in this browser session. Backend persistence still needs to be connected.",
      ),
    ).toBeInTheDocument();
  });

  it("carries no giving link", () => {
    renderPage();
    expect(
      screen.queryByRole("link", { name: "Support Bright Boost" }),
    ).toBeNull();
  });

  /**
   * Review note N2: the footer used to render "Give feedback" here too, so the
   * page offered a link to itself and a click on it counted a
   * `feedback_clicked` for a visitor who had already arrived. The self-link
   * rule `/donate` follows now applies here as well.
   */
  it("carries no footer link back to itself, and counts nothing for rendering", () => {
    const { rerender } = renderPage();

    const footer = screen.getByRole("contentinfo", { name: "Footer" });
    expect(
      within(footer).queryByRole("link", { name: "Give feedback" }),
    ).toBeNull();
    expect(document.querySelectorAll('a[href="/feedback"]')).toHaveLength(0);
    expect(trackMock).not.toHaveBeenCalled();

    rerender(
      <MemoryRouter initialEntries={["/feedback"]}>
        <FeedbackPage />
      </MemoryRouter>,
    );
    expect(document.querySelectorAll('a[href="/feedback"]')).toHaveLength(0);
    expect(trackMock).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sets the document title and restores it on unmount", () => {
    document.title = "previous title";
    const { unmount } = renderPage();
    expect(document.title).toBe("Feedback — Bright Boost");
    unmount();
    expect(document.title).toBe("previous title");
  });
});
