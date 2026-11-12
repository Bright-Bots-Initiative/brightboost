import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SparBotsActivity from "../../SparBotsActivity";
const state = vi.hoisted(() => ({
  user: { id: "learner" } as { id: string } | null,
  status: "ready",
  data: { unlocked: true, specialty: "AI" },
  refresh: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: state.user }),
}));
vi.mock("@/contexts/SpecialtyContext", () => ({ useSpecialty: () => state }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("../SparBotsGame", () => ({
  default: ({
    storageScope,
    config,
  }: {
    storageScope: string;
    config?: { gradeBand?: string };
  }) => (
    <p>
      {storageScope}:{config?.gradeBand}
    </p>
  ),
}));
describe("SparBots activity access", () => {
  it("waits for server state, denies other specialties and passes the signed-in scope and band", async () => {
    const tree = (
      <MemoryRouter>
        <SparBotsActivity config={{ gradeBand: "k2" }} />
      </MemoryRouter>
    );
    state.status = "loading";
    const { rerender } = render(tree);
    expect(screen.getByRole("status")).toHaveTextContent("specialty.loading");
    for (const data of [
      { unlocked: false, specialty: "AI" },
      { unlocked: true, specialty: "BIOTECH" },
      { unlocked: true, specialty: "QUANTUM" },
    ]) {
      state.status = "ready";
      state.data = data;
      rerender(
        <MemoryRouter>
          <SparBotsActivity />
        </MemoryRouter>,
      );
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/student/specialty",
      );
      expect(screen.queryByText("learner:k2")).not.toBeInTheDocument();
    }
    state.data = { unlocked: true, specialty: "AI" };
    state.user = null;
    rerender(tree);
    expect(screen.getByRole("link")).toBeInTheDocument();
    state.user = { id: "learner" };
    rerender(
      <MemoryRouter>
        <SparBotsActivity config={{ gradeBand: "k2" }} />
      </MemoryRouter>,
    );
    expect(await screen.findByText("learner:k2")).toBeInTheDocument();
  });
});
