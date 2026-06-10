import { render, screen } from "@testing-library/react";
import Stem1QuestCard from "../Stem1QuestCard";
import { describe, it, expect, vi } from "vitest";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

describe("Stem1QuestCard", () => {
  it("renders correctly with given props", () => {
    const quest = {
      title: "Test Quest",
      status: "In Progress" as const,
      dueDate: "2024-01-01",
    };

    render(<Stem1QuestCard quest={quest} showConnector={true} />);

    expect(screen.getByText("Test Quest")).toBeInTheDocument();
    // Card renders "<Status>: In Progress" — the localized "Status" label
    // comes from en/common.json (`stem1.status`). Match the full string.
    expect(screen.getByText("Status: In Progress")).toBeInTheDocument();
  });
});
