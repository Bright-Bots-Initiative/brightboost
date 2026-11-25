import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App";

vi.mock("react-i18next", async () =>
  (await import("@/test/i18nMock")).enMock(),
);

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  window.history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
});

describe("public registration", () => {
  it("takes an old student signup link directly to class-code sign-in", async () => {
    window.history.replaceState(null, "", "/student/signup");
    render(<App />);
    expect(await screen.findByPlaceholderText("ABC123")).toBeVisible();
    expect(window.location.pathname).toBe("/class-login");
    expect(document.querySelector('input[type="email"]')).toBeNull();
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it("offers adult signup and a student class-code login", async () => {
    window.history.replaceState(null, "", "/signup");
    render(<App />);
    const paths = (await screen.findAllByRole("link")).map((link) =>
      link.getAttribute("href"),
    );
    expect(paths).toEqual(
      expect.arrayContaining([
        "/teacher/signup",
        "/teacher/signup?intent=home",
        "/class-login",
      ]),
    );
    expect(paths).not.toContain("/student/signup");
  });
});
