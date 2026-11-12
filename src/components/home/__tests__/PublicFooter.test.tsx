/**
 * The public chrome footer.
 *
 * Two defaults are the guard this file exists to hold, and they point opposite
 * ways on purpose:
 *
 *  - `giving` defaults OFF, so a caller that forgets it gets NO giving link —
 *    which is why `/for-families`, learner and activity surfaces cannot grow
 *    one by accident;
 *  - `feedback` defaults ON, because it is the only public route to
 *    `/feedback`, and a page that forgot it would strand that page.
 *
 * The one caller that turns `feedback` off is `/feedback` itself, under the
 * same self-link rule that keeps the giving link off `/donate`: a link to the
 * page you are on is a control that appears to go somewhere and does not, and
 * here it would also count a `feedback_clicked` for a visitor already there.
 */
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import PublicFooter from "../PublicFooter";
import { track } from "@/lib/analytics";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

const trackMock = vi.mocked(track);

function renderFooter(props: Parameters<typeof PublicFooter>[0] = {}) {
  return render(
    <MemoryRouter>
      <PublicFooter {...props} />
    </MemoryRouter>,
  );
}

describe("PublicFooter", () => {
  beforeEach(() => trackMock.mockClear());

  it("carries the relationship line and the exact link set", () => {
    renderFooter();
    const footer = screen.getByRole("contentinfo", { name: "Footer" });
    expect(
      within(footer).getByText(
        "Bright Boost is a program of Bright Bots Initiative.",
      ),
    ).toBeInTheDocument();

    expect(
      within(footer)
        .getAllByRole("link")
        .map((el) => [el.textContent, el.getAttribute("href")]),
    ).toEqual([
      ["For families", "/parents"],
      ["For teachers", "/for-teachers"],
      ["Evaluator guide", "/for-reviewers"],
      ["Pathways", "/pathways/about"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
      ["Give feedback", "/feedback"],
      ["Contact", "mailto:hello@brightbots.org"],
    ]);
  });

  it("is the only public route to /feedback, and renders it by default", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "Give feedback" })).toHaveAttribute(
      "href",
      "/feedback",
    );
  });

  it("omits the feedback link — and fires nothing — when asked not to render it", () => {
    const { rerender } = renderFooter({ feedback: false });

    const footer = screen.getByRole("contentinfo", { name: "Footer" });
    expect(
      within(footer).queryByRole("link", { name: "Give feedback" }),
    ).toBeNull();
    expect(footer.querySelector('a[href="/feedback"]')).toBeNull();
    expect(trackMock).not.toHaveBeenCalled();

    // A re-render is not a click: nothing is counted when the link is absent,
    // and nothing is counted for merely rendering it either.
    rerender(
      <MemoryRouter>
        <PublicFooter feedback={false} />
      </MemoryRouter>,
    );
    expect(trackMock).not.toHaveBeenCalled();

    // The rest of the link set is untouched by the prop.
    expect(
      within(footer)
        .getAllByRole("link")
        .map((el) => el.getAttribute("href")),
    ).toEqual([
      "/parents",
      "/for-teachers",
      "/for-reviewers",
      "/pathways/about",
      "/privacy",
      "/terms",
      "mailto:hello@brightbots.org",
    ]);
  });

  it("fires nothing merely for rendering the feedback link", () => {
    const { rerender } = renderFooter();
    rerender(
      <MemoryRouter>
        <PublicFooter />
      </MemoryRouter>,
    );
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("renders no giving link by default", () => {
    renderFooter();
    expect(
      screen.queryByRole("link", { name: "Support Bright Boost" }),
    ).toBeNull();
  });

  it("renders exactly one giving link when asked, firing donation_clicked", async () => {
    const user = userEvent.setup();
    renderFooter({ giving: true });

    const giving = screen.getAllByRole("link", {
      name: "Support Bright Boost",
    });
    expect(giving).toHaveLength(1);
    expect(giving[0]).toHaveAttribute("href", "/donate");

    await user.click(giving[0]);
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({ kind: "donation_clicked" });
  });

  it("fires feedback_clicked on the feedback link, carrying the count the old homepage link kept", async () => {
    const user = userEvent.setup();
    renderFooter();

    trackMock.mockClear();
    await user.click(screen.getByRole("link", { name: "Give feedback" }));
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({ kind: "feedback_clicked" });
  });

  it("fires nothing on any other wayfinding link", async () => {
    const user = userEvent.setup();
    renderFooter({ giving: true });

    trackMock.mockClear();
    for (const name of [
      "For families",
      "For teachers",
      "Evaluator guide",
      "Pathways",
      "Privacy",
      "Terms",
    ]) {
      await user.click(screen.getByRole("link", { name }));
    }
    expect(trackMock).not.toHaveBeenCalled();
  });
});
