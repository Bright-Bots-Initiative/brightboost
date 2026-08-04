/**
 * /parents/guide — public printable K-2 Facilitator Quick Start.
 * The Print button must be accessible and must NOT fire automatically.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ParentGuide from "../ParentGuide";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

describe("ParentGuide (public /parents/guide route)", () => {
  let printSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
  });

  afterEach(() => {
    printSpy.mockRestore();
  });

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={["/parents/guide"]}>
        <ParentGuide />
      </MemoryRouter>,
    );
  }

  it("renders the before / during / after structure with usable prompts", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /k–2 facilitator quick start/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /before you start/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /while they play/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /afterwards/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/what do you notice\?/i)).toBeInTheDocument();
    expect(
      screen.getByText(/what do you think will happen if/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/explore on their own/i)).toBeInTheDocument();
  });

  it("does not auto-open the print dialog, and prints on button click", () => {
    renderPage();
    expect(printSpy).not.toHaveBeenCalled();
    const button = screen.getByRole("button", { name: /print this guide/i });
    fireEvent.click(button);
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it("links back to the parents page", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /back/i })).toHaveAttribute(
      "href",
      "/parents",
    );
  });

  it("makes no read-aloud/audio claims (see issue #625)", () => {
    renderPage();
    expect(screen.queryByText(/read.?aloud/i)).toBeNull();
    expect(screen.queryByText(/audio/i)).toBeNull();
  });
});
