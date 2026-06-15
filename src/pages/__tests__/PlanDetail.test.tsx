import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import PlanDetail from "../PlanDetail";

const track = vi.fn();
vi.mock("@/lib/analytics", () => ({ track: (e: unknown) => track(e) }));
vi.mock("../../components/GameBackground", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("../../components/LanguageToggle", () => ({ default: () => null }));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/plans/:plan" element={<PlanDetail />} />
        <Route path="/" element={<div>HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => track.mockClear());

describe("PlanDetail", () => {
  it("renders the Classroom plan and fires plan_page_viewed", () => {
    renderAt("/plans/classroom");
    expect(screen.getByText("Bright Boost for Classrooms")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith({
      kind: "plan_page_viewed",
      plan: "classroom",
    });
    expect(screen.getByText(/Create your class/).closest("a")).toHaveAttribute(
      "href",
      "/teacher/signup",
    );
  });

  it("routes the Learner primary CTA to /try and fires plan_cta_clicked", () => {
    renderAt("/plans/learner");
    const primary = screen.getByText(/Play a game now/).closest("a")!;
    expect(primary).toHaveAttribute("href", "/try");
    fireEvent.click(primary);
    expect(track).toHaveBeenCalledWith({
      kind: "plan_cta_clicked",
      plan: "learner",
      cta: "try",
    });
  });

  it("maps each plan to its OWN page + CTA (no copy-paste)", () => {
    renderAt("/plans/organization");
    expect(
      screen.getByText("Bright Boost for Organizations"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Contact us/).closest("a")).toHaveAttribute(
      "href",
      "/feedback",
    );
  });

  it("redirects an unknown plan slug to home (no dead page, no event)", () => {
    renderAt("/plans/bogus");
    expect(screen.getByText("HOME")).toBeInTheDocument();
    expect(track).not.toHaveBeenCalled();
  });
});
