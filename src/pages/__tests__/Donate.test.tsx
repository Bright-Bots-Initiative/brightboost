/**
 * `/donate` — the standalone support page.
 *
 * The failure this page is built to avoid is a control that looks like it
 * works: a dead `href="#"`, a cadence nothing can honour, or an amount chip
 * that carries nothing anywhere. So the two states are asserted as a pair —
 * a real external link when the URL is configured and usable, and an honest
 * sentence when it is not — and the removed controls are asserted absent in
 * both.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Donate, { resolveDonationUrl } from "../Donate";
import { track } from "@/lib/analytics";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

const trackMock = vi.mocked(track);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/donate"]}>
      <Donate />
    </MemoryRouter>,
  );
}

function expectNoDeadControls() {
  for (const link of screen.getAllByRole("link")) {
    expect(link.getAttribute("href")).not.toBe("#");
  }
  expect(screen.queryByRole("link", { name: /give monthly/i })).toBeNull();
  expect(screen.queryByRole("button", { name: /\$\d+/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /other/i })).toBeNull();
}

describe("resolveDonationUrl", () => {
  it.each([
    ["https://example.org/give", "https://example.org/give"],
    ["  https://example.org/give  ", "https://example.org/give"],
    ["http://example.org/give", "http://example.org/give"],
  ])("accepts the http(s) value %s", (raw, expected) => {
    expect(resolveDonationUrl(raw)).toBe(expected);
  });

  it.each([
    ["undefined", undefined],
    ["an empty string", ""],
    ["whitespace", "   "],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a data: URL", "data:text/html,<h1>hi</h1>"],
    ["a bare path", "/give"],
    ["garbage", "not a url at all"],
    ["a non-string", 42],
  ])("rejects %s", (_name, raw) => {
    expect(resolveDonationUrl(raw)).toBeNull();
  });
});

describe("Donate (public /donate route)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let originalTitle: string;

  beforeEach(() => {
    trackMock.mockClear();
    fetchSpy = vi.spyOn(globalThis, "fetch");
    originalTitle = document.title;
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.unstubAllEnvs();
    document.title = originalTitle;
  });

  it("offers one external link when a usable URL is configured", async () => {
    vi.stubEnv("VITE_DONATION_URL", "https://example.org/give");
    const user = userEvent.setup();
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Support Bright Boost" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Donating is optional and never required to use Bright Boost.",
      ),
    ).toBeInTheDocument();

    const donate = screen.getByRole("link", { name: "Donate" });
    expect(donate).toHaveAttribute("href", "https://example.org/give");
    expect(donate).toHaveAttribute("target", "_blank");
    expect(donate).toHaveAttribute("rel", "noreferrer");
    expectNoDeadControls();

    await user.click(donate);
    expect(trackMock).toHaveBeenCalledTimes(1);
    // A click is an intent to look at a giving page, not a donation, and no
    // cadence is claimed.
    expect(trackMock).toHaveBeenCalledWith({ kind: "donation_clicked" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["no configuration", ""],
    ["a javascript: URL", "javascript:alert(1)"],
    ["garbage", "not a url at all"],
  ])("renders the honest unavailable state for %s", (_name, value) => {
    vi.stubEnv("VITE_DONATION_URL", value);
    renderPage();

    expect(
      screen.getByText("A donation link is not available yet."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Donate" })).toBeNull();
    expectNoDeadControls();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never renders a giving link back to itself in the footer", () => {
    vi.stubEnv("VITE_DONATION_URL", "https://example.org/give");
    renderPage();
    expect(
      screen.queryByRole("link", { name: "Support Bright Boost" }),
    ).toBeNull();
  });

  it("carries the footer feedback link, firing feedback_clicked once", async () => {
    vi.stubEnv("VITE_DONATION_URL", "");
    const user = userEvent.setup();
    renderPage();

    const feedback = screen.getByRole("link", { name: "Give feedback" });
    expect(feedback).toHaveAttribute("href", "/feedback");

    trackMock.mockClear();
    await user.click(feedback);
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({ kind: "feedback_clicked" });
  });

  it("sets the document title and restores it on unmount", () => {
    vi.stubEnv("VITE_DONATION_URL", "");
    document.title = "previous title";
    const { unmount } = renderPage();
    expect(document.title).toBe("Support Bright Boost — Bright Boost");
    unmount();
    expect(document.title).toBe("previous title");
  });
});
