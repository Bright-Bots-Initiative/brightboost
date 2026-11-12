/**
 * `/for-families` — the public family landing.
 *
 * The two things this page must not do are asserted directly: it must not
 * offer a K–2 self-signup, and it must not carry a giving link. The rest
 * mirrors `ForTeachers.test.tsx`: anonymous render, no network, exact
 * destinations in order, `source` handled as an exact literal and never
 * echoed or forwarded, analytics only where D5 maps an existing kind.
 */
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ForFamilies from "../ForFamilies";
import { track } from "@/lib/analytics";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

const trackMock = vi.mocked(track);

describe("ForFamilies (public /for-families route)", () => {
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
      <MemoryRouter initialEntries={[`/for-families${search}`]}>
        <ForFamilies />
      </MemoryRouter>,
    );
  }

  it("renders without an AuthProvider and without any fetch calls", () => {
    renderPage();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /two ways in, depending on where your child already is\./i,
      }),
    ).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("wires every action to its exact destination, in order", () => {
    renderPage();
    const main = screen.getByRole("main");
    const actions = within(main)
      .getAllByRole("link")
      .map((el) => [el.textContent, el.getAttribute("href")]);

    expect(actions).toEqual([
      ["Join with a class code", "/class-login"],
      ["Child sign-in", "/student-login"],
      ["Create a home group", "/teacher/signup?intent=home"],
      ["The family guide", "/parents"],
      ["Try a game — no signup", "/try"],
    ]);
  });

  it("shows the breadcrumb only for the exact literal ?source=nonprofit", () => {
    renderPage("?source=nonprofit");
    const main = screen.getByRole("main");
    expect(
      within(main).getByText("From Bright Bots Initiative"),
    ).toBeInTheDocument();
    expect(within(main).queryByText("For families")).toBeNull();
  });

  it.each([
    ["no parameter", ""],
    ["an empty value", "?source="],
    ["an injection attempt", "?source=evil<script>alert(1)</script>"],
    ["a near miss", "?source=NONPROFIT"],
  ])("treats %s as a direct entry and never echoes the value", (_name, qs) => {
    const { container } = renderPage(qs);
    const main = screen.getByRole("main");
    expect(within(main).getByText("For families")).toBeInTheDocument();
    expect(within(main).queryByText("From Bright Bots Initiative")).toBeNull();
    expect(container.innerHTML).not.toContain("evil");
    expect(container.innerHTML).not.toContain("alert(1)");
    expect(container.innerHTML).not.toContain("NONPROFIT");
  });

  it("keeps intent=home and forwards no incoming query value", () => {
    renderPage("?source=nonprofit&utm_campaign=spring");
    expect(
      screen.getByRole("link", { name: "Create a home group" }),
    ).toHaveAttribute("href", "/teacher/signup?intent=home");
    for (const link of screen.getAllByRole("link")) {
      const href = link.getAttribute("href") ?? "";
      expect(href).not.toContain("source");
      expect(href).not.toContain("utm_campaign");
    }
  });

  it("offers no K-2 self-signup and no second role chooser", () => {
    renderPage("?source=nonprofit");
    expect(
      screen.getByText(
        "Children in kindergarten through grade 2 cannot register themselves.",
      ),
    ).toBeInTheDocument();
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toBe("/student/signup");
    }
    const main = screen.getByRole("main");
    expect(
      within(main).queryByRole("link", { name: /for teachers/i }),
    ).toBeNull();
  });

  it("fires signup_clicked{student} on the child sign-in", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("link", { name: "Child sign-in" }));
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({
      kind: "signup_clicked",
      audience: "student",
    });
  });

  it("never double-counts parent_page_clicked — the homepage card owns it", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderPage();

    trackMock.mockClear();
    await user.click(screen.getByRole("link", { name: "The family guide" }));
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("fires nothing on the class-code, home-group and demo actions", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderPage();

    trackMock.mockClear();
    await user.click(
      screen.getByRole("link", { name: "Join with a class code" }),
    );
    await user.click(screen.getByRole("link", { name: "Create a home group" }));
    await user.click(
      screen.getByRole("link", { name: "Try a game — no signup" }),
    );
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("carries NO giving link", () => {
    renderPage();
    expect(
      screen.queryByRole("link", { name: /support bright boost/i }),
    ).toBeNull();
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toBe("/donate");
    }
  });

  it("has Sign in in the header and no Sign up anywhere", () => {
    renderPage();
    const nav = screen.getByRole("navigation", { name: "For families" });
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

  it("sets and restores the document title and <html lang>", () => {
    document.title = "previous title";
    document.documentElement.setAttribute("lang", "xx");
    const { unmount } = renderPage();

    expect(document.title).toBe("For Families — Bright Boost");
    expect(document.documentElement.getAttribute("lang")).toBe("en");

    unmount();
    expect(document.title).toBe("previous title");
    expect(document.documentElement.getAttribute("lang")).toBe("xx");
  });
});
