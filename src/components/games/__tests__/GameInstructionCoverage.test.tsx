import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MazeMapsGame from "../MazeMapsGame";
import DataDashSortDiscoverGame from "../DataDashSortDiscoverGame";

vi.mock("react-i18next", () => ({
  // Stubs required because the component chain calls
  // `.use(initReactI18next)` somewhere; vitest needs every
  // referenced export present on the mock or the whole file
  // fails to load.
  initReactI18next: { type: "3rdParty" as const, init: () => {} },
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  Trans: ({ children }: { children: React.ReactNode }) => children,
  useTranslation: () => ({ t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key }),
}));

vi.mock("@/components/activities/ActivityHeader", () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/hooks/usePersonalBest", () => ({
  usePersonalBest: () => null,
}));

describe("Priority game control instructions", () => {
  it("shows Maze Maps keyboard/button guidance in briefing", () => {
    render(<MazeMapsGame onComplete={() => {}} />);

    expect(screen.getByText(/choose a move or wait action/i)).toBeInTheDocument();
    expect(screen.getByText(/watch the pattern before moving/i)).toBeInTheDocument();
  });

  it("shows Data Dash keyboard/button guidance in briefing", () => {
    render(<DataDashSortDiscoverGame onComplete={() => {}} />);

    expect(screen.getByText("Select a card, then choose a bin or answer.")).toBeInTheDocument();
    expect(screen.getByText(/use attributes as evidence/i)).toBeInTheDocument();
  });
});
