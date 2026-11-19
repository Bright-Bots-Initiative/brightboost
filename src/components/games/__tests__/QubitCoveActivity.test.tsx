import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import QubitCoveActivity from "../QubitCoveActivity";
import type { GameResult } from "../shared/GameShell";

const state = vi.hoisted(() => ({
  user: { id: "learner" } as { id: string } | null,
  status: "loading",
  data: { unlocked: true, specialty: "QUANTUM" },
  refresh: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: state.user }),
}));
vi.mock("@/contexts/SpecialtyContext", () => ({ useSpecialty: () => state }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("../qubitCove/QubitCoveGame", () => ({
  default: ({
    storageScope,
    onComplete,
  }: {
    storageScope: string;
    onComplete: (result: GameResult) => void;
  }) => (
    <button
      onClick={() =>
        onComplete({
          gameKey: "qubit_cove",
          total: 3,
          score: 3,
          streakMax: 0,
          roundsCompleted: 3,
        })
      }
    >
      {storageScope}
    </button>
  ),
}));

it("checks the earned specialty, scopes the game to the student and forwards completion", async () => {
  const onComplete = vi.fn();
  const activity = () => (
    <MemoryRouter>
      <QubitCoveActivity onComplete={onComplete} />
    </MemoryRouter>
  );
  const { rerender } = render(activity());
  expect(screen.getByRole("status")).toHaveTextContent("specialty.loading");
  state.status = "error";
  rerender(activity());
  fireEvent.click(screen.getByRole("button"));
  expect(state.refresh).toHaveBeenCalledOnce();

  state.status = "ready";
  for (const data of [
    { unlocked: true, specialty: "AI" },
    { unlocked: true, specialty: "BIOTECH" },
    { unlocked: false, specialty: "QUANTUM" },
  ]) {
    state.data = data;
    rerender(activity());
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/student/specialty",
    );
  }
  state.data = { unlocked: true, specialty: "QUANTUM" };
  state.user = null;
  rerender(activity());
  expect(screen.getByRole("link")).toBeInTheDocument();
  state.user = { id: "learner" };
  rerender(activity());
  fireEvent.click(await screen.findByRole("button", { name: "learner" }));
  expect(onComplete).toHaveBeenCalledExactlyOnceWith({
    gameKey: "qubit_cove",
    score: 3,
    total: 3,
    streakMax: 0,
    roundsCompleted: 3,
  });
});
