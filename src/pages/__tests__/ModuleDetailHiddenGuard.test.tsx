import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import ModuleDetail from "../ModuleDetail";

// Removed/archived modules (HIDDEN_MODULE_SLUGS) were filtered from the module
// list but still reachable by direct URL — that's how a 3-5 student (jordan)
// landed on the removed `k2-stem-sequencing` / lost-steps activity. This pins
// the route-level guard that now blocks them.

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

// getModule kept pending so a non-hidden slug stays on the loading state
// (and therefore visibly does NOT redirect).
vi.mock("@/services/api", () => ({
  api: {
    getModule: vi.fn(() => new Promise(() => {})),
    getProgress: vi.fn(() => Promise.resolve({ progress: [] })),
    getAvatar: vi.fn(() => Promise.resolve({})),
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
  it("redirects a removed/hidden module (k2-stem-sequencing) to the module list", async () => {
    renderAt("k2-stem-sequencing");
    expect(await screen.findByText("MODULES LIST")).toBeInTheDocument();
  });

  it("does not redirect a normal module", () => {
    renderAt("k2-stem-bounce-buds");
    expect(screen.queryByText("MODULES LIST")).toBeNull();
  });
});
