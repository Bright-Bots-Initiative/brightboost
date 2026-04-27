import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MazeMapsGame from "../MazeMapsGame";
import DataDashSortDiscoverGame from "../DataDashSortDiscoverGame";

vi.mock("react-i18next", () => ({
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
