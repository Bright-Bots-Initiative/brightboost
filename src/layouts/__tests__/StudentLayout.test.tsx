import { render, screen } from "@testing-library/react";
import StudentLayout from "../StudentLayout";
import { BrowserRouter } from "react-router-dom";
import { vi } from "vitest";

const gradeBandMock = vi.hoisted(() => ({
  value: "k2" as "k2" | "g3_5",
}));

// Mock dependencies
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/hooks/useGradeBand", () => ({
  useGradeBand: () => gradeBandMock.value,
}));

// Resolve i18n keys against en/common.json — assertions match real
// English text the components render.
vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

vi.mock("../../components/BottomNav", () => ({
  default: () => <div data-testid="bottom-nav">BottomNav</div>,
}));

describe("StudentLayout Accessibility", () => {
  test("logout button has accessible label", () => {
    render(
      <BrowserRouter>
        <StudentLayout>
          <div>Content</div>
        </StudentLayout>
      </BrowserRouter>,
    );

    const logoutButton = screen.getByRole("button", { name: /log out/i });
    expect(logoutButton).toBeInTheDocument();
  });

  test("contains skip to content link", () => {
    render(
      <BrowserRouter>
        <StudentLayout>
          <div>Content</div>
        </StudentLayout>
      </BrowserRouter>,
    );

    const skipLink = screen.getByText("Skip to content");
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  test("shows the K-2 grade-band badge", () => {
    gradeBandMock.value = "k2";

    render(
      <BrowserRouter>
        <StudentLayout>
          <div>Content</div>
        </StudentLayout>
      </BrowserRouter>,
    );

    expect(screen.getByText("K-2")).toBeInTheDocument();
  });

  test("shows the Grades 3-5 grade-band badge", () => {
    gradeBandMock.value = "g3_5";

    render(
      <BrowserRouter>
        <StudentLayout>
          <div>Content</div>
        </StudentLayout>
      </BrowserRouter>,
    );

    expect(screen.getByText("Grades 3-5")).toBeInTheDocument();
  });
});
