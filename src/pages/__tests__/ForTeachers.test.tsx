/**
 * `/for-teachers` — the public teacher landing.
 *
 * What is actually asserted here, rather than proxies for it:
 *  - it renders for a fully anonymous visitor with no AuthProvider and no
 *    network activity at all;
 *  - the three actions are the exact destinations, in the exact order the
 *    approved layout puts them;
 *  - `?source=nonprofit` is an exact literal match: any other value — an
 *    injection attempt, an empty value, no parameter — behaves as a direct
 *    entry, and the raw value never appears anywhere in the DOM;
 *  - the page never asks the role a second time;
 *  - analytics fire on the one action D5 maps to an existing kind, and on
 *    nothing else;
 *  - the giving link is present here (and `ForFamilies.test.tsx` proves it is
 *    absent there).
 */
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ForTeachers from "../ForTeachers";
import { track } from "@/lib/analytics";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

const trackMock = vi.mocked(track);

describe("ForTeachers (public /for-teachers route)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let originalLang: string | null;
  let originalTitle: string;

  beforeEach(() => {
    trackMock.mockClear();
    fetchSpy = vi.spyOn(globalThis, "fetch");
    originalLang = document.documentElement.getAttribute("lang");
    originalTitle = document.title;
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    if (originalLang === null) document.documentElement.removeAttribute("lang");
    else document.documentElement.setAttribute("lang", originalLang);
    document.title = originalTitle;
  });

  function renderPage(search = "") {
    return render(
      <MemoryRouter initialEntries={[`/for-teachers${search}`]}>
        <ForTeachers />
      </MemoryRouter>,
    );
  }

  it("renders without an AuthProvider and without any fetch calls", () => {
    renderPage();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /set up a class, then watch what they build\./i,
      }),
    ).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("wires the three actions to their exact destinations, in order", () => {
    renderPage();
    const main = screen.getByRole("main");
    const actions = within(main)
      .getAllByRole("link")
      .map((el) => [el.textContent, el.getAttribute("href")]);

    expect(actions).toEqual([
      ["Create a teacher account", "/teacher/signup"],
      ["Try the demo", "/try"],
      ["Sign in as a teacher", "/teacher-login"],
    ]);
  });

  it("shows the breadcrumb only for the exact literal ?source=nonprofit", () => {
    renderPage("?source=nonprofit");
    const main = screen.getByRole("main");
    expect(
      within(main).getByText("From Bright Bots Initiative"),
    ).toBeInTheDocument();
    // The direct-entry eyebrow is gone (the footer's own "For teachers" link
    // is outside <main>, which is why this is scoped).
    expect(within(main).queryByText("For teachers")).toBeNull();
  });

  it.each([
    ["no parameter", ""],
    ["an empty value", "?source="],
    ["an injection attempt", "?source=evil<script>alert(1)</script>"],
    ["a near miss", "?source=Nonprofit"],
    ["a prefixed value", "?source=nonprofits"],
  ])("treats %s as a direct entry and never echoes the value", (_name, qs) => {
    const { container } = renderPage(qs);
    const main = screen.getByRole("main");
    expect(within(main).getByText("For teachers")).toBeInTheDocument();
    expect(within(main).queryByText("From Bright Bots Initiative")).toBeNull();
    // The raw value never reaches the DOM — not as text, not in an href.
    expect(container.innerHTML).not.toContain("evil");
    expect(container.innerHTML).not.toContain("alert(1)");
    expect(container.innerHTML).not.toContain("Nonprofit");
    expect(container.innerHTML).not.toContain("nonprofits");
    // ...and it is never forwarded onto a destination.
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toContain("source");
    }
  });

  it("never asks the role a second time", () => {
    renderPage("?source=nonprofit");
    expect(screen.queryByText(/i'?m a teacher/i)).toBeNull();
    expect(screen.queryByText(/i'?m a student/i)).toBeNull();
    // No link out to the other role landing from the page body.
    const main = screen.getByRole("main");
    expect(
      within(main).queryByRole("link", { name: /for families/i }),
    ).toBeNull();
  });

  it("describes the dashboard as the teacher's, not as this page", () => {
    renderPage();
    const steps = within(screen.getByRole("main"))
      .getByRole("list")
      .querySelectorAll("li");
    expect(Array.from(steps).map((li) => li.textContent)).toEqual([
      "Create your first class",
      "Share the join code with students",
      "Launch a weekly session",
      "View student progress on your teacher dashboard.",
    ]);
    // The shared dashboard string says "on this dashboard", which is false on
    // a public page where no dashboard is present.
    expect(screen.queryByText(/on this dashboard/i)).toBeNull();
  });

  it("fires signup_clicked{teacher} on the account action and nothing else", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole("link", { name: "Create a teacher account" }),
    );
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({
      kind: "signup_clicked",
      audience: "teacher",
    });

    trackMock.mockClear();
    await user.click(screen.getByRole("link", { name: "Try the demo" }));
    await user.click(
      screen.getByRole("link", { name: "Sign in as a teacher" }),
    );
    await user.click(screen.getByRole("link", { name: "Sign in" }));
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("carries the giving link, firing donation_clicked on the link click", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderPage();

    const giving = screen.getByRole("link", { name: "Support Bright Boost" });
    expect(giving).toHaveAttribute("href", "/donate");

    trackMock.mockClear();
    await user.click(giving);
    expect(trackMock).toHaveBeenCalledWith({ kind: "donation_clicked" });
  });

  it("has Sign in in the header and no Sign up anywhere", () => {
    renderPage();
    const nav = screen.getByRole("navigation", { name: "For teachers" });
    expect(within(nav).getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/student-login",
    );
    expect(screen.queryByRole("link", { name: /sign up/i })).toBeNull();
  });

  it("carries the footer feedback link, firing feedback_clicked once", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderPage();

    const feedback = screen.getByRole("link", { name: "Give feedback" });
    expect(feedback).toHaveAttribute("href", "/feedback");

    trackMock.mockClear();
    await user.click(feedback);
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({ kind: "feedback_clicked" });
  });

  it("sets the document title and description, and restores them on unmount", () => {
    document.title = "previous title";
    const { unmount } = renderPage();

    expect(document.title).toBe("For Teachers — Bright Boost");
    expect(
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
    ).toMatch(/free for classrooms/i);

    unmount();
    expect(document.title).toBe("previous title");
  });

  it("sets <html lang> to the rendered language and restores it on unmount", () => {
    document.documentElement.setAttribute("lang", "xx");
    const { unmount } = renderPage();
    expect(document.documentElement.getAttribute("lang")).toBe("en");
    unmount();
    expect(document.documentElement.getAttribute("lang")).toBe("xx");
  });
});
