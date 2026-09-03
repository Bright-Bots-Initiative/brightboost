import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import ModuleDetail from "../ModuleDetail";
import { api } from "@/services/api";
import { __resetGradeBandCache } from "@/hooks/useGradeBand";

// Removed/archived modules (HIDDEN_MODULE_SLUGS) were filtered from the module
// list but still reachable by direct URL — that's how a 3-5 student (jordan)
// landed on the removed `k2-stem-sequencing` / lost-steps activity. This pins
// the route-level guard that now blocks them.
//
// #856 changed *how* it blocks: a silent redirect became a supported
// "unavailable" state (reason as text, no focus steal, a visible focusable
// route back — docs/safe-exploration-accessibility.md §1/§7). The guard itself
// still fires before any content request goes out.

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

// getModule kept pending so a non-hidden slug stays on the loading state
// (and therefore visibly is NOT refused).
vi.mock("@/services/api", () => ({
  api: {
    getModule: vi.fn(() => new Promise(() => {})),
    getProgress: vi.fn(() => Promise.resolve({ progress: [] })),
    getAvatar: vi.fn(() => Promise.resolve({})),
    getStudentCourses: vi.fn(() => Promise.resolve([])),
  },
}));

function renderAt(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/student/modules/${slug}`]}>
      <Routes>
        <Route path="/student/modules/:slug" element={<ModuleDetail />} />
        <Route path="/student/modules" element={<div>MODULES LIST</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ModuleDetail — hidden-module route guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetGradeBandCache();
  });

  it("refuses a removed/hidden module (k2-stem-sequencing) with an unavailable state", async () => {
    renderAt("k2-stem-sequencing");

    expect(await screen.findByTestId("module-unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This one is not here right now. Pick a new game from your modules!",
      ),
    ).toBeInTheDocument();
    // The route back is present and focusable.
    expect(
      screen.getByRole("button", { name: "Go to My Modules" }),
    ).toBeInTheDocument();
    // Refused before any content request goes out.
    expect(api.getModule).not.toHaveBeenCalled();
  });

  it("does not refuse a normal module", () => {
    renderAt("k2-stem-bounce-buds");
    expect(screen.queryByTestId("module-unavailable")).toBeNull();
    expect(screen.queryByText("MODULES LIST")).toBeNull();
  });
});
