import { render, screen } from "@testing-library/react";
import Stem1QuestCard from "../Stem1QuestCard";
import { describe, it, expect } from "vitest";

// Mock i18next
import React from 'react';
import { useTranslation } from 'react-i18next';

// Correctly mock the module
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("Stem1QuestCard", () => {
  it("renders correctly with given props", () => {
    const quest = {
      title: "Test Quest",
      status: "In Progress" as const,
      dueDate: "2024-01-01",
    };

    render(<Stem1QuestCard quest={quest} showConnector={true} />);

    expect(screen.getByText("Test Quest")).toBeInTheDocument();
    expect(screen.getByText("stem1.status: In Progress")).toBeInTheDocument();
  });
});
