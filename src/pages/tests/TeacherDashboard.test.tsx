/**
 * @vitest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import TeacherDashboard from "../TeacherDashboard";
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Test Teacher" },
    logout: vi.fn(),
  }),
}));
vi.mock("../../services/api", () => ({
  useApi: () => ({
    get: vi.fn().mockImplementation(() =>
      Promise.resolve({
        lessons: [
          {
            id: "1",
            title: "Introduction to Algebra",
            category: "Math",
            date: "2025-05-01",
            status: "Published",
          },
          {
            id: "2",
            title: "Advanced Geometry",
            category: "Math",
            date: "2025-05-10",
            status: "Draft",
          },
          {
            id: "3",
            title: "Chemistry Basics",
            category: "Science",
            date: "2025-05-15",
            status: "Review",
          },
        ],
      }),
    ),
  }),
}));
vi.mock("../../components/GameBackground", () => ({
  default: ({ children }) => (
    <div data-testid="game-background">{children}</div>
  ),
}));
vi.mock("../../components/BrightBoostRobot", () => ({
  default: () => <div data-testid="robot-icon">Robot</div>,
}));

vi.mock("../../components/TeacherDashboard/Sidebar", () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock("../../components/TeacherDashboard/MainContent", () => ({
  default: () => <div data-testid="main-content">MainContent</div>,
}));

describe("TeacherDashboard", () => {
  vi.setConfig({ testTimeout: 10000 });
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalConsoleError;
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.resetModules();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    if (typeof global.gc === "function") {
      global.gc();
    }
  });
  it("renders the dashboard components", () => {
    const { unmount } = render(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>,
    );
    expect(screen.getByTestId("game-background")).toBeDefined();
    expect(screen.getByTestId("sidebar")).toBeDefined();

    const loadingElement = screen.queryByText("Loading dashboard data...");
    const mainContentElement = screen.queryByTestId("main-content");

    expect(loadingElement !== null || mainContentElement !== null).toBe(true);
    unmount();
  });
});